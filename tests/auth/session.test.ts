import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { hashPassword } from '../../src/server/auth/password.ts';
import {
  createSession,
  destroySession,
  getSessionUser,
  login,
  safeNextPath,
  SESSION_IDLE_MS,
  SESSION_MAX_MS,
} from '../../src/server/auth/session.ts';
import { guardAdminRequest } from '../../src/server/auth/guard.ts';
import { createTestDb, resetData } from '../helpers/db.ts';

let sql: Sql;
let userId: string;
const NOW = Date.parse('2026-11-02T08:00:00Z');
let ip = 0;
const nextIp = () => `192.168.0.${++ip}`;

beforeAll(async () => {
  sql = await createTestDb();
});
afterAll(async () => {
  await sql?.end();
});
beforeEach(async () => {
  await resetData(sql);
  const [u] = await sql<{ id: string }[]>`
    INSERT INTO admin_users (email, name, password_hash)
    VALUES ('reception@klinika.test', 'Recepsioni', ${await hashPassword('correct horse battery')})
    RETURNING id`;
  userId = u.id;
});

describe('login', () => {
  it('signs in with the right credentials (case-insensitive email) and creates a session', async () => {
    const r = await login(sql, { email: ' Reception@Klinika.test ', password: 'correct horse battery', ip: nextIp() }, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.user.name).toBe('Recepsioni');
    const session = await getSessionUser(sql, r.token, NOW + 1000);
    expect(session?.user.id).toBe(userId);
    // Only a hash of the token is stored.
    const [row] = await sql`SELECT token_hash FROM sessions`;
    expect(row.tokenHash).not.toBe(r.token);
  });

  it('gives the same answer for a wrong password, an unknown email and an inactive account', async () => {
    expect(await login(sql, { email: 'reception@klinika.test', password: 'wrong password!!', ip: nextIp() }, NOW)).toEqual({ ok: false, reason: 'invalid' });
    expect(await login(sql, { email: 'nobody@klinika.test', password: 'correct horse battery', ip: nextIp() }, NOW)).toEqual({ ok: false, reason: 'invalid' });
    await sql`UPDATE admin_users SET active = false`;
    expect(await login(sql, { email: 'reception@klinika.test', password: 'correct horse battery', ip: nextIp() }, NOW)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rate-limits repeated attempts per email and per IP', async () => {
    for (let i = 0; i < 5; i++) await login(sql, { email: 'reception@klinika.test', password: 'nope-nope-nope', ip: nextIp() }, NOW);
    // Even the right password is refused while the email is locked.
    expect(await login(sql, { email: 'reception@klinika.test', password: 'correct horse battery', ip: nextIp() }, NOW)).toEqual({
      ok: false,
      reason: 'rate_limited',
    });
    // After the window it works again.
    expect((await login(sql, { email: 'reception@klinika.test', password: 'correct horse battery', ip: nextIp() }, NOW + 16 * 60_000)).ok).toBe(true);

    const sameIp = nextIp();
    for (let i = 0; i < 10; i++) await login(sql, { email: `x${i}@klinika.test`, password: 'nope-nope-nope', ip: sameIp }, NOW);
    expect((await login(sql, { email: 'reception@klinika.test', password: 'correct horse battery', ip: sameIp }, NOW + 60_000)).ok).toBe(false);
  });
});

describe('sessions', () => {
  it('expires after 12 hours of inactivity', async () => {
    const { token } = await createSession(sql, userId, {}, NOW);
    expect(await getSessionUser(sql, token, NOW + SESSION_IDLE_MS - 1000)).not.toBeNull();
    const fresh = await createSession(sql, userId, {}, NOW);
    expect(await getSessionUser(sql, fresh.token, NOW + SESSION_IDLE_MS + 1000)).toBeNull();
  });

  it('slides the expiry while in use, but never beyond 7 days', async () => {
    const { token } = await createSession(sql, userId, {}, NOW);
    let t = NOW;
    for (let i = 0; i < 20; i++) {
      t += 10 * 3_600_000; // active every 10 hours
      const s = await getSessionUser(sql, token, t);
      if (t < NOW + SESSION_MAX_MS) expect(s, `at +${(t - NOW) / 3_600_000}h`).not.toBeNull();
      else expect(s).toBeNull();
    }
  });

  it('ends when the user is deactivated, and on logout', async () => {
    const a = await createSession(sql, userId, {}, NOW);
    await sql`UPDATE admin_users SET active = false`;
    expect(await getSessionUser(sql, a.token, NOW + 1000)).toBeNull();
    await sql`UPDATE admin_users SET active = true`;
    const b = await createSession(sql, userId, {}, NOW);
    await destroySession(sql, b.token);
    expect(await getSessionUser(sql, b.token, NOW + 1000)).toBeNull();
  });

  it('rejects malformed tokens without querying', async () => {
    expect(await getSessionUser(sql, undefined)).toBeNull();
    expect(await getSessionUser(sql, "' OR 1=1 --")).toBeNull();
    expect(await getSessionUser(sql, 'a'.repeat(43))).toBeNull();
  });
});

describe('redirect target and route guard', () => {
  it('only allows local admin paths after login', () => {
    expect(safeNextPath('/admin/appointments/123/')).toBe('/admin/appointments/123/');
    expect(safeNextPath('https://evil.example/admin')).toBe('/admin/');
    expect(safeNextPath('//evil.example')).toBe('/admin/');
    expect(safeNextPath('/admin\\..\\x')).toBe('/admin/');
    expect(safeNextPath('/admin/login/?next=/admin/')).toBe('/admin/');
    expect(safeNextPath(null)).toBe('/admin/');
  });

  const base = { search: '', method: 'GET', signedIn: false, origin: null, selfOrigins: ['https://klinika.test'] };
  it('redirects pages to the login and answers APIs with 401', () => {
    expect(guardAdminRequest({ ...base, pathname: '/admin/', search: '?date=2026-11-02' })).toEqual({
      action: 'redirect',
      location: '/admin/login/?next=%2Fadmin%2F%3Fdate%3D2026-11-02',
    });
    expect(guardAdminRequest({ ...base, pathname: '/admin/api/catalog/' })).toEqual({ action: 'unauthorized' });
    expect(guardAdminRequest({ ...base, pathname: '/admin/login/' })).toEqual({ action: 'allow' });
    expect(guardAdminRequest({ ...base, pathname: '/admin/', signedIn: true })).toEqual({ action: 'allow' });
  });

  it('refuses state-changing requests from other origins, even when signed in', () => {
    const post = { ...base, method: 'POST', signedIn: true, pathname: '/admin/api/appointments/' };
    expect(guardAdminRequest({ ...post, origin: 'https://evil.example' })).toEqual({ action: 'forbidden' });
    expect(guardAdminRequest({ ...post, origin: null })).toEqual({ action: 'forbidden' });
    expect(guardAdminRequest({ ...post, origin: 'https://klinika.test' })).toEqual({ action: 'allow' });
    expect(guardAdminRequest({ ...base, method: 'POST', pathname: '/admin/login/', origin: 'https://evil.example' })).toEqual({ action: 'forbidden' });
  });
});
