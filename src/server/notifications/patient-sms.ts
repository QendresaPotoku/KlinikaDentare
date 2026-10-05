import { DateTime } from 'luxon';
import { CLINIC_TIME_ZONE } from '../config.ts';
import type { Db } from '../db/client.ts';
import { enqueue, type Lang, type NotificationPayload } from './outbox.ts';
import { isSmsEligible } from './sms.ts';

/**
 * The patient's two SMS: a confirmation right after an online booking and a reminder about 24 hours
 * before the appointment. Both are outbox rows written in the appointment transaction; the
 * dispatcher sends them (the reminder when its scheduled_for is reached), so they survive restarts
 * and the database stays the only source of truth.
 *
 * Reminder lifecycle
 *   - scheduled for the same Kosovo wall-clock time on the previous day (23 or 25 hours before
 *     across a DST change), computed in the clinic time zone, never with fixed offsets;
 *   - queued only if that moment is at least REMINDER_MIN_LEAD_MS away, so a booking made less than
 *     about a day ahead gets the confirmation only;
 *   - a reschedule supersedes the pending reminder and queues a new one for the new time (if the
 *     window still allows it); a cancellation supersedes it (outbox.supersedePending);
 *   - just before sending, the dispatcher skips it if the appointment is no longer scheduled, has
 *     moved, or starts within REMINDER_LATEST_BEFORE_START_MS (e.g. after long provider outages).
 */

/** A reminder must lie at least this far in the future when queued (else: confirmation only). */
export const REMINDER_MIN_LEAD_MS = 60 * 60_000;
/** A reminder is no longer sent this close to the appointment. */
export const REMINDER_LATEST_BEFORE_START_MS = 60 * 60_000;

/** When the reminder for an appointment starting at `startsAt` is due: same local time, one day earlier. */
export function reminderTimeFor(startsAt: number): number {
  return DateTime.fromMillis(startsAt, { zone: CLINIC_TIME_ZONE }).minus({ days: 1 }).toMillis();
}

/** The reminder time, or null when the appointment is too close for a separate reminder. */
export function plannedReminder(startsAt: number, now: number): number | null {
  const at = reminderTimeFor(startsAt);
  return at - now >= REMINDER_MIN_LEAD_MS ? at : null;
}

interface PatientSmsInput {
  appointmentId: string;
  eventId: number;
  phone: string;
  lang: Lang;
  payload: NotificationPayload;
  now: number;
}

/** Queues the booking confirmation SMS (online bookings). */
export async function queueConfirmationSms(tx: Db, n: PatientSmsInput): Promise<boolean> {
  const eligible = isSmsEligible(n.phone);
  await enqueue(tx, {
    appointmentId: n.appointmentId,
    eventId: n.eventId,
    type: 'confirmation',
    channel: 'sms',
    recipient: n.phone,
    lang: n.lang,
    payload: n.payload,
    skipReason: eligible ? undefined : 'landline',
  });
  return eligible;
}

/** Queues the 24 h reminder for the appointment's current time, or records why there is none. */
export async function queueReminderSms(tx: Db, n: PatientSmsInput): Promise<void> {
  const at = plannedReminder(new Date(n.payload.startsAt).getTime(), n.now);
  await enqueue(tx, {
    appointmentId: n.appointmentId,
    eventId: n.eventId,
    type: 'reminder',
    channel: 'sms',
    recipient: n.phone,
    lang: n.lang,
    payload: n.payload,
    // A landline row keeps the planned time, so it can be revived if staff correct the number.
    scheduledFor: at === null ? new Date(n.now) : new Date(at),
    skipReason: !isSmsEligible(n.phone) ? 'landline' : at === null ? 'booked_within_reminder_window' : undefined,
  });
}

/**
 * Staff changed the patient's phone number: SMS not yet sent go to the new number, or are skipped
 * if the new number is a landline. A reminder skipped only because the old number was a landline
 * is scheduled again when it is still ahead (the dispatcher's staleness check still applies).
 */
export async function retargetPendingSms(tx: Db, appointmentId: string, phone: string, now: number = Date.now()): Promise<void> {
  if (isSmsEligible(phone)) {
    await tx`UPDATE notifications SET recipient = ${phone}
             WHERE appointment_id = ${appointmentId} AND channel = 'sms' AND status = 'pending'`;
    await tx`
      UPDATE notifications SET status = 'pending', skip_reason = NULL, recipient = ${phone}
      WHERE id = (SELECT id FROM notifications WHERE appointment_id = ${appointmentId} AND channel = 'sms' AND type = 'reminder'
                  ORDER BY created_at DESC, id DESC LIMIT 1)
        AND status = 'skipped' AND skip_reason = 'landline' AND scheduled_for - ${new Date(now)} >= ${`${REMINDER_MIN_LEAD_MS} milliseconds`}::interval`;
  } else {
    await tx`UPDATE notifications SET status = 'skipped', skip_reason = 'landline'
             WHERE appointment_id = ${appointmentId} AND channel = 'sms' AND status = 'pending'`;
  }
}
