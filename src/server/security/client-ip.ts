/**
 * Visitor IP for rate limiting.
 *
 * Without TRUST_PROXY the socket address is used (headers could be forged by anyone).
 * With TRUST_PROXY=true the app sits behind ONE trusted reverse proxy (Render, Railway, nginx). That
 * proxy APPENDS the address it saw to X-Forwarded-For, so the LAST entry is the real visitor; earlier
 * entries were sent by the client and can be invented ("X-Forwarded-For: 1.2.3.4" to dodge limits).
 * For a chain of several trusted proxies set TRUST_PROXY_HOPS (default 1).
 */
export function clientIp(request: Request, socketAddress: string | undefined, trustProxy: boolean, hops = 1): string {
  if (trustProxy) {
    const chain = (request.headers.get('x-forwarded-for') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const candidate = chain[chain.length - Math.max(1, hops)];
    if (candidate && /^[0-9a-fA-F:.[\]]{2,64}$/.test(candidate)) return candidate;
  }
  return (socketAddress ?? 'unknown').slice(0, 64);
}
