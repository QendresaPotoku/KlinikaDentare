import type { APIRoute } from 'astro';
import { getSql } from '../../server/db/client.ts';
import { logError } from '../../server/log.ts';
import { checkEnvironment } from '../../server/env-check.ts';

// Runs on the server (not pre-rendered). For hosting health checks: GET /api/health/
//   200 {"ok":true}                      app running, configuration valid, database reachable
//   503 {"ok":false,"reason":"config"}   invalid production configuration (see `npm run check:env`)
//   503 {"ok":false,"reason":"database"} database unreachable
// Nothing else is reported (no versions, hosts or error details).
export const prerender = false;

export const GET: APIRoute = async () => {
  const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  const env = checkEnvironment();
  if (env.production && env.errors.length) {
    return new Response(JSON.stringify({ ok: false, reason: 'config' }), { status: 503, headers });
  }
  try {
    await getSql()`SELECT 1`;
    return new Response(JSON.stringify({ ok: true }), { headers });
  } catch (err) {
    logError('health', err);
    return new Response(JSON.stringify({ ok: false, reason: 'database' }), { status: 503, headers });
  }
};
