import type { APIContext } from 'astro';
import { config } from '../config.ts';
import { clientIp } from '../security/client-ip.ts';
import type { ApiResult, RequestContext } from './booking-api.ts';
import { logError } from '../log.ts';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(result: ApiResult): Response {
  return new Response(JSON.stringify(result.body), { status: result.status, headers: JSON_HEADERS });
}

export function requestContext(context: APIContext): RequestContext {
  let socket: string | undefined;
  try {
    socket = context.clientAddress;
  } catch {
    socket = undefined;
  }
  return {
    now: Date.now(),
    ip: clientIp(context.request, socket, config.trustProxy, config.trustProxyHops),
    secret: config.appSecret,
  };
}

const MAX_BODY_BYTES = 16 * 1024;

/** Parses a JSON request body; undefined if it is missing, too large, not JSON or not JSON-typed. */
export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return undefined;
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return undefined;
  // Read at most MAX_BODY_BYTES, even if Content-Length was missing or wrong.
  const reader = request.body?.getReader();
  if (!reader) return undefined;
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return undefined;
    }
    chunks.push(value);
  }
  const text = new TextDecoder().decode(Buffer.concat(chunks));
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Wraps a handler so unexpected errors become a generic 500 without leaking details. */
export async function guarded(name: string, run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (err) {
    logError(name, err);
    return json({ status: 500, body: { error: 'server_error' } });
  }
}
