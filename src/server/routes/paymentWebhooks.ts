import express, { type Express, type Request, type Response } from 'express';
import { handleStripeWebhook } from '../payments/stripeWebhook';

function signatureHeader(req: Request): string {
  const value = req.headers['stripe-signature'];
  return Array.isArray(value) ? value[0] || '' : typeof value === 'string' ? value : '';
}

export function registerPaymentWebhookRoutes(app: Express): void {
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '256kb' }),
    async (req: Request, res: Response) => {
      try {
        const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from([]);
        const signature = signatureHeader(req);
        if (!signature) {
          return res.status(400).json({ success: false, code: 'STRIPE_SIGNATURE_REQUIRED' });
        }

        const result = await handleStripeWebhook(rawBody, signature);
        if (result.status === 'ignored') {
          return res.status(200).json({ success: true, code: 'WEBHOOK_IGNORED', reason: result.reason });
        }

        console.info(
          `[VERIFIED PURCHASE] provider=stripe status=${result.status} workspace=${result.purchase.workspaceId} person=${result.purchase.personId} event=${result.purchase.providerEventId}`
        );
        return res.status(200).json({
          success: true,
          code: result.status === 'duplicate' ? 'VERIFIED_PURCHASE_DUPLICATE' : 'VERIFIED_PURCHASE_RECORDED'
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'STRIPE_WEBHOOK_ERROR';
        console.error('[STRIPE WEBHOOK ERROR]', error);
        if (message === 'STRIPE_WEBHOOK_NOT_CONFIGURED') {
          return res.status(503).json({ success: false, code: message });
        }
        if (message.startsWith('STRIPE_SIGNATURE_') || message === 'STRIPE_EMPTY_BODY' || message === 'STRIPE_EVENT_INVALID') {
          return res.status(400).json({ success: false, code: message });
        }
        if (message === 'PAYMENT_WORKSPACE_NOT_FOUND' || message === 'PAYMENT_PERSON_NOT_FOUND') {
          return res.status(409).json({ success: false, code: message });
        }
        return res.status(500).json({ success: false, code: 'VERIFIED_PURCHASE_PERSISTENCE_ERROR' });
      }
    }
  );
}
