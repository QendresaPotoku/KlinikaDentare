import { createHash, randomBytes } from 'node:crypto';
import type { Db, Sql } from '../db/client.ts';
import { hashPassword, verifyPassword } from './password.ts';
import { hitRateLimit } from '../security/rate-limit.ts';

/**
 * Staff sessions. The browser holds a random token in an HttpOnly cookie; the database stores only
 * its SHA-256 hash, so a leaked database copy cannot be used to log in.
 *
 * Lifetime: a session ends after 12 hours without activity (sliding) and at the latest 7 days
 * after login. Deactivating a user or resetting their password ends their sessions.
 */

export const SESSION_COOKIE = 'klinika_admin';
export const SESSION_IDLE_MS = 12 * 3_600_000;
export const SESSION_MAX_MS = 7 * 24 * 3_600_000;
/** Extend the idle expiry at most this often, to avoid a database write on every request. */
const SESSION_REFRESH_MS = 15 * 60_000;

export interface StaffUser {
  id: string;
  email: string;
  name: string;
}

const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function createSession(
  db: Db,
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
  now = Date.now(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(now + SESSION_IDLE_MS);
  await db`
    INSERT INTO sessions (token_hash, user_id, created_at, expires_at, ip, user_agent)
    VALUES (${hash(token)}, ${userId}, ${new Date(now)}, ${expiresAt}, ${meta.ip ?? null}, ${meta.userAgent?.slice(0, 300) ?? null})
  `;
  await db`UPDATE admin_users SET last_login_at = ${new Date(now)} WHERE id = ${userId}`;
  return { token, expiresAt };
}

/** The signed-in user for a session token, or null (missing, expired, user inactive). */
export async function getSessionUser(
  db: Db,
  token: string | undefined,
  now = Date.now(),
): Promise<{ user: StaffUser; expiresAt: Date; refreshed: boolean } | null> {
  if (!token || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const [row] = await db<{ sessionId: string; createdAt: Date; expiresAt: Date; id: string; email: string; name: string; active: boolean }[]>`
    SELECT s.id AS session_id, s.created_at, s.expires_at, u.id, u.email, u.name, u.active
    FROM sessions s JOIN admin_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hash(token)}
  `;
  if (!row) return null;
  const hardLimit = row.createdAt.getTime() + SESSION_MAX_MS;
  if (!row.active || row.expiresAt.getTime() <= now || hardLimit <= now) {
    await db`DELETE FROM sessions WHERE id = ${row.sessionId}`;
    return null;
  }
  let expiresAt = row.expiresAt;
  let refreshed = false;
  if (row.expiresAt.getTime() - now < SESSION_IDLE_MS - SESSION_REFRESH_MS) {
    expiresAt = new Date(Math.min(now + SESSION_IDLE_MS, hardLimit));
    await db`UPDATE sessions SET expires_at = ${expiresAt} WHERE id = ${row.sessionId}`;
    refreshed = true;
  }
  if (Math.random() < 0.02) await db`DELETE FROM sessions WHERE expires_at < ${new Date(now)}`;
  return { user: { id: row.id, email: row.email, name: row.name }, expiresAt, refreshed };
}

export async function destroySession(db: Db, token: string | undefined): Promise<void> {
  if (token) await db`DELETE FROM sessions WHERE token_hash = ${hash(token)}`;
}

export type LoginResult = { ok: true; user: StaffUser; token: string; expiresAt: Date } | { ok: false; reason: 'invalid' | 'rate_limited' };

// Used to spend the same time on unknown emails as on wrong passwords (no account enumeration).
let dummyHash: Promise<string> | null = null;

/**
 * Email + password login. Unknown email, wrong password and inactive account all give the same
 * "invalid" answer. Limited to 10 attempts per IP and 5 per email address per 15 minutes.
 */
export async function login(
  sql: Sql,
  input: { email: string; password: string; ip: string; userAgent?: string },
  now = Date.now(),
): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase().slice(0, 254);
  const window = { windowSeconds: 900 };
  const ipOk = await hitRateLimit(sql, `login-ip:${input.ip}`, { ...window, limit: 10 }, now);
  const emailOk = await hitRateLimit(sql, `login-email:${email}`, { ...window, limit: 5 }, now);
  if (!ipOk || !emailOk) return { ok: false, reason: 'rate_limited' };

  const [user] = await sql<{ id: string; email: string; name: string; active: boolean; passwordHash: string }[]>`
    SELECT id, email, name, active, password_hash FROM admin_users WHERE email = ${email}
  `;
  if (!user) {
    dummyHash ??= hashPassword('dummy-password-for-timing');
    await verifyPassword(input.password, await dummyHash);
    return { ok: false, reason: 'invalid' };
  }
  const valid = await verifyPassword(input.password.slice(0, 1024), user.passwordHash);
  if (!valid || !user.active) return { ok: false, reason: 'invalid' };

  const session = await createSession(sql, user.id, { ip: input.ip, userAgent: input.userAgent }, now);
  return { ok: true, user: { id: user.id, email: user.email, name: user.name }, ...session };
}

/** Where to go after login: only local admin paths are allowed (no open redirects). */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/admin') || next.startsWith('//') || next.includes('\\') || /[\r\n]/.test(next)) return '/admin/';
  if (next.startsWith('/admin/login')) return '/admin/';
  return next;
}
