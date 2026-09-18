import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number; // Duration of window in milliseconds (e.g. 10 * 60 * 1000 = 10 minutes)
  maxRequests: number; // Max requests allowed within window
  message?: string;
}

export function createIpRateLimiter(options: RateLimiterOptions) {
  const ipStore = new Map<string, RateLimitEntry>();

  // Cleanup old entries every 5 minutes to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of ipStore.entries()) {
      entry.timestamps = entry.timestamps.filter((ts) => now - ts < options.windowMs);
      if (entry.timestamps.length === 0) {
        ipStore.delete(ip);
      }
    }
  }, 5 * 60 * 1000);

  return (req: Request, res: Response, next: NextFunction) => {
    // Determine client IP (supports proxies and Cloud Run x-forwarded-for)
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    let entry = ipStore.get(ip);
    if (!entry) {
      entry = { timestamps: [] };
      ipStore.set(ip, entry);
    }

    // Filter to only timestamps within the active window
    entry.timestamps = entry.timestamps.filter((ts) => now - ts < options.windowMs);

    if (entry.timestamps.length >= options.maxRequests) {
      console.warn(`[RATE LIMIT] Throttling IP ${ip} - Exceeded ${options.maxRequests} requests in ${options.windowMs}ms`);
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMITED',
        error: options.message || 'Too many submissions from this address. Please wait a few minutes before trying again.'
      });
    }

    entry.timestamps.push(now);
    next();
  };
}

// Default export: 5 submissions per 10 minutes per IP
export const leadSubmissionRateLimiter = createIpRateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many submissions received from this connection. Please wait a few minutes before trying again.'
});
