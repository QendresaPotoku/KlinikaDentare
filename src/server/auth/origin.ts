import { config } from '../config.ts';

/**
 * Origins this site is served from: the configured public URL (correct behind a hosting proxy,
 * where the server itself sees plain http on an internal host) and the request's own origin.
 */
export function siteOrigins(requestUrl: URL): string[] {
  const out = [requestUrl.origin];
  try {
    out.push(new URL(config.siteUrl).origin);
  } catch {
    /* PUBLIC_SITE_URL missing: only the request origin */
  }
  return out;
}

/** Secure cookies whenever the public site is HTTPS (or the request itself is). */
export function cookieSecure(requestUrl: URL): boolean {
  if (requestUrl.protocol === 'https:') return true;
  try {
    return config.siteUrl.startsWith('https://');
  } catch {
    return false;
  }
}
