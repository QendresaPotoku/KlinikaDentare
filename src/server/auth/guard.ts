/**
 * Decides what happens to a request under /admin before the page or API runs.
 * Pure function so the rules are easy to test; src/middleware.ts applies it.
 */

export type GuardDecision =
  | { action: 'allow' }
  | { action: 'redirect'; location: string }
  | { action: 'unauthorized' }
  | { action: 'forbidden' };

export function isAdminPath(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export function guardAdminRequest(input: {
  pathname: string;
  search: string;
  method: string;
  signedIn: boolean;
  /** Origin header of the request (null if absent). */
  origin: string | null;
  /** This site's origins, e.g. ['https://www.klinika.com'] */
  selfOrigins: string[];
}): GuardDecision {
  const isApi = input.pathname.startsWith('/admin/api/');
  const isLogin = input.pathname === '/admin/login/' || input.pathname === '/admin/login';

  // State-changing requests must come from our own pages (defence in depth next to SameSite cookies
  // and Astro's form origin check).
  if (!['GET', 'HEAD'].includes(input.method) && (!input.origin || !input.selfOrigins.includes(input.origin))) {
    return { action: 'forbidden' };
  }

  if (isLogin) return { action: 'allow' };
  if (input.signedIn) return { action: 'allow' };
  if (isApi) return { action: 'unauthorized' };
  const next = encodeURIComponent(`${input.pathname}${input.search}`);
  return { action: 'redirect', location: `/admin/login/?next=${next}` };
}
