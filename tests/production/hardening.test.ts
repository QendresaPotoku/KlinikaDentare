import { describe, expect, it } from 'vitest';
import { checkEnvironment } from '../../src/server/env-check.ts';
import { readJson } from '../../src/server/http/respond.ts';
import { describeError } from '../../src/server/log.ts';

const GOOD_SECRET = 'q8Zr2Lw0TfX9vB6nK3mH1pYd7sJ5cA4eG0uR2iO9xNk';
const prod = (overrides: Record<string, string | undefined> = {}) =>
  checkEnvironment({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://app:pw@db.internal:5432/klinika',
    PUBLIC_SITE_URL: 'https://www.klinika-dentare.com',
    APP_SECRET: GOOD_SECRET,
    PORT: '10000',
    TRUST_PROXY: 'true',
    EMAIL_PROVIDER: 'smtp',
    SMTP_HOST: 'smtp.mail-provider.net',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'apikey',
    SMTP_PASS: 'super-secret-smtp-password',
    EMAIL_FROM: 'Klinika Dentare <termine@klinika-dentare.com>',
    NOTIFICATIONS_WORKER: 'on',
    ...overrides,
  });

describe('production configuration check', () => {
  it('accepts a complete, safe configuration', () => {
    expect(prod().errors).toEqual([]);
  });

  it('rejects missing or unsafe critical values', () => {
    const errorsFor = (o: Record<string, string | undefined>) => prod(o).errors.join(' | ');
    expect(errorsFor({ DATABASE_URL: undefined })).toContain('DATABASE_URL is missing');
    expect(errorsFor({ DATABASE_URL: 'mysql://x' })).toContain('DATABASE_URL must look like');
    expect(errorsFor({ DATABASE_URL: 'not a url' })).toContain('DATABASE_URL is not a valid URL');
    expect(errorsFor({ PUBLIC_SITE_URL: 'http://www.klinika-dentare.com' })).toContain('must use https');
    expect(errorsFor({ PUBLIC_SITE_URL: 'https://localhost' })).toContain('localhost');
    expect(errorsFor({ PUBLIC_SITE_URL: 'https://www.example-klinika.com' })).toContain('example domain');
    expect(errorsFor({ PUBLIC_SITE_URL: 'https://www.klinika-dentare.com/sq/' })).toContain('no path');
    expect(errorsFor({ APP_SECRET: undefined })).toContain('APP_SECRET is missing');
    expect(errorsFor({ APP_SECRET: 'short' })).toContain('too short');
    expect(errorsFor({ APP_SECRET: 'change-me-change-me-change-me-change-me-123' })).toContain('placeholder');
    expect(errorsFor({ APP_SECRET: 'a'.repeat(40) })).toContain('placeholder');
    expect(errorsFor({ EMAIL_PROVIDER: 'console' })).toContain('never delivered');
    expect(errorsFor({ SMTP_HOST: '' })).toContain('SMTP_HOST is missing');
    expect(errorsFor({ EMAIL_FROM: 'not-an-address' })).toContain('EMAIL_FROM must be an address');
    expect(errorsFor({ SMTP_PASS: '' })).toContain('SMTP_USER and SMTP_PASS must both be set');
    expect(errorsFor({ SMTP_ALLOW_INSECURE: 'true' })).toContain('without TLS');
    expect(errorsFor({ PORT: '99999' })).toContain('PORT');
    expect(errorsFor({ TRUST_PROXY: 'yes' })).toContain('TRUST_PROXY');
  });

  it('warns (does not block) while no SMS provider is set, and rejects unknown providers', () => {
    expect(prod().warnings.join(' | ')).toContain('SMS_PROVIDER is not set: patients receive no confirmation or reminder SMS');
    expect(prod({ SMS_PROVIDER: 'console' }).warnings.join(' | ')).toContain('only be logged');
    expect(prod({ SMS_PROVIDER: 'console' }).errors).toEqual([]);
    expect(prod({ SMS_PROVIDER: 'twilio' }).errors.join(' | ')).toContain('SMS_PROVIDER must be');
  });

  it('never includes secret values in its messages', () => {
    const report = prod({ APP_SECRET: 'short-but-secret', SMTP_USER: 'apikey', SMTP_PASS: '' });
    const all = [...report.errors, ...report.warnings].join(' ');
    expect(all).not.toContain('short-but-secret');
    expect(all).not.toContain('super-secret-smtp-password');
    expect(all).not.toContain('pw@db.internal');
  });

  it('only warns outside production (local development keeps working)', () => {
    const dev = checkEnvironment({
      DATABASE_URL: 'postgres://klinika:klinika@localhost:54329/klinika',
      PUBLIC_SITE_URL: 'http://localhost:4321',
      APP_SECRET: GOOD_SECRET,
      EMAIL_PROVIDER: 'console',
    });
    expect(dev.production).toBe(false);
    expect(dev.errors).toEqual([]);
    expect(dev.warnings.length).toBeGreaterThan(0);
  });
});

describe('request body limits', () => {
  const req = (body: string, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
    new Request('http://x/', { method: 'POST', body, headers });

  it('parses small JSON and rejects malformed JSON, wrong content types and oversized bodies', async () => {
    expect(await readJson(req('{"a":1}'))).toEqual({ a: 1 });
    expect(await readJson(req('{"a":'))).toBeUndefined();
    expect(await readJson(req('{"a":1}', { 'content-type': 'text/plain' }))).toBeUndefined();
    expect(await readJson(req(JSON.stringify({ x: 'y'.repeat(20_000) })))).toBeUndefined();
    expect(await readJson(req('{}', { 'content-type': 'application/json', 'content-length': '999999' }))).toBeUndefined();
  });
});

describe('safe error logging', () => {
  it('drops SQL parameters and masks emails/phones in messages', () => {
    const err = Object.assign(new Error('duplicate key value violates unique constraint "appointments_idempotency_key_key"'), {
      name: 'PostgresError',
      code: '23505',
      constraint_name: 'appointments_idempotency_key_key',
      parameters: ['Lena Berisha', '+4915112345678', 'lena@example.de'],
      query: 'INSERT INTO appointments …',
    });
    const line = describeError(err);
    expect(line).toContain('code=23505');
    expect(line).not.toContain('Lena');
    expect(line).not.toContain('INSERT');
    expect(describeError(new Error('could not send to lena@example.de at +49 151 12345678'))).toBe('Error could not send to <email> at <number>');
  });
});
