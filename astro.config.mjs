import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Local development reads .env; on the host the build gets the real environment.
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env file */
}

/**
 * The public address of the site, e.g. https://www.klinika-example.com (PUBLIC_SITE_URL, needed at
 * BUILD time). It is used for:
 *  - canonical / hreflang URLs of every page,
 *  - security.allowedDomains: behind an HTTPS proxy (Render, Railway, nginx) the Node server itself
 *    receives plain HTTP. Astro then trusts X-Forwarded-Proto/Host ONLY for this exact domain, so the
 *    request is seen as https://<domain> and form posts (staff login, admin forms, patient
 *    cancellation) pass Astro's origin check. Forwarded headers naming any other host are ignored.
 */
const PLACEHOLDER_SITE = 'https://www.example-klinika.com';
let siteUrl = PLACEHOLDER_SITE;
try {
  siteUrl = new URL(process.env.PUBLIC_SITE_URL ?? PLACEHOLDER_SITE).origin;
} catch {
  console.warn('[config] PUBLIC_SITE_URL is not a valid URL; using the placeholder site address.');
}
const site = new URL(siteUrl);
const isLocal = ['localhost', '127.0.0.1'].includes(site.hostname);

export default defineConfig({
  site: siteUrl,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Pages stay pre-rendered (static) by default. Only routes that opt out with
  // `export const prerender = false` (booking API, admin panel) run on the Node server.
  // Standalone mode produces a plain Node server (dist/server/entry.mjs), so the site can be
  // deployed to any Node host (Render, Railway, a VPS) without provider-specific code.
  adapter: node({ mode: 'standalone' }),
  security: {
    checkOrigin: true,
    allowedDomains: isLocal ? [] : [{ hostname: site.hostname, protocol: site.protocol.replace(':', '') }],
  },
  // The project lives in a OneDrive folder, where file-change events are unreliable on Windows;
  // polling makes the dev server pick up every edit.
  vite: { server: { watch: { usePolling: true, interval: 300 } } },
});
