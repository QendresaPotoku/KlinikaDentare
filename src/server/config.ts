/**
 * Server-side configuration. Read from environment variables at runtime (never at build time),
 * so the same build can run locally and in production. See .env.example.
 */

/** IANA time zone for Kosovo. All clinic wall-clock times (schedules, special hours) are in this zone. */
export const CLINIC_TIME_ZONE = 'Europe/Belgrade';

// Local development: read .env into process.env (Astro's dev server only exposes it to
// import.meta.env). Variables already set by the environment always win, so in production the
// hosting provider's settings are used and no .env file is needed.
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env file: rely on the real environment */
}

export class ConfigError extends Error {}

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) throw new ConfigError(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const config = {
  get databaseUrl() {
    return requireEnv('DATABASE_URL');
  },
  /** Public base URL of the site, used for links in emails (e.g. https://www.klinika.com). */
  get siteUrl() {
    return requireEnv('PUBLIC_SITE_URL').replace(/\/+$/, '');
  },
  /** Secret for signing short-lived tokens (booking-form token). At least 32 characters. */
  get appSecret() {
    const value = requireEnv('APP_SECRET');
    if (value.length < 32) throw new ConfigError('APP_SECRET must be at least 32 characters.');
    return value;
  },
  /**
   * Set TRUST_PROXY=true when the app runs behind a reverse proxy / load balancer (Render, Railway,
   * nginx) so the visitor IP is read from X-Forwarded-For. Leave it off when the Node server is
   * reached directly, otherwise visitors could fake their IP for rate limiting.
   */
  get trustProxy() {
    return readEnv('TRUST_PROXY') === 'true';
  },
  /** Number of trusted proxies in front of the app (X-Forwarded-For entries to skip from the right). */
  get trustProxyHops() {
    const n = Number(readEnv('TRUST_PROXY_HOPS') ?? 1);
    return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 1;
  },
};
