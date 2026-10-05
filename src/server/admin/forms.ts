import { ConfigError } from './config.ts';
import type { AttentionItem } from './attention.ts';
import { logError } from '../log.ts';

/**
 * Small helpers for the server-rendered configuration forms (POST → save → redirect, or re-render
 * the form with field errors / a conflict warning / a "changed by someone else" message).
 */

export interface FormState {
  fields: Record<string, string>;
  conflicts: AttentionItem[];
  message: string | null;
  stale: boolean;
}

export const emptyState = (): FormState => ({ fields: {}, conflicts: [], message: null, stale: false });

export const str = (form: FormData, key: string) => String(form.get(key) ?? '');
export const bool = (form: FormData, key: string) => form.get(key) === 'on' || form.get(key) === 'yes' || form.get(key) === '1';
export const list = (form: FormData, key: string) => form.getAll(key).map(String);

export function versionOf(form: FormData): number | undefined {
  const v = Number(form.get('version'));
  return Number.isFinite(v) && v > 0 ? v : undefined;
}

/** Acknowledged conflicts: only when the confirmation box was ticked. */
export function acknowledgedOf(form: FormData): string[] {
  return form.get('ackConfirm') === 'yes' ? list(form, 'ack') : [];
}

export function json<T>(form: FormData, key: string, fallback: T): T {
  try {
    return JSON.parse(str(form, key)) as T;
  } catch {
    return fallback;
  }
}

export const STALE_MESSAGE =
  'Ky informacion u ndryshua nga një anëtar tjetër i stafit. Më poshtë shihet versioni më i ri; kontrollojeni para se të ruani përsëri.';

/** Turns a failed save into what the page should show. Unknown errors are logged and shown generically. */
export function stateFromError(err: unknown, where: string): FormState {
  const state = emptyState();
  if (err instanceof ConfigError) {
    switch (err.code) {
      case 'invalid':
      case 'email_taken':
        state.fields = err.fields;
        state.message = 'Kontrolloni fushat e shënuara.';
        break;
      case 'conflicts':
        state.conflicts = err.conflicts;
        break;
      case 'stale':
        state.stale = true;
        state.message = STALE_MESSAGE;
        break;
      case 'not_found':
        state.message = 'Ky element nuk ekziston më.';
        break;
      case 'in_use':
        state.message = 'Nuk mund të fshihet sepse ka termine në historik. Çaktivizojeni në vend të fshirjes.';
        break;
      case 'last_active':
        state.message = 'Duhet të mbetet të paktën një llogari aktive e stafit.';
        break;
      case 'self':
        state.message = 'Nuk mund ta çaktivizoni llogarinë tuaj.';
        break;
      case 'exists':
        state.fields = { dates: `Për këtë datë ekziston tashmë një hyrje (${err.fields.dates}). Ndryshojeni atë.` };
        state.message = state.fields.dates;
        break;
    }
    return state;
  }
  logError(`admin/${where}`, err);
  state.message = 'Ruajtja nuk u krye për shkak të një gabimi. Provoni përsëri pas pak.';
  return state;
}

/** "2 termine ekzistuese…" with correct singular/plural. */
export function countLabel(n: number, one: string, many: string): string {
  return n === 1 ? `1 ${one}` : `${n} ${many}`;
}
