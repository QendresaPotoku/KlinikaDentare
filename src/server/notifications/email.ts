import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Email delivery behind a small interface, so the provider can change without touching booking or
 * notification logic. Selected with EMAIL_PROVIDER: "smtp" (production) or "console" (development).
 */

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** For logs only (never logged: body, patient details). */
  tag: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ messageId?: string }>;
}

/** A failed send. `permanent` = retrying will not help (e.g. the address does not exist). */
export class EmailSendError extends Error {
  readonly permanent: boolean;
  constructor(message: string, permanent: boolean) {
    super(message);
    this.name = 'EmailSendError';
    this.permanent = permanent;
  }
}

/** "lena@example.de" → "l***@example.de" for logs. */
export function maskEmail(address: string): string {
  const [user, domain] = address.split('@');
  return domain ? `${user.slice(0, 1)}***@${domain}` : '***';
}

/** Development: prints that an email would be sent, without its content. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = 'console';
  async send(m: EmailMessage) {
    console.log(`[email:console] type=${m.tag} to=${maskEmail(m.to)} subject="${m.subject}"`);
    return { messageId: `console-${Date.now()}` };
  }
}

/** Tests: keeps messages in memory; can be told to fail. */
export class MemoryEmailProvider implements EmailProvider {
  readonly name = 'memory';
  sent: EmailMessage[] = [];
  failNext: EmailSendError[] = [];
  delayMs = 0;
  async send(m: EmailMessage) {
    if (this.delayMs) await new Promise((r) => setTimeout(r, this.delayMs));
    const failure = this.failNext.shift();
    if (failure) throw failure;
    this.sent.push(m);
    return { messageId: `memory-${this.sent.length}` };
  }
}

export interface SmtpConfig {
  host: string;
  port: number;
  /** true = TLS from the first byte (port 465). false = STARTTLS upgrade, required unless allowInsecure. */
  secure: boolean;
  user?: string;
  pass?: string;
  from: string;
  replyTo?: string;
  allowInsecure?: boolean;
}

/** Production: any SMTP service (the clinic's mail host, Mailgun, SES, Brevo, Postmark…). */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp';
  private transport: Transporter;
  private from: string;
  private replyTo?: string;

  constructor(cfg: SmtpConfig) {
    this.from = cfg.from;
    this.replyTo = cfg.replyTo;
    this.transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      requireTLS: !cfg.secure && !cfg.allowInsecure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass ?? '' } : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 15_000,
      socketTimeout: 30_000,
      tls: { minVersion: 'TLSv1.2' },
    });
  }

  async send(m: EmailMessage) {
    try {
      const info = await this.transport.sendMail({ from: this.from, replyTo: this.replyTo, to: m.to, subject: m.subject, text: m.text, html: m.html });
      return { messageId: info.messageId };
    } catch (err) {
      const e = err as { responseCode?: number; code?: string; message?: string };
      // 5xx answers about the recipient/mailbox are permanent; network, auth and 4xx are worth retrying.
      const permanent = typeof e.responseCode === 'number' && e.responseCode >= 550 && e.responseCode <= 553;
      // Never pass on the raw error object (it can contain the SMTP conversation).
      throw new EmailSendError(`smtp ${e.code ?? ''} ${e.responseCode ?? ''}`.trim(), permanent);
    }
  }
}

let cached: EmailProvider | null = null;

/** The provider configured by environment variables (server-only; nothing here reaches the browser). */
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;
  const kind = (process.env.EMAIL_PROVIDER ?? 'console').trim().toLowerCase();
  if (kind === 'smtp') {
    const host = process.env.SMTP_HOST?.trim();
    const from = process.env.EMAIL_FROM?.trim();
    if (!host || !from) throw new Error('EMAIL_PROVIDER=smtp needs SMTP_HOST and EMAIL_FROM (see .env.example).');
    const port = Number(process.env.SMTP_PORT ?? 587);
    cached = new SmtpEmailProvider({
      host,
      port,
      secure: (process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true',
      user: process.env.SMTP_USER?.trim() || undefined,
      pass: process.env.SMTP_PASS,
      from,
      replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      allowInsecure: process.env.SMTP_ALLOW_INSECURE === 'true',
    });
  } else {
    if (process.env.NODE_ENV === 'production') console.warn('[email] EMAIL_PROVIDER is not "smtp": emails are only logged, not sent.');
    cached = new ConsoleEmailProvider();
  }
  return cached;
}
