/**
 * Error logging without patient data or secrets.
 *
 * Database driver errors carry the SQL text and its parameters (patient names, phones, notes…) as
 * properties; logging the error object would print them. Only the error class, code, constraint and
 * a shortened message are logged (Postgres messages name constraints, not values).
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return typeof err === 'string' ? err.slice(0, 300) : 'unknown error';
  const e = err as Error & { code?: string; constraint_name?: string; severity?: string };
  const parts = [e.name];
  if (e.code) parts.push(`code=${e.code}`);
  if (e.constraint_name) parts.push(`constraint=${e.constraint_name}`);
  // Strip anything that looks like an email address, phone number or patient link from the message.
  const message = e.message
    .replace(/\/termin\/[A-Za-z0-9_-]+/g, '/termin/<token>')
    .replace(/[^\s@]+@[^\s@]+/g, '<email>')
    .replace(/\+?\d[\d\s-]{6,}\d/g, '<number>')
    .slice(0, 300);
  parts.push(message);
  return parts.join(' ');
}

export function logError(where: string, err: unknown): void {
  const stack = err instanceof Error && process.env.NODE_ENV !== 'production' ? `\n${err.stack?.split('\n').slice(1, 6).join('\n')}` : '';
  console.error(`[${where}] ${describeError(err)}${stack}`);
}
