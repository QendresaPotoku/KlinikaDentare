import { parsePhone } from '../booking/phone.ts';

/**
 * SMS delivery behind a small interface, so the provider can change without touching booking or
 * notification logic. Selected with SMS_PROVIDER:
 *   (unset) / "none"  no SMS is sent; due messages are marked skipped ("sms_not_configured")
 *   "console"         development: logs that an SMS would be sent (masked number, no text)
 *
 * Connecting a real provider (Infobip, Twilio, BudgetSMS, …):
 *   1. Implement SmsProvider in a new file (e.g. sms-infobip.ts) using its HTTP API; read credentials
 *      from environment variables only (e.g. SMS_PROVIDER=infobip, INFOBIP_API_KEY, SMS_SENDER).
 *      Throw SmsSendError(permanent=true) for invalid/unreachable numbers so they are not retried,
 *      permanent=false for timeouts, 5xx and rate limits. Never put the request body, the number or
 *      the credentials into the error message. Use a request timeout well under 10 minutes (the
 *      dispatcher's claim lease).
 *   2. Return it from getSmsProvider() below and accept its name in env-check.ts.
 * Queueing (confirmation + 24 h reminder), retries, staleness checks and the admin status already
 * work for any provider; booking code does not change.
 */

export interface SmsMessage {
  /** E.164 */
  to: string;
  text: string;
  /** Notification type, for logs only. */
  tag: string;
  /** Outbox row id: providers that accept a client reference can use it to drop duplicate submits. */
  reference: string;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<{ messageId?: string }>;
}

export class SmsSendError extends Error {
  readonly permanent: boolean;
  constructor(message: string, permanent: boolean) {
    super(message);
    this.name = 'SmsSendError';
    this.permanent = permanent;
  }
}

/** "+38344123456" → "+383******456" for logs. */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 7) return '***';
  return `+${digits.slice(0, 3)}${'*'.repeat(digits.length - 6)}${digits.slice(-3)}`;
}

/** Development: prints that an SMS would be sent, without its text. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  async send(m: SmsMessage) {
    console.log(`[sms:console] type=${m.tag} to=${maskPhone(m.to)} segments=${smsSegments(m.text)}`);
    return { messageId: `console-${Date.now()}` };
  }
}

/** Tests: keeps messages in memory; can be told to fail. */
export class MemorySmsProvider implements SmsProvider {
  readonly name = 'memory';
  sent: SmsMessage[] = [];
  failNext: SmsSendError[] = [];
  delayMs = 0;
  async send(m: SmsMessage) {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    const failure = this.failNext.shift();
    if (failure) throw failure;
    this.sent.push(m);
    return { messageId: `memory-${this.sent.length}` };
  }
}

let cached: SmsProvider | null | undefined;

/** The provider configured by environment variables, or null when SMS is not set up. */
export function getSmsProvider(): SmsProvider | null {
  if (cached !== undefined) return cached;
  const kind = (process.env.SMS_PROVIDER ?? 'none').trim().toLowerCase() || 'none';
  if (kind === 'console') {
    if (process.env.NODE_ENV === 'production') console.warn('[sms] SMS_PROVIDER is "console": SMS are only logged, not sent.');
    cached = new ConsoleSmsProvider();
  } else {
    cached = null;
  }
  return cached;
}

/**
 * Whether a stored number should get SMS: valid and not positively identified as a landline.
 * Numbers whose type cannot be determined are treated as eligible (most foreign mobiles).
 */
export function isSmsEligible(e164: string): boolean {
  const phone = parsePhone(e164);
  return !!phone && phone.type !== 'FIXED_LINE';
}

// ---------------------------------------------------------------- message length

/**
 * GSM 03.38 alphabet. A text using only these characters is sent as GSM-7 (160 characters per SMS,
 * 153 per part when split); a single other character (e.g. Albanian "ë") switches the whole
 * message to UCS-2 (70 / 67), which roughly doubles the number of parts billed.
 */
const GSM_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM_EXTENDED = '^{}\\[~]|€';

/** Replacements for characters our texts can contain that are not in the GSM-7 alphabet. */
const TO_GSM: Record<string, string> = {
  ë: 'e', Ë: 'E', ç: 'c', á: 'a', â: 'a', ã: 'a', ê: 'e', í: 'i', î: 'i', ó: 'o', ô: 'o', õ: 'o', ú: 'u', û: 'u',
  Á: 'A', À: 'A', Â: 'A', È: 'E', Ê: 'E', Í: 'I', Ó: 'O', Ô: 'O', Ú: 'U', Š: 'S', š: 's', Ž: 'Z', ž: 'z', Č: 'C', č: 'c', Ć: 'C', ć: 'c', Đ: 'D', đ: 'd',
  '–': '-', '—': '-', '‘': "'", '’': "'", '‚': "'", '“': '"', '”': '"', '„': '"', '…': '...', ' ': ' ',
};

/** Rewrites a text into the GSM-7 alphabet where a plain equivalent exists ("Konsultë" → "Konsulte"). */
export function toGsm7(text: string): string {
  return Array.from(text, (ch) => TO_GSM[ch] ?? ch).join('');
}

export function isGsm7(text: string): boolean {
  return Array.from(text).every((ch) => GSM_BASIC.includes(ch) || GSM_EXTENDED.includes(ch));
}

/** Number of SMS parts the text is billed as. */
export function smsSegments(text: string): number {
  if (isGsm7(text)) {
    const units = Array.from(text).reduce((n, ch) => n + (GSM_EXTENDED.includes(ch) ? 2 : 1), 0);
    return units <= 160 ? 1 : Math.ceil(units / 153);
  }
  const units = text.length; // UTF-16 code units
  return units <= 70 ? 1 : Math.ceil(units / 67);
}
