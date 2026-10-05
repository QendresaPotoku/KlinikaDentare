import { createHash, createHmac } from 'node:crypto';

/**
 * The patient's private "manage / cancel" link.
 *
 * The secret in the link is derived from the appointment id with APP_SECRET (HMAC-SHA256), so the
 * server can rebuild it when an email is sent later, without ever storing it. The database keeps
 * only its SHA-256 hash (appointments.manage_token_hash) for lookups; a copy of the database alone
 * cannot produce working links. Rotating APP_SECRET invalidates all existing links.
 */

export function manageTokenFor(appointmentId: string, secret: string): string {
  return createHmac('sha256', secret).update(`manage-link:${appointmentId}`).digest('base64url');
}

export function hashManageToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function manageUrl(siteUrl: string, lang: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/${lang}/termin/${token}/`;
}
