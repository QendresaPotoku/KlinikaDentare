import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, short-lived token handed to the booking form when it loads. A submission must carry a
 * token that is at least MIN_AGE old (a person needs longer than that to go through the steps;
 * scripts posting straight to the API do not) and not older than MAX_AGE.
 * This replaces a CAPTCHA for legitimate visitors: they never see it.
 */
export const FORM_TOKEN_MIN_AGE_MS = 3_000;
export const FORM_TOKEN_MAX_AGE_MS = 12 * 3_600_000;

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(`booking-form:${payload}`).digest('base64url');
}

export function issueFormToken(secret: string, now = Date.now()): string {
  const payload = now.toString(36);
  return `${payload}.${sign(payload, secret)}`;
}

export type FormTokenCheck = 'ok' | 'invalid' | 'too_fast' | 'expired';

export function checkFormToken(token: unknown, secret: string, now = Date.now()): FormTokenCheck {
  if (typeof token !== 'string' || token.length > 200) return 'invalid';
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return 'invalid';
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return 'invalid';
  const issuedAt = parseInt(payload, 36);
  if (!Number.isFinite(issuedAt)) return 'invalid';
  const age = now - issuedAt;
  if (age < FORM_TOKEN_MIN_AGE_MS) return 'too_fast';
  if (age > FORM_TOKEN_MAX_AGE_MS) return 'expired';
  return 'ok';
}
