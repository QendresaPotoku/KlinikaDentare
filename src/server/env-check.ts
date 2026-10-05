/**
 * Configuration check. In production (NODE_ENV=production) problems are fatal: `npm start` refuses
 * to start, and the health check reports 503. Messages name the variable and the problem, never
 * its value.
 */

export interface EnvReport {
  production: boolean;
  errors: string[];
  warnings: string[];
}

const PLACEHOLDER_SECRETS = /change[-_ ]?me|example|placeholder|your[-_ ]?secret|^secret$|^x+$|^0+$|test-secret|replace/i;
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** "Name <a@b.c>" or "a@b.c" */
function validSender(value: string): boolean {
  const m = /^(.*)<([^<>]+)>\s*$/.exec(value.trim());
  return EMAIL_RE.test(m ? m[2].trim() : value.trim());
}

export function checkEnvironment(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const production = env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];
  const problem = (message: string) => (production ? errors : warnings).push(message);
  const v = (name: string) => env[name]?.trim() ?? '';

  // Database
  const db = v('DATABASE_URL');
  if (!db) errors.push('DATABASE_URL is missing.');
  else {
    try {
      const u = new URL(db);
      if (!['postgres:', 'postgresql:'].includes(u.protocol) || !u.hostname || u.pathname.length < 2) {
        errors.push('DATABASE_URL must look like postgres://user:password@host:5432/database.');
      }
    } catch {
      errors.push('DATABASE_URL is not a valid URL.');
    }
  }

  // Public address
  const site = v('PUBLIC_SITE_URL');
  if (!site) errors.push('PUBLIC_SITE_URL is missing.');
  else {
    try {
      const u = new URL(site);
      if (u.pathname !== '/' || u.search || u.hash) problem('PUBLIC_SITE_URL must be only the address, e.g. https://www.example.com (no path).');
      if (u.protocol !== 'https:') problem('PUBLIC_SITE_URL must use https:// in production.');
      if (['localhost', '127.0.0.1', '0.0.0.0'].includes(u.hostname)) problem('PUBLIC_SITE_URL points to this computer (localhost), not the public domain.');
      if (u.hostname.endsWith('example-klinika.com') || u.hostname.endsWith('example.com')) problem('PUBLIC_SITE_URL is still the example domain.');
    } catch {
      errors.push('PUBLIC_SITE_URL is not a valid URL.');
    }
  }

  // Secret for links and form tokens
  const secret = env.APP_SECRET ?? '';
  if (!secret) errors.push('APP_SECRET is missing. Generate one: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64url\'))"');
  else if (secret.length < 32) errors.push('APP_SECRET is too short (at least 32 characters; 43 from the generator command).');
  else if (PLACEHOLDER_SECRETS.test(secret) || new Set(secret).size < 12) problem('APP_SECRET looks like a placeholder; generate a random one.');

  // Server
  const port = v('PORT');
  if (port && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) errors.push('PORT must be a number between 1 and 65535.');
  const trust = v('TRUST_PROXY');
  if (trust && !['true', 'false'].includes(trust)) errors.push('TRUST_PROXY must be "true" or "false".');
  const hops = v('TRUST_PROXY_HOPS');
  if (hops && (!/^\d+$/.test(hops) || Number(hops) < 1 || Number(hops) > 5)) errors.push('TRUST_PROXY_HOPS must be a number from 1 to 5.');
  const worker = v('NOTIFICATIONS_WORKER');
  if (worker && !['on', 'off'].includes(worker)) errors.push('NOTIFICATIONS_WORKER must be "on" or "off".');
  if (production && worker === 'off') warnings.push('NOTIFICATIONS_WORKER=off: no emails or SMS are sent by this process; make sure another one sends them.');

  // Email
  const provider = (v('EMAIL_PROVIDER') || 'console').toLowerCase();
  if (!['smtp', 'console'].includes(provider)) errors.push('EMAIL_PROVIDER must be "smtp" or "console".');
  if (provider === 'console') problem('EMAIL_PROVIDER is "console": emails would only be logged, never delivered. Use EMAIL_PROVIDER=smtp in production.');
  if (provider === 'smtp') {
    if (!v('SMTP_HOST')) errors.push('SMTP_HOST is missing (EMAIL_PROVIDER=smtp).');
    const smtpPort = v('SMTP_PORT') || '587';
    if (!/^\d+$/.test(smtpPort) || Number(smtpPort) < 1 || Number(smtpPort) > 65535) errors.push('SMTP_PORT must be a port number.');
    const secure = v('SMTP_SECURE');
    if (secure && !['true', 'false'].includes(secure)) errors.push('SMTP_SECURE must be "true" or "false".');
    if (smtpPort === '465' && secure === 'false') warnings.push('SMTP_PORT=465 normally needs SMTP_SECURE=true.');
    if (!!v('SMTP_USER') !== !!(env.SMTP_PASS ?? '')) errors.push('SMTP_USER and SMTP_PASS must both be set (or both left empty for servers without login).');
    if (!v('SMTP_USER')) warnings.push('SMTP_USER is empty: sending without SMTP login.');
    if (!v('EMAIL_FROM')) errors.push('EMAIL_FROM is missing (sender address shown to patients).');
    else if (!validSender(v('EMAIL_FROM'))) errors.push('EMAIL_FROM must be an address, e.g. "Klinika <termine@your-domain.com>".');
    if (v('EMAIL_REPLY_TO') && !validSender(v('EMAIL_REPLY_TO'))) errors.push('EMAIL_REPLY_TO is not a valid address.');
    if (v('SMTP_ALLOW_INSECURE') === 'true') problem('SMTP_ALLOW_INSECURE=true sends email without TLS; only for local test servers.');
  }

  // SMS (patient confirmation and reminder). No real provider is connected yet; see notifications/sms.ts.
  const sms = (v('SMS_PROVIDER') || 'none').toLowerCase();
  if (!['none', 'console'].includes(sms)) errors.push('SMS_PROVIDER must be "none" or "console" (no other provider is connected yet).');
  if (production && sms === 'none') warnings.push('SMS_PROVIDER is not set: patients receive no confirmation or reminder SMS. Keep online booking off until SMS works.');
  if (production && sms === 'console') warnings.push('SMS_PROVIDER is "console": SMS would only be logged, never delivered.');

  return { production, errors, warnings };
}

/** Throws in production when the configuration is not safe to run with. */
export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env): EnvReport {
  const report = checkEnvironment(env);
  if (report.production && report.errors.length) {
    throw new Error(`Invalid production configuration:\n - ${report.errors.join('\n - ')}`);
  }
  return report;
}
