let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = import('../server-build/server.mjs').then(({ createGkaisApiApp }) =>
      createGkaisApiApp({ registerStripeWebhook: false })
    );
  }
  return appPromise;
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

export default async function handler(req, res) {
  try {
    const query = req.query && typeof req.query === 'object' ? req.query : {};
    const path = pathFromQuery(query.path);
    const search = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (key !== 'path') appendQuery(search, key, value);
    });

    req.url = `/api/${path}${search.toString() ? `?${search.toString()}` : ''}`;
    const app = await getApp();
    return app(req, res);
  } catch (error) {
    console.error('[VERCEL API BOOT ERROR]', error);
    const details = process.env.VERCEL_ENV === 'preview'
      ? {
          name: error instanceof Error ? error.name : 'UnknownError',
          runtimeCode: error && typeof error === 'object' && 'code' in error ? String(error.code) : null,
          message: error instanceof Error ? error.message : String(error)
        }
      : undefined;

    return res.status(500).json({
      success: false,
      code: 'VERCEL_API_BOOT_ERROR',
      ...(details ? { details } : {})
    });
  }
}
