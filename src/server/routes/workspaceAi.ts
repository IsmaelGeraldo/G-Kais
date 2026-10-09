import type { Express, NextFunction, Request, Response } from 'express';
import { getWorkspaceInviteForDelivery, verifyWorkspaceBearerToken } from '../auth/workspaceAuth';
import { sendWorkspaceInvitationEmail } from '../services/email';
import { analyzeLeadWithGemini, sanitizeLeadIntelligenceInput } from '../services/leadIntelligence';
import { sendEnrollmentWelcome } from '../services/enrollmentWelcome';

async function sessionBriefHandler(req: Request, res: Response, next?: NextFunction) {
  try {
    const identity = await verifyWorkspaceBearerToken(req.headers.authorization, 'mentoring.read');
    if (!identity) {
      if (next) return next();
      return res.status(403).json({ success: false, code: 'WORKSPACE_FORBIDDEN', error: 'Active Workspace membership with mentoring access is required.' });
    }
    const input = sanitizeLeadIntelligenceInput(req.body);
    if (!input) return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'Session context is incomplete or invalid.' });
    const brief = await analyzeLeadWithGemini(input);
    console.info(`[WORKSPACE SESSION AI] Workspace ${identity.workspaceId} member ${identity.uid} analyzed client ${input.id}`);
    return res.status(200).json({ success: true, code: 'SESSION_BRIEF_READY', brief });
  } catch (err: unknown) {
    console.error('[WORKSPACE SESSION AI ERROR]', err);
    const missingApiKey = err instanceof Error && err.message === 'Gemini API key is not configured.';
    const unavailableAuth = err instanceof Error && /credential|firestore|project/i.test(err.message);
    return res.status(missingApiKey || unavailableAuth ? 503 : 502).json({
      success: false,
      code: missingApiKey ? 'AI_NOT_CONFIGURED' : unavailableAuth ? 'WORKSPACE_AUTH_UNAVAILABLE' : 'AI_PROVIDER_ERROR',
      error: missingApiKey ? 'G-KAIS AI is not configured in this environment.' : unavailableAuth ? 'Workspace authorization is temporarily unavailable.' : err instanceof Error ? err.message : 'G-KAIS could not prepare the session brief.'
    });
  }
}

function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function enrollmentWelcomeHandler(req: Request, res: Response) {
  try {
    const identity = await verifyWorkspaceBearerToken(req.headers.authorization, 'formations.manage');
    if (!identity) return res.status(403).json({ success: false, code: 'WORKSPACE_FORBIDDEN', error: 'Formation management access is required.' });
    const recipientEmail = cleanText(req.body?.recipientEmail, 240).toLowerCase();
    const personName = cleanText(req.body?.personName, 160);
    const formationTitle = cleanText(req.body?.formationTitle, 180);
    const cohortTitle = cleanText(req.body?.cohortTitle, 180);
    const startsAt = cleanText(req.body?.startsAt, 80);
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail) || !personName || !formationTitle || !cohortTitle) {
      return res.status(400).json({ success: false, code: 'VALIDATION_ERROR', error: 'Enrollment welcome payload is incomplete.' });
    }
    const result = await sendEnrollmentWelcome({ recipientEmail, personName, formationTitle, cohortTitle, startsAt });
    console.info(`[WORKSPACE ENROLLMENT WELCOME] workspace=${identity.workspaceId} member=${identity.uid} status=${result.status}`);
    return res.status(result.status === 'FAILED' ? 502 : 200).json({ code: `WELCOME_${result.status}`, ...result });
  } catch (err: unknown) {
    console.error('[WORKSPACE ENROLLMENT WELCOME ERROR]', err);
    return res.status(500).json({ success: false, code: 'WELCOME_ERROR', error: err instanceof Error ? err.message : 'Welcome email failed.' });
  }
}

async function workspaceInviteEmailHandler(req: Request, res: Response) {
  try {
    const identity = await verifyWorkspaceBearerToken(req.headers.authorization, 'members.manage');
    if (!identity) return res.status(403).json({ success: false, code: 'WORKSPACE_FORBIDDEN' });
    const inviteId = cleanText(req.body?.inviteId, 100);
    if (!/^invite-[a-z0-9-]{10,90}$/.test(inviteId)) {
      return res.status(400).json({ success: false, code: 'INVALID_INVITATION' });
    }
    // Recipient address, status and inviter come exclusively from verified Firestore data.
    const invite = await getWorkspaceInviteForDelivery(identity, req.headers.authorization, inviteId);
    if (!invite) return res.status(404).json({ success: false, code: 'INVITATION_NOT_AVAILABLE' });

    const configured = (process.env.VITE_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
    let publicBase: URL;
    try {
      publicBase = new URL(configured);
      if (publicBase.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && publicBase.hostname === 'localhost')) {
        throw new Error('HTTPS_REQUIRED');
      }
    } catch {
      return res.status(503).json({ success: false, code: 'PUBLIC_APP_URL_NOT_CONFIGURED' });
    }

    const inviteUrl = new URL('/workspace/experts', publicBase.origin);
    inviteUrl.searchParams.set('invite', `${identity.workspaceId}:${inviteId}`);
    const result = await sendWorkspaceInvitationEmail({
      recipientEmail: invite.recipientEmail,
      displayName: invite.displayName,
      inviteUrl: inviteUrl.toString()
    });
    if (result.status === 'SKIPPED') {
      return res.status(503).json({ success: false, code: 'INVITATION_EMAIL_NOT_CONFIGURED' });
    }
    if (!result.success || result.status !== 'SENT') {
      console.warn('[WORKSPACE INVITATION MAIL FAILED]', { workspaceId: identity.workspaceId, inviteId, status: result.status });
      return res.status(502).json({ success: false, code: 'INVITATION_EMAIL_FAILED' });
    }
    console.info('[WORKSPACE INVITATION MAIL SENT]', { workspaceId: identity.workspaceId, inviteId });
    return res.status(200).json({ success: true, code: 'INVITATION_EMAIL_SENT' });
  } catch (error) {
    console.error('[WORKSPACE INVITATION MAIL ERROR]', error instanceof Error ? error.message : 'UNKNOWN');
    return res.status(503).json({ success: false, code: 'INVITATION_EMAIL_UNAVAILABLE' });
  }
}

export function registerWorkspaceAiRoutes(app: Express): void {
  app.post('/api/workspace/ai/session-brief', (req, res) => sessionBriefHandler(req, res));
  app.post('/api/workspace/enrollment-welcome', (req, res) => enrollmentWelcomeHandler(req, res));
  app.post('/api/workspace/invitations/send', (req, res) => workspaceInviteEmailHandler(req, res));
  app.post('/api/admin/ai/lead-brief', (req, res, next) => sessionBriefHandler(req, res, next));
}
