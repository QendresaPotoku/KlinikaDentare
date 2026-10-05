import type { Db } from '../db/client.ts';

/**
 * Queueing notifications. Called INSIDE the appointment transaction, so a notification exists if
 * and only if the appointment change committed. Nothing is sent here.
 */

export type NotificationType = 'confirmation' | 'rescheduled' | 'cancelled' | 'clinic_new_booking' | 'reminder';
export type Channel = 'email' | 'sms';
export type Lang = 'sq' | 'en' | 'de';

/** Snapshot of the event a notification is about. Rendering uses ONLY this. */
export interface NotificationPayload {
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  serviceNames: { sq: string; en: string | null; de: string | null };
  patientName: string;
  startsAt: string;
  endsAt: string;
  /** Rescheduled: the previous time and dentist. */
  previous?: { startsAt: string; endsAt: string; doctorName: string };
  /** Clinic notice only. */
  patientPhone?: string;
  patientEmail?: string | null;
  patientNote?: string | null;
}

export interface QueueInput {
  appointmentId: string;
  eventId: number;
  type: NotificationType;
  channel: Channel;
  recipient: string;
  lang: Lang;
  payload: NotificationPayload;
  scheduledFor?: Date;
  /** Record the message as intentionally not sent (e.g. landline), so staff can see why. */
  skipReason?: string;
}

/** Queues one notification; a second call for the same event/type/channel is a no-op. */
export async function enqueue(tx: Db, n: QueueInput): Promise<void> {
  await tx`
    INSERT INTO notifications (appointment_id, event_id, channel, type, recipient, lang, payload, scheduled_for, dedupe_key, status, skip_reason)
    VALUES (${n.appointmentId}, ${n.eventId}, ${n.channel}, ${n.type}, ${n.recipient}, ${n.lang}, ${tx.json(n.payload as never)},
            ${n.scheduledFor ?? new Date()}, ${`${n.eventId}:${n.type}:${n.channel}`},
            ${n.skipReason ? 'skipped' : 'pending'}, ${n.skipReason ?? null})
    ON CONFLICT (dedupe_key) DO NOTHING
  `;
}

/**
 * Marks pending messages of an appointment as superseded, e.g. a confirmation for 10:00 that has not
 * gone out yet when the appointment is moved to 11:00 or cancelled. Messages already being sent
 * are re-checked by the dispatcher just before sending.
 */
export async function supersedePending(tx: Db, appointmentId: string, types: NotificationType[], reason: string): Promise<void> {
  await tx`
    UPDATE notifications SET status = 'skipped', skip_reason = ${reason}
    WHERE appointment_id = ${appointmentId} AND status = 'pending' AND type = ANY(${types}::text[])
  `;
}
