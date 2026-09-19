import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { auditRepository } from './src/server/repositories/auditRepository';
import { contactRepository } from './src/server/repositories/contactRepository';
import { validateAuditPayload, validateContactPayload } from './src/server/validators/leadValidators';
import { leadSubmissionRateLimiter } from './src/server/middleware/rateLimiter';
import { antiSpamMiddleware } from './src/server/middleware/antiSpam';
import { notifyNewLead } from './src/server/services/notification';
import {
  sendAuditNotification,
  sendContactNotification,
  sendOperationalAlertNotification
} from './src/server/services/email';
import { verifyAdminBearerToken } from './src/server/auth/adminAuth';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // 1. Request payload size limit (max 100kb to avoid denial-of-service or arbitrary payloads)
  app.use(express.json({ limit: '100kb' }));

  // Handle JSON parsing or payload-too-large errors safely
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (err && (err.type === 'entity.too.large' || err.status === 413)) {
      return res.status(413).json({
        success: false,
        code: 'PAYLOAD_TOO_LARGE',
        error: 'Payload size exceeds 100kb limit.'
      });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        error: 'Malformed JSON payload.'
      });
    }
    next(err);
  });

  // 2. Service liveness endpoint.
  // Public intake currently persists through the Firebase Web SDK, so this
  // endpoint intentionally does not perform an Admin SDK Firestore write.
  app.get('/api/health', (req: Request, res: Response) => {
    const emailConfigured = Boolean(
      process.env.EMAIL_PROVIDER?.trim() &&
      process.env.EMAIL_SERVICE_API_KEY?.trim() &&
      process.env.NOTIFICATION_EMAIL_FROM?.trim() &&
      process.env.NOTIFICATION_EMAIL_TO?.trim()
    );

    return res.status(200).json({
      status: 'ok',
      service: 'G-KAIS AI Business Systems API',
      persistence: 'firebase-web-sdk',
      firestoreAdminRequiredForPublicIntake: false,
      emailNotifications: emailConfigured ? 'configured' : 'not_configured',
      timestamp: new Date().toISOString()
    });
  });

  // 3. POST /api/audit - Commercial audit intake pipeline
  app.post(
    '/api/audit',
    leadSubmissionRateLimiter,
    antiSpamMiddleware,
    async (req: Request, res: Response) => {
      let stage: 'validation' | 'persistence' | 'notification' | 'notification_status' | 'response' = 'validation';
      try {
        // Strict server-side payload validation
        const validation = validateAuditPayload(req.body);
        if (!validation.isValid || !validation.sanitizedData) {
          return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            error: validation.errors[0] || 'Invalid submission data.',
            errors: validation.errors
          });
        }

        const clientIp = typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : req.ip;

        // Persist directly to Firestore collection 'audit_submissions'
        stage = 'persistence';
        const record = await auditRepository.create({
          ...validation.sanitizedData,
          ipAddress: clientIp
        });

        console.info(`[FIRESTORE AUDIT SAVED] ID: ${record.id} | Company: ${record.company} | Channel: ${record.contactChannel}`);

        // Webhook notification dispatch
        stage = 'notification';
        const notification = await notifyNewLead({ type: 'audit', data: record });

        stage = 'notification_status';
        await auditRepository.updateNotificationStatus(record, notification.status);

        // Email architecture dispatch (non-blocking)
        sendAuditNotification(record).catch((emailErr) => {
          console.error(`[EMAIL BACKGROUND ERROR] Audit ${record.id}:`, emailErr);
        });

        stage = 'response';
        return res.status(200).json({
          success: true,
          code: 'SUCCESS',
          submissionId: record.id,
          message: 'G-KAIS reviews your current lead flow and follows up with next steps.',
          timestamp: record.createdAt
        });
      } catch (err: any) {
        console.error(`[AUDIT INTERNAL ERROR] stage=${stage}`, err);
        try { require('fs').writeFileSync('/tmp/server_error.log', (err?.stack || err?.message || String(err))); } catch {}

        const isProduction = process.env.NODE_ENV === 'production';
        const safeDiagnostic = err instanceof Error && err.message
          ? err.message
          : 'Unknown server error';

        return res.status(500).json({
          success: false,
          code: 'SERVER_ERROR',
          stage,
          error: isProduction
            ? 'Something went wrong. Please try again.'
            : `Audit request failed during ${stage}: ${safeDiagnostic}`
        });
      }
    }
  );

  // 4. POST /api/contact - Commercial engineering contact pipeline
  app.post(
    '/api/contact',
    leadSubmissionRateLimiter,
    antiSpamMiddleware,
    async (req: Request, res: Response) => {
      try {
        // Strict server-side payload validation
        const validation = validateContactPayload(req.body);
        if (!validation.isValid || !validation.sanitizedData) {
          return res.status(400).json({
            success: false,
            code: 'VALIDATION_ERROR',
            error: validation.errors[0] || 'Invalid submission data.',
            errors: validation.errors
          });
        }

        const clientIp = typeof req.headers['x-forwarded-for'] === 'string'
          ? req.headers['x-forwarded-for'].split(',')[0].trim()
          : req.ip;

        // Persist directly to Firestore collection 'contact_submissions'
        const record = await contactRepository.create({
          ...validation.sanitizedData,
          ipAddress: clientIp
        });

        console.info(`[FIRESTORE CONTACT SAVED] ID: ${record.id} | From: ${record.name} (${record.email})`);

        // Webhook notification dispatch
        const notification = await notifyNewLead({ type: 'contact', data: record });
        await contactRepository.updateNotificationStatus(record, notification.status);

        // Email architecture dispatch (non-blocking)
        sendContactNotification(record).catch((emailErr) => {
          console.error(`[EMAIL BACKGROUND ERROR] Contact ${record.id}:`, emailErr);
        });

        return res.status(200).json({
          success: true,
          code: 'SUCCESS',
          submissionId: record.id,
          message: 'Inquiry received. G-KAIS reviews your request and follows up with next steps.',
          timestamp: record.createdAt
        });
      } catch (err: any) {
        console.error('[CONTACT INTERNAL ERROR]', err);
        return res.status(500).json({
          success: false,
          code: 'SERVER_ERROR',
          error: 'Something went wrong. Please try again.'
        });
      }
    }
  );

  // 5. Authenticated admin-only email channel test.
  // This does not read or write Firestore and never exposes provider credentials.
  app.post('/api/admin/email/test', async (req: Request, res: Response) => {
    try {
      const identity = await verifyAdminBearerToken(req.headers.authorization);

      if (!identity) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Authenticated administrator access is required.'
        });
      }

      const result = await sendOperationalAlertNotification({
        id: `email-test-${Date.now()}`,
        leadName: identity.name || 'G-KAIS Admin',
        company: 'G-KAIS',
        email: identity.email,
        nextAction: 'Email notification channel test',
        followUpAt: new Date().toISOString(),
        level: 'info',
        kind: 'new_lead'
      });

      if (result.status === 'SKIPPED') {
        return res.status(200).json({
          success: true,
          code: 'EMAIL_NOT_CONFIGURED',
          status: result.status,
          message: 'Email provider configuration is incomplete. No email was sent.'
        });
      }

      if (!result.success || result.status === 'FAILED') {
        return res.status(502).json({
          success: false,
          code: 'EMAIL_PROVIDER_ERROR',
          status: result.status,
          error: result.error || 'Email provider rejected the test message.'
        });
      }

      return res.status(200).json({
        success: true,
        code: 'EMAIL_SENT',
        status: result.status,
        provider: result.provider,
        messageId: result.messageId,
        message: 'Test email sent successfully.'
      });
    } catch (err: any) {
      console.error('[ADMIN EMAIL TEST ERROR]', err);

      const configurationError =
        err instanceof Error && err.message === 'ADMIN_FIREBASE_UID is not configured.';

      return res.status(configurationError ? 503 : 401).json({
        success: false,
        code: configurationError ? 'ADMIN_NOT_CONFIGURED' : 'AUTH_ERROR',
        error: configurationError
          ? 'Admin backend identity is not configured.'
          : 'Could not verify administrator identity.'
      });
    }
  });

  // 6. Authenticated admin-only operational lead email.
  app.post('/api/admin/email/lead-alert', async (req: Request, res: Response) => {
    try {
      const identity = await verifyAdminBearerToken(req.headers.authorization);

      if (!identity) {
        return res.status(401).json({
          success: false,
          code: 'UNAUTHORIZED',
          error: 'Authenticated administrator access is required.'
        });
      }

      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const kind = body.kind;
      const level = body.level;

      const allowedKinds = ['overdue_follow_up', 'follow_up_today', 'new_lead'];
      const allowedLevels = ['critical', 'warning', 'info'];

      if (
        typeof body.id !== 'string' ||
        !body.id.trim() ||
        typeof body.leadName !== 'string' ||
        !body.leadName.trim() ||
        !allowedKinds.includes(kind) ||
        !allowedLevels.includes(level)
      ) {
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'Invalid operational alert payload.'
        });
      }

      const clean = (value: unknown, max: number) =>
        typeof value === 'string' ? value.trim().slice(0, max) : undefined;

      const result = await sendOperationalAlertNotification({
        id: body.id.trim().slice(0, 200),
        leadName: body.leadName.trim().slice(0, 160),
        company: clean(body.company, 200),
        email: clean(body.email, 320),
        nextAction: clean(body.nextAction, 500),
        followUpAt: clean(body.followUpAt, 100),
        level,
        kind
      });

      if (result.status === 'SKIPPED') {
        return res.status(200).json({
          success: true,
          code: 'EMAIL_NOT_CONFIGURED',
          status: result.status,
          message: 'Email provider configuration is incomplete. No email was sent.'
        });
      }

      if (!result.success || result.status === 'FAILED') {
        return res.status(502).json({
          success: false,
          code: 'EMAIL_PROVIDER_ERROR',
          status: result.status,
          error: result.error || 'Email provider rejected the operational alert.'
        });
      }

      console.info(
        `[ADMIN EMAIL ALERT] Admin ${identity.uid} sent ${kind} for lead ${body.id}`
      );

      return res.status(200).json({
        success: true,
        code: 'EMAIL_SENT',
        status: result.status,
        provider: result.provider,
        messageId: result.messageId,
        message: 'Operational alert email sent successfully.'
      });
    } catch (err: any) {
      console.error('[ADMIN LEAD EMAIL ERROR]', err);

      const configurationError =
        err instanceof Error && err.message === 'ADMIN_FIREBASE_UID is not configured.';

      return res.status(configurationError ? 503 : 401).json({
        success: false,
        code: configurationError ? 'ADMIN_NOT_CONFIGURED' : 'AUTH_ERROR',
        error: configurationError
          ? 'Admin backend identity is not configured.'
          : 'Could not verify administrator identity.'
      });
    }
  });

  // 7. Vite middleware for frontend development and production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`G-KAIS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
