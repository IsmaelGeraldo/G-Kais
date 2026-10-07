import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let app;

function getApp() {
  if (!app) {
    const { createGkaisApiApp } = require('../server-build/server.cjs');
    app = createGkaisApiApp({ registerStripeWebhook: false });
  }
  return app;
}

function pathFromQuery(value) {
  if (Array.isArray(value)) return value.map((item) => String(item)).join('/');
  return typeof value === 'string' ? value : '';
}

function appendQuery(search, key, value) {
  if (Array.isArray(value)) {
    value.forEach((item) => search.append(key, String(item)));
    return;
  }
  if (value !== undefined && value !== null) search.append(key, String(value));
}

export default function handler(req, res) {
  try {
    const query = req.query && typeof req.query === 'object' ? req.query : {};
    const path = pathFromQuery(query.path);
    const search = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (key !== 'path') appendQuery(search, key, value);
    });

    req.url = `/api/${path}${search.toString() ? `?${search.toString()}` : ''}`;
    return getApp()(req, res);
  } catch (error) {
    console.error('[VERCEL API BOOT ERROR]', error);
    return res.status(500).json({
      success: false,
      code: 'VERCEL_API_BOOT_ERROR'
    });
  }
}
