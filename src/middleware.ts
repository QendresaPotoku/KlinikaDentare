import { defineMiddleware } from 'astro:middleware';
import { getSql } from './server/db/client.ts';
import { getSessionUser, SESSION_COOKIE } from './server/auth/session.ts';
import { setSessionCookie } from './server/auth/cookie.ts';
import { guardAdminRequest, isAdminPath } from './server/auth/guard.ts';
import { cookieSecure, siteOrigins } from './server/auth/origin.ts';
import { startNotificationWorker } from './server/notifications/dispatcher.ts';
import { logError } from './server/log.ts';
import { checkEnvironment } from './server/env-check.ts';

// Checked once, on the first real request (never during the build). In production an unsafe
// configuration blocks every on-demand route (booking API, admin, cancellation page) with 503.
let envState: { blocked: boolean; production: boolean; https: boolean } | null = null;
function runtimeEnv() {
  if (!envState) {
    const report = checkEnvironment();
    envState = {
      blocked: report.production && report.errors.length > 0,
      production: report.production,
      https: (process.env.PUBLIC_SITE_URL ?? '').startsWith('https://'),
    };
    if (envState.blocked) console.error(`[config] ${report.errors.length} configuration error(s); run "npm run check:env" for details.`);
  }
  return envState;
}

/** Headers for every on-demand response (static files are served as built). */
function baseHeaders(res: Response): Response {
  const h = res.headers;
  if (!h.has('x-content-type-options')) h.set('x-content-type-options', 'nosniff');
  if (!h.has('referrer-policy')) h.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (!h.has('x-frame-options')) h.set('x-frame-options', 'SAMEORIGIN');
  const env = runtimeEnv();
  if (env.https && env.production) h.set('strict-transport-security', 'max-age=31536000');
  return res;
}

/**
 * Protects everything under /admin: pages redirect to the login, APIs answer 401. Admin responses
 * are never cached and never indexed. Runs only for on-demand routes (the public site is static).
 */
export const onRequest = defineMiddleware(async (context, next) => {
  // Pre-rendered pages are built ahead of time: nothing here applies to them (and no database is needed).
  if (context.isPrerendered) return next();
  const { pathname, search } = context.url;
  if (runtimeEnv().blocked && pathname !== '/api/health/') {
    return baseHeaders(new Response('Service unavailable (configuration).', { status: 503, headers: { 'cache-control': 'no-store' } }));
  }
  // Sends queued notifications in the background (retries, anything not sent right after a change).
  try {
    startNotificationWorker(getSql());
  } catch (err) {
    logError('notifications/worker-start', err);
  }
  if (!isAdminPath(pathname)) return baseHeaders(await next());

  const secureHeaders = (res: Response) => {
    baseHeaders(res);
    res.headers.set('cache-control', 'no-store, private');
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    res.headers.set('x-frame-options', 'DENY');
    res.headers.set('referrer-policy', 'same-origin');
    res.headers.set('x-content-type-options', 'nosniff');
    return res;
  };

  const token = context.cookies.get(SESSION_COOKIE)?.value;
  let session: Awaited<ReturnType<typeof getSessionUser>> = null;
  try {
    session = await getSessionUser(getSql(), token);
  } catch (err) {
    logError('admin/session', err);
    if (pathname.startsWith('/admin/api/')) {
      return secureHeaders(Response.json({ error: 'server_error' }, { status: 500 }));
    }
    return secureHeaders(new Response('Shërbimi nuk është i disponueshëm për momentin. Provoni përsëri pas pak.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    }));
  }

  const decision = guardAdminRequest({
    pathname,
    search,
    method: context.request.method,
    signedIn: !!session,
    origin: context.request.headers.get('origin'),
    selfOrigins: siteOrigins(context.url),
  });
  if (decision.action === 'forbidden') return secureHeaders(Response.json({ error: 'forbidden' }, { status: 403 }));
  if (decision.action === 'unauthorized') return secureHeaders(Response.json({ error: 'unauthorized' }, { status: 401 }));
  if (decision.action === 'redirect') {
    // A cookie that no longer maps to a session = the session expired (or the user was deactivated).
    if (token) context.cookies.delete(SESSION_COOKIE, { path: '/admin' });
    return secureHeaders(context.redirect(token ? `${decision.location}&expired=1` : decision.location, 303));
  }

  if (session) {
    context.locals.staff = session.user;
    if (session.refreshed) setSessionCookie(context.cookies, token!, cookieSecure(context.url));
  }
  return secureHeaders(await next());
});
