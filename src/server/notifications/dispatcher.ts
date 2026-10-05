import { randomUUID } from 'node:crypto';
import type { Sql } from '../db/client.ts';
import { config } from '../config.ts';
import { EmailSendError, getEmailProvider, maskEmail, type EmailProvider } from './email.ts';
import { getSmsProvider, maskPhone, SmsSendError, type SmsProvider } from './sms.ts';
import { manageTokenFor, manageUrl } from './manage-link.ts';
import { renderClinicNotice } from './templates.ts';
import { renderPatientSms } from './sms-templates.ts';
import { REMINDER_LATEST_BEFORE_START_MS } from './patient-sms.ts';
import type { Lang, NotificationPayload, NotificationType } from './outbox.ts';
import { describeError, logError } from '../log.ts';

/**
 * Sends queued notifications. Runs outside any appointment transaction, so a slow or failing email
 * or SMS service never affects bookings.
 *
 * Channels: patients get SMS only (confirmation, 24 h reminder); email is used for the clinic's
 * internal notice about new online bookings. Patient email rows (from before the switch to SMS) are
 * skipped, never sent.
 *
 *   1. CLAIM: a short transaction picks due rows with FOR UPDATE SKIP LOCKED and marks them
 *      'sending' with a random claim token and a lease. Two dispatchers never get the same row;
 *      a crashed dispatcher's rows become claimable again when the lease expires.
 *   2. CHECK: just before sending, the message must still describe the appointment (a confirmation
 *      for 10:00 is skipped if the appointment is now at 11:00 or cancelled).
 *   3. SEND through the provider, then record the result only if our claim is still current.
 */

const LEASE_MS = 10 * 60_000;
/** Delay before attempt n+1 after n failures: 1 min, 5 min, 30 min, 2 h, 6 h. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3_600_000, 6 * 3_600_000];

export interface DispatchOptions {
  now?: number;
  limit?: number;
  email?: EmailProvider;
  sms?: SmsProvider | null;
  siteUrl?: string;
  secret?: string;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  retrying: number;
  skipped: number;
}

interface ClaimedRow {
  id: string;
  appointmentId: string | null;
  channel: 'email' | 'sms';
  type: NotificationType;
  recipient: string;
  lang: Lang;
  payload: NotificationPayload;
  attempts: number;
  maxAttempts: number;
  claimToken: string;
}

async function claim(sql: Sql, now: Date, limit: number): Promise<ClaimedRow[]> {
  const token = randomUUID();
  return sql.begin(async (tx) => {
    return tx<ClaimedRow[]>`
      UPDATE notifications SET status = 'sending', claim_token = ${token}, locked_until = ${new Date(now.getTime() + LEASE_MS)},
             attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM notifications
        WHERE (status = 'pending' AND scheduled_for <= ${now}) OR (status = 'sending' AND locked_until < ${now})
        ORDER BY scheduled_for
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, appointment_id, channel, type, recipient, lang, payload, attempts, max_attempts, claim_token
    `;
  });
}

/** Why a queued message should no longer be sent, or null if it is still accurate. */
async function staleReason(sql: Sql, n: ClaimedRow, now: Date): Promise<string | null> {
  if (!n.appointmentId) return null;
  const [a] = await sql<{ status: string; startsAt: Date; doctorId: string }[]>`
    SELECT status, starts_at, doctor_id FROM appointments WHERE id = ${n.appointmentId}`;
  if (!a) return 'appointment_missing';
  const sameTime = a.startsAt.toISOString() === new Date(n.payload.startsAt).toISOString() && a.doctorId === n.payload.doctorId;
  switch (n.type) {
    case 'confirmation':
    case 'rescheduled':
    case 'reminder':
      if (a.status !== 'scheduled') return 'appointment_no_longer_scheduled';
      if (!sameTime) return 'superseded_by_reschedule';
      if (n.type === 'reminder' && a.startsAt.getTime() - now.getTime() < REMINDER_LATEST_BEFORE_START_MS) return 'reminder_too_late';
      if (a.startsAt.getTime() <= now.getTime()) return 'appointment_started';
      return null;
    case 'clinic_new_booking':
      return a.status === 'cancelled' ? 'appointment_cancelled' : null;
    case 'cancelled':
      return a.status === 'cancelled' ? null : 'appointment_not_cancelled';
  }
}

async function finish(sql: Sql, n: ClaimedRow, values: Record<string, unknown>) {
  // Only the dispatcher holding the current claim may record the outcome.
  await sql`UPDATE notifications SET ${sql(values)}, claim_token = NULL, locked_until = NULL
            WHERE id = ${n.id} AND claim_token = ${n.claimToken}`;
}

export async function dispatchDue(sql: Sql, options: DispatchOptions = {}): Promise<DispatchResult> {
  const now = new Date(options.now ?? Date.now());
  const result: DispatchResult = { sent: 0, failed: 0, retrying: 0, skipped: 0 };
  const rows = await claim(sql, now, options.limit ?? 20);

  for (const n of rows) {
    try {
      const stale = n.channel === 'email' && n.type !== 'clinic_new_booking' ? 'patient_email_disabled' : await staleReason(sql, n, now);
      if (stale) {
        await finish(sql, n, { status: 'skipped', skipReason: stale });
        result.skipped++;
        continue;
      }

      let providerName: string;
      let messageId: string | undefined;
      if (n.channel === 'email') {
        // Only the clinic notice reaches this point (see the staleness line above).
        const provider = options.email ?? getEmailProvider();
        const siteUrl = options.siteUrl ?? config.siteUrl;
        const rendered = renderClinicNotice(n.payload, { siteUrl, adminUrl: `${siteUrl}/admin/appointments/${n.payload.appointmentId}/` });
        providerName = provider.name;
        messageId = (await provider.send({ to: n.recipient, ...rendered, tag: n.type })).messageId;
      } else {
        const provider = options.sms === undefined ? getSmsProvider() : options.sms;
        if (!provider || (n.type !== 'confirmation' && n.type !== 'reminder')) {
          await finish(sql, n, { status: 'skipped', skipReason: provider ? 'no_sms_template' : 'sms_not_configured' });
          result.skipped++;
          continue;
        }
        // The cancellation link is rebuilt from APP_SECRET at send time; it is never stored or logged.
        const siteUrl = options.siteUrl ?? config.siteUrl;
        const text = renderPatientSms(n.type, n.lang, n.payload, {
          manageUrl: n.type === 'confirmation' ? manageUrl(siteUrl, n.lang, manageTokenFor(n.payload.appointmentId, options.secret ?? config.appSecret)) : undefined,
        });
        providerName = provider.name;
        messageId = (await provider.send({ to: n.recipient, text, tag: n.type, reference: n.id })).messageId;
      }
      await finish(sql, n, { status: 'sent', sentAt: new Date(), provider: providerName, providerMessageId: messageId ?? null, lastError: null, failureKind: null });
      result.sent++;
    } catch (err) {
      const permanent = (err instanceof EmailSendError || err instanceof SmsSendError) && err.permanent;
      // Scrubbed: a provider error must not carry a phone number or address into logs or the database.
      const message = describeError(err);
      if (permanent || n.attempts >= n.maxAttempts) {
        await finish(sql, n, { status: 'failed', lastError: message, failureKind: permanent ? 'permanent' : 'temporary' });
        result.failed++;
      } else {
        const delay = BACKOFF_MS[Math.min(n.attempts - 1, BACKOFF_MS.length - 1)];
        await finish(sql, n, { status: 'pending', lastError: message, failureKind: 'temporary', scheduledFor: new Date(now.getTime() + delay) });
        result.retrying++;
      }
      console.warn(`[notifications] ${n.channel} ${n.type} to ${n.channel === 'email' ? maskEmail(n.recipient) : maskPhone(n.recipient)} failed (attempt ${n.attempts}): ${message}`);
    }
  }
  return result;
}

/** Staff action: send a failed notification again (counts restart; the stale check still applies). */
export async function retryNotification(sql: Sql, id: string): Promise<boolean> {
  const res = await sql`
    UPDATE notifications SET status = 'pending', attempts = 0, scheduled_for = now(), failure_kind = NULL
    WHERE id = ${id} AND status = 'failed'`;
  return res.count > 0;
}

// ---------------------------------------------------------------- in-process worker

interface WorkerState {
  timer?: ReturnType<typeof setInterval>;
  running: boolean;
  again: boolean;
  stopping: boolean;
  current?: Promise<void>;
}
const g = globalThis as typeof globalThis & { __klinikaNotify?: WorkerState };
const workerState = () => (g.__klinikaNotify ??= { running: false, again: false, stopping: false });

async function runOnce(sql: Sql) {
  const state = workerState();
  if (state.stopping) return;
  if (state.running) {
    state.again = true;
    return;
  }
  state.running = true;
  const work = (async () => {
    try {
      do {
        state.again = false;
        const r = await dispatchDue(sql);
        if (r.sent + r.failed + r.retrying + r.skipped === 20) state.again = true; // more may be waiting
      } while (state.again && !state.stopping);
    } catch (err) {
      logError('notifications/dispatcher', err);
    } finally {
      state.running = false;
    }
  })();
  state.current = work;
  await work;
}

/** Ask for queued messages to be sent soon, without delaying the caller (call after commit). */
export function requestDispatch(sql: Sql): void {
  if (process.env.NOTIFICATIONS_WORKER === 'off') return;
  setTimeout(() => void runOnce(sql), 0);
}

/**
 * Starts the periodic sweep (every 60 s) that sends retries and anything a request did not trigger.
 * Safe with several server instances (claims use SKIP LOCKED). Disable with NOTIFICATIONS_WORKER=off.
 * On SIGTERM/SIGINT (redeploys) the worker stops taking new messages, lets the current send finish
 * (max. 10 s), closes the database pool and exits. A message interrupted mid-send is picked up again
 * by the next process when its lease expires.
 */
export function startNotificationWorker(sql: Sql): void {
  if (process.env.NOTIFICATIONS_WORKER === 'off') return;
  const state = workerState();
  if (state.timer || state.stopping) return;
  state.timer = setInterval(() => void runOnce(sql), 60_000);
  state.timer.unref?.();
  for (const signal of ['SIGTERM', 'SIGINT'] as const) process.once(signal, () => void shutdown(sql, signal));
  void runOnce(sql);
}

async function shutdown(sql: Sql, signal: string) {
  const state = workerState();
  if (state.stopping) return;
  state.stopping = true;
  if (state.timer) clearInterval(state.timer);
  console.log(`[server] ${signal} received: finishing current work and shutting down.`);
  const timeout = new Promise((resolve) => setTimeout(resolve, 10_000).unref());
  await Promise.race([state.current ?? Promise.resolve(), timeout]);
  await sql.end({ timeout: 5 }).catch(() => {});
  process.exit(0);
}
