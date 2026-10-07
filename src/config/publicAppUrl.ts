function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function validHttpOrigin(value: string): string {
  const clean = trimTrailingSlash(value);
  if (!clean) return '';
  try {
    const url = new URL(clean);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export function configuredPublicAppUrl(): string {
  return validHttpOrigin(String(import.meta.env.VITE_PUBLIC_APP_URL || ''));
}

export function publicAppOrigin(): string {
  const configured = configuredPublicAppUrl();
  if (configured) return configured;
  if (typeof window === 'undefined') return '';
  return validHttpOrigin(window.location.origin);
}

export function buildPublicAppUrl(pathname: string, query?: URLSearchParams): string {
  const origin = publicAppOrigin();
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const suffix = query && query.toString() ? `?${query.toString()}` : '';
  return origin ? `${origin}${path}${suffix}` : `${path}${suffix}`;
}

export function isPrivateOrPreviewAppOrigin(origin = publicAppOrigin()): boolean {
  if (!origin) return true;
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === 'localhost'
      || host === '127.0.0.1'
      || host.endsWith('.local')
      || /aistudio|ais-dev|googleusercontent|usercontent/.test(host);
  } catch {
    return true;
  }
}
