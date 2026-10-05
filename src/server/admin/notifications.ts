import type { Db } from '../db/client.ts';
import { clinicDate, clinicTime, formatDateLong } from '../../admin/strings.ts';

/**
 * Patient notification status on the admin appointment page: the confirmation SMS and the reminder
 * SMS (and patient emails sent before the switch to SMS). The clinic's own notice is not listed.
 */

export interface PatientNotification {
  id: string;
  channel: 'email' | 'sms';
  type: string;
  status: string;
  failureKind: string | null;
  skipReason: string | null;
  attempts: number;
  recipient: string;
  scheduledFor: Date;
  sentAt: Date | null;
  createdAt: Date;
}

export type NotificationStateName = 'scheduled' | 'pending' | 'sent' | 'failed' | 'skipped';

export async function loadPatientNotifications(db: Db, appointmentId: string): Promise<PatientNotification[]> {
  return db<PatientNotification[]>`
    SELECT id, channel, type, status, failure_kind, skip_reason, attempts, recipient, scheduled_for, sent_at, created_at
    FROM notifications
    WHERE appointment_id = ${appointmentId} AND type <> 'clinic_new_booking'
      -- old patient emails retired by the switch to SMS are noise for staff
      AND NOT (channel = 'email' AND status = 'skipped' AND skip_reason = 'patient_email_disabled')
    -- rows from the same transaction: SMS before email, confirmation before reminder
    ORDER BY created_at, channel DESC, type, id`;
}

const LABEL: Record<string, string> = {
  'sms:confirmation': 'SMS: konfirmimi i rezervimit',
  'sms:reminder': 'SMS: kujtesa (një ditë para)',
  'email:confirmation': 'Email: konfirmimi i rezervimit',
  'email:rescheduled': 'Email: njoftimi për ndryshimin',
  'email:cancelled': 'Email: njoftimi për anulimin',
};

export const notificationLabel = (n: Pick<PatientNotification, 'channel' | 'type'>) => LABEL[`${n.channel}:${n.type}`] ?? n.type;

const SKIP_TEXT: Record<string, string> = {
  landline: 'Nuk dërgohet: numri është telefon fiks.',
  booked_within_reminder_window: 'Pa kujtesë: termini u caktua më pak se një ditë përpara.',
  sms_not_configured: 'Nuk u dërgua: SMS-i nuk është konfiguruar ende në server.',
  reminder_too_late: 'Nuk u dërgua: ishte tepër vonë para terminit.',
  appointment_started: 'Nuk u dërgua: termini kishte filluar.',
  appointment_no_longer_scheduled: 'Nuk u dërgua: termini nuk është më i planifikuar.',
  patient_email_disabled: 'Nuk u dërgua: pacientët nuk marrin më email.',
};

const at = (d: Date) => `${clinicTime(d)}, ${formatDateLong(clinicDate(d)).replace(/^[^,]+,\s*/, '')}`;

/** Plain words for staff; technical details stay in the database/logs. */
export function notificationState(
  n: PatientNotification,
  now: number = Date.now(),
): { state: NotificationStateName; text: string; tone: 'ok' | 'off' | 'warn' | 'scheduled' } {
  if (n.status === 'sent') return { state: 'sent', text: `Dërguar ${n.sentAt ? `më ${at(n.sentAt)}` : ''}`, tone: 'ok' };
  if (n.status === 'failed') {
    const permanent = n.channel === 'sms' ? 'Dështoi: numri nuk e pranoi SMS-in. Kontrolloni numrin.' : 'Dështoi: adresa e email-it nuk e pranoi mesazhin. Kontrolloni adresën.';
    return { state: 'failed', text: n.failureKind === 'permanent' ? permanent : 'Dështoi: dërgimi nuk u krye pas disa përpjekjesh.', tone: 'warn' };
  }
  if (n.status === 'skipped') {
    const text =
      (n.skipReason && SKIP_TEXT[n.skipReason]) ??
      (n.skipReason?.includes('cancel') ? 'Nuk u dërgua: termini u anulua para dërgimit.' : 'Nuk u dërgua: u zëvendësua nga një ndryshim i mëvonshëm.');
    return { state: 'skipped', text, tone: 'off' };
  }
  if (n.attempts > 0) return { state: 'pending', text: 'Në pritje: do të provohet përsëri pas pak.', tone: 'scheduled' };
  if (n.scheduledFor.getTime() > now + 60_000) return { state: 'scheduled', text: `E planifikuar: ${at(n.scheduledFor)}`, tone: 'scheduled' };
  return { state: 'pending', text: 'Në pritje të dërgimit…', tone: 'scheduled' };
}
