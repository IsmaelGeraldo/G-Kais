import { createGkaisApiApp } from '../server.js';

const app = createGkaisApiApp({ registerStripeWebhook: false });

function pathFromQuery(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join('/');
  return typeof value === 'string' ? value : '';
}

function appendQuery(search: URLSearchParams, key: string, value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach((item) => search.append(key, String(item)));
    return;
  }
  if (value !== undefined && value !== null) search.append(key, String(value));
}

export default function handler(req: any, res: any) {
  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const path = pathFromQuery(query.path);
  const search = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (key !== 'path') appendQuery(search, key, value);
  });

  req.url = `/api/${path}${search.toString() ? `?${search.toString()}` : ''}`;
  return app(req, res);
}
