import type { APIRoute } from 'astro';
import { getSql } from '../../server/db/client.ts';
import { destroySession, SESSION_COOKIE } from '../../server/auth/session.ts';
import { clearSessionCookie } from '../../server/auth/cookie.ts';
import { logError } from '../../server/log.ts';

export const prerender = false;

// POST /admin/logout/ — ends the session in the database and removes the cookie.
export const POST: APIRoute = async (context) => {
  try {
    await destroySession(getSql(), context.cookies.get(SESSION_COOKIE)?.value);
  } catch (err) {
    logError('admin/logout', err);
  }
  clearSessionCookie(context.cookies);
  return context.redirect('/admin/login/?out=1', 303);
};
