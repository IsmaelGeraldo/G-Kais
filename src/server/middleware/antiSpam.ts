import { Request, Response, NextFunction } from 'express';

/**
 * Basic Anti-Spam Middleware:
 * 1. Checks hidden honeypot fields (bots automatically populate all input fields).
 * 2. Verifies minimum human interaction elapsed time (> 1.5 seconds between form load and submit).
 */
export function antiSpamMiddleware(req: Request, res: Response, next: NextFunction) {
  const body = req.body || {};

  // 1. Honeypot check
  // Any value present in honeypot fields indicates an automated script
  const honeypotValues = [
    body._hp_website_title,
    body._gotcha,
    body.honeypot
  ].filter(Boolean);

  if (honeypotValues.length > 0) {
    console.warn(`[ANTI-SPAM] Honeypot triggered by IP ${req.ip}`);
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      error: 'Submission flagged by automated spam filter.'
    });
  }

  // 2. Minimum interaction time check
  // If client provided `_formRenderedAt`, ensure at least 1500ms elapsed
  if (body._formRenderedAt) {
    const renderedAt = Number(body._formRenderedAt);
    if (!isNaN(renderedAt)) {
      const elapsed = Date.now() - renderedAt;
      if (elapsed < 1500) {
        console.warn(`[ANTI-SPAM] Robotic speed submission detected (${elapsed}ms) from IP ${req.ip}`);
        return res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          error: 'Form was submitted too quickly. Please take a moment and try again.'
        });
      }
    }
  }

  next();
}
