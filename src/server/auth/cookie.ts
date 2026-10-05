import type { AstroCookies } from 'astro';
import { SESSION_COOKIE, SESSION_IDLE_MS } from './session.ts';

/**
 * Session cookie: HttpOnly (no script access), SameSite=Lax (not sent on cross-site POSTs),
 * Secure on HTTPS, and scoped to /admin so the public site never receives it.
 */
export function setSessionCookie(cookies: AstroCookies, token: string, secure: boolean) {
  cookies.set(SESSION_COOKIE, token, {
    path: '/admin',
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: Math.floor(SESSION_IDLE_MS / 1000),
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/admin' });
}
