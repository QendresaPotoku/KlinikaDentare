import { createHash, randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import { enqueue, supersedePending, type NotificationPayload } from '../notifications/outbox.ts';
import { queueConfirmationSms, queueReminderSms, retargetPendingSms } from '../notifications/patient-sms.ts';
import { hashManageToken, manageTokenFor } from '../notifications/manage-link.ts';
import { z } from 'astro/zod';
import type { Db, Sql } from '../db/client.ts';
import { checkStaffTime, isOnlineStartAvailable, loadOnlineContext } from './availability.ts';
import { doctorOffersService, loadDoctor, loadService, loadSettings } from './repository.ts';
import { BookingError, EXCLUSION_VIOLATION, UNIQUE_VIOLATION, pgCode, pgConstraint } from './errors.ts';
import { isCountryCode, isLandline, parsePhone } from './phone.ts';
import { minutes } from '../time.ts';

/**
 * Booking service: every change to an appointment goes through here, for online and staff bookings.
 *
 * Concurrency model
 *   1. Each change runs in one transaction that first locks the affected doctor row(s)
 *      (SELECT … FOR UPDATE). All changes for the same doctor are therefore processed one at a time.
 *   2. Inside the lock, availability is re-checked against fresh data with the same engine that
 *      produced the times shown to the patient. Whatever the browser saw earlier is not trusted.
 *   3. The appointments_no_overlap constraint is the final safety net: if it ever fires, the
 *      request fails with slot_unavailable / appointment_conflict instead of double-booking.
 *   4. Online submissions carry an idempotency key, so a double-click or retried request returns
 *      the existing booking instead of creating a second one.
 */

export type StaffActor = { userId: string | null };

export interface AppointmentView {
  id: string;
  doctorId: string;
  doctorName: string;
  serviceId: string;
  serviceName: string;
  startsAt: Date;
  endsAt: Date;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  source: 'online' | 'staff';
  lang: 'sq' | 'en' | 'de';
  patientName: string;
  patientPhone: string;
  patientEmail: string | null;
  patientNote: string | null;
  staffNote: string | null;
  cancelledAt: Date | null;
  cancelReason: string | null;
  cancelledByType: 'staff' | 'patient' | null;
  createdAt: Date;
  /** Changes on every update; staff forms send it back to detect concurrent edits. */
  updatedAt: Date;
}

// ---------------------------------------------------------------- validation

const langSchema = z.enum(['sq', 'en', 'de']);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));
const startsAtSchema = z.iso.datetime({ offset: true }).transform((v, ctx) => {
  const ms = Date.parse(v);
  if (ms % 60_000 !== 0) {
    ctx.addIssue({ code: 'custom', message: 'start must be a whole minute' });
    return z.NEVER;
  }
  return ms;
});
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.email().nullable());

const patientFields = {
  patientName: z.string().trim().min(2).max(200),
  patientPhone: z.string().trim().min(3).max(32),
  /** Country used when the number has no international prefix (ISO code, e.g. 'XK', 'DE'). */
  phoneCountry: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  patientEmail: emailSchema,
  patientNote: optionalText(2000),
};

export const onlineBookingSchema = z.object({
  doctorId: z.uuid(),
  serviceId: z.uuid(),
  startsAt: startsAtSchema,
  lang: langSchema,
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,100}$/),
  ...patientFields,
});

export const staffBookingSchema = z.object({
  doctorId: z.uuid(),
  serviceId: z.uuid(),
  startsAt: startsAtSchema,
  lang: langSchema.default('sq'),
  staffNote: optionalText(2000),
  /** Staff confirmed booking outside working hours / during time off / on a closed day. */
  allowOutsideWorkingHours: z.boolean().default(false),
  ...patientFields,
});

export const rescheduleSchema = z.object({
  appointmentId: z.uuid(),
  expectedVersion: z.number().int().nonnegative().optional(),
  startsAt: startsAtSchema,
  /** Move to another doctor (must offer the same service). Defaults to the current doctor. */
  doctorId: z.uuid().optional(),
  allowOutsideWorkingHours: z.boolean().default(false),
});

function parse<T extends z.ZodType>(schema: T, raw: unknown): z.output<T> {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new BookingError(
      'invalid_input',
      result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

/**
 * Valid number in E.164. Online bookings additionally reject numbers positively identified as
 * landlines (confirmation and reminder go by SMS); staff may store a landline if it is the only
 * contact (no SMS is sent to it).
 */
function requirePhone(input: string, country: string | undefined, policy: 'online' | 'staff'): string {
  const phone = parsePhone(input, country && isCountryCode(country) ? country : 'XK');
  if (!phone) throw new BookingError('invalid_phone');
  if (policy === 'online' && isLandline(phone)) throw new BookingError('phone_landline');
  return phone.e164;
}

// ---------------------------------------------------------------- helpers

/**
 * The patient's manage-link secret is derived from the appointment id (see notifications/manage-link.ts),
 * so emails sent later can include it; only its hash is stored.
 */
function newManageToken(appointmentId: string, secret?: string): { token: string; hash: string } {
  const token = manageTokenFor(appointmentId, secret ?? config.appSecret);
  return { token, hash: hashManageToken(token) };
}

/** Event snapshot for notifications: what the message will say, fixed at the time of the event. */
async function notificationPayload(tx: Db, appointmentId: string, extra: Partial<NotificationPayload> = {}): Promise<NotificationPayload> {
  const [a] = await tx<
    { doctorId: string; doctorName: string; nameSq: string; nameEn: string | null; nameDe: string | null; snapshot: string; patientName: string; startsAt: Date; endsAt: Date }[]
  >`
    SELECT a.doctor_id, d.name AS doctor_name, s.name_sq, s.name_en, s.name_de, a.service_name_snapshot AS snapshot,
           a.patient_name, a.starts_at, a.ends_at
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id JOIN services s ON s.id = a.service_id
    WHERE a.id = ${appointmentId}`;
  return {
    appointmentId,
    doctorId: a.doctorId,
    doctorName: a.doctorName,
    serviceNames: { sq: a.snapshot || a.nameSq, en: a.nameEn, de: a.nameDe },
    patientName: a.patientName,
    startsAt: a.startsAt.toISOString(),
    endsAt: a.endsAt.toISOString(),
    ...extra,
  };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function getAppointment(db: Db, id: string): Promise<AppointmentView | undefined> {
  const [row] = await db<AppointmentView[]>`
    SELECT a.id, a.doctor_id, d.name AS doctor_name, a.service_id, a.service_name_snapshot AS service_name,
           a.starts_at, a.ends_at, a.status, a.source, a.lang, a.patient_name, a.patient_phone, a.patient_email,
           a.patient_note, a.staff_note, a.cancelled_at, a.cancel_reason, a.cancelled_by_type, a.created_at, a.updated_at
    FROM appointments a JOIN doctors d ON d.id = a.doctor_id
    WHERE a.id = ${id}
  `;
  return row;
}

async function requireAppointment(db: Db, id: string): Promise<AppointmentView> {
  const appointment = await getAppointment(db, id);
  if (!appointment) throw new BookingError('not_found');
  return appointment;
}

/** Locks one appointment row for the rest of the transaction. */
async function lockAppointment(db: Db, id: string, expectedVersion?: number) {
  const [row] = await db<
    { id: string; doctorId: string; status: AppointmentView['status']; startsAt: Date; endsAt: Date; updatedAt: Date }[]
  >`
    SELECT id, doctor_id, status, starts_at, ends_at, updated_at FROM appointments WHERE id = ${id} FOR UPDATE
  `;
  if (!row) throw new BookingError('not_found');
  // Someone else changed the appointment since this staff member loaded it.
  if (expectedVersion !== undefined && row.updatedAt.getTime() !== expectedVersion) throw new BookingError('concurrent_change');
  return row;
}

/** Version token of an appointment as sent by staff forms (updated_at in ms). */
const versionSchema = z.number().int().nonnegative().optional();

/** Translates the database's last-line-of-defence errors into booking errors. */
function rethrowConstraint(err: unknown, overlapCode: 'slot_unavailable' | 'appointment_conflict'): never {
  if (pgCode(err) === EXCLUSION_VIOLATION && pgConstraint(err) === 'appointments_no_overlap') {
    throw new BookingError(overlapCode);
  }
  throw err;
}

// ---------------------------------------------------------------- online booking

export interface OnlineBookingResult {
  appointment: AppointmentView;
  /** Secret for the patient's cancellation link. Only returned when the booking is first created. */
  manageToken: string | null;
  /** True if this was a repeated submit of a booking that already exists. */
  duplicate: boolean;
}

async function findByIdempotencyKey(
  db: Db,
  key: string,
  input: { doctorId: string; serviceId: string; startsAt: number; phone: string },
): Promise<OnlineBookingResult | null> {
  const [row] = await db<{ id: string; doctorId: string; serviceId: string; startsAt: Date; patientPhone: string }[]>`
    SELECT id, doctor_id, service_id, starts_at, patient_phone FROM appointments WHERE idempotency_key = ${key}
  `;
  if (!row) return null;
  const same =
    row.doctorId === input.doctorId &&
    row.serviceId === input.serviceId &&
    row.startsAt.getTime() === input.startsAt &&
    row.patientPhone === input.phone;
  if (!same) throw new BookingError('idempotency_conflict');
  return { appointment: await requireAppointment(db, row.id), manageToken: null, duplicate: true };
}

/** Creates an appointment from the public booking form. */
export async function createOnlineBooking(
  sql: Sql,
  raw: unknown,
  options: { now?: number; secret?: string } = {},
): Promise<OnlineBookingResult> {
  const input = parse(onlineBookingSchema, raw);
  const now = options.now ?? Date.now();
  const phone = requirePhone(input.patientPhone, input.phoneCountry, 'online');
  const key = { doctorId: input.doctorId, serviceId: input.serviceId, startsAt: input.startsAt, phone };

  const existing = await findByIdempotencyKey(sql, input.idempotencyKey, key);
  if (existing) return existing;

  try {
    return await sql.begin(async (tx) => {
      const eligibility = await loadOnlineContext(tx, input.doctorId, input.serviceId, { lockDoctor: true });
      // An identical submit may have committed while this one waited for the doctor lock
      // (double-click): it must get that booking back, not "slot unavailable".
      const raced = await findByIdempotencyKey(tx, input.idempotencyKey, key);
      if (raced) return raced;
      if (!eligibility.ok) throw new BookingError(eligibility.reason);
      const { settings, service } = eligibility.context;
      if (settings.emailRequired && !input.patientEmail) throw new BookingError('email_required');

      if (!(await isOnlineStartAvailable(tx, eligibility.context, input.startsAt, now))) {
        throw new BookingError('slot_unavailable');
      }

      const id = randomUUID();
      const { token, hash } = newManageToken(id, options.secret);
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO appointments ${tx({
          id,
          doctorId: input.doctorId,
          serviceId: service.id,
          serviceNameSnapshot: service.nameSq,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.startsAt + minutes(service.durationMin)),
          source: 'online',
          patientName: input.patientName,
          patientPhone: phone,
          patientEmail: input.patientEmail,
          patientNote: input.patientNote,
          lang: input.lang,
          manageTokenHash: hash,
          idempotencyKey: input.idempotencyKey,
        })}
        RETURNING id
      `;
      const [event] = await tx<{ id: number }[]>`
        INSERT INTO appointment_events (appointment_id, type, actor_type, to_starts_at, to_doctor_id, to_status)
        VALUES (${row.id}, 'created', 'patient', ${new Date(input.startsAt)}, ${input.doctorId}, 'scheduled')
        RETURNING id
      `;
      // Queued in this transaction, sent after commit by the dispatcher. Patients get SMS only
      // (confirmation now, reminder ~24 h before); the clinic gets its internal email notice.
      const payload = await notificationPayload(tx, row.id);
      const sms = { appointmentId: row.id, eventId: event.id, phone, lang: input.lang, payload, now };
      await queueConfirmationSms(tx, sms);
      await queueReminderSms(tx, sms);
      if (settings.clinicNotifyEmail) {
        await enqueue(tx, {
          appointmentId: row.id,
          eventId: event.id,
          type: 'clinic_new_booking',
          channel: 'email',
          recipient: settings.clinicNotifyEmail,
          lang: 'sq',
          payload: { ...payload, patientPhone: phone, patientEmail: input.patientEmail, patientNote: input.patientNote },
        });
      }
      return { appointment: await requireAppointment(tx, row.id), manageToken: token, duplicate: false };
    });
  } catch (err) {
    // Two identical submits raced past the pre-check: return the one that won.
    if (pgCode(err) === UNIQUE_VIOLATION && pgConstraint(err) === 'appointments_idempotency_key_key') {
      const winner = await findByIdempotencyKey(sql, input.idempotencyKey, key);
      if (winner) return winner;
    }
    rethrowConstraint(err, 'slot_unavailable');
  }
}

// ---------------------------------------------------------------- staff booking

export interface StaffBookingResult {
  appointment: AppointmentView;
  manageToken: string;
  /** Working-rule issues the staff member explicitly overrode (empty if none). */
  overriddenIssues: string[];
}

/**
 * Creates an appointment from the admin panel. Online-only rules (minimum notice, booking window,
 * online visibility, "accepts online bookings", start-time grid) do not apply. Working hours, time off
 * and closures can be overridden only with allowOutsideWorkingHours. Overlapping another appointment
 * is never allowed.
 */
export async function createStaffAppointment(
  sql: Sql,
  raw: unknown,
  actor: StaffActor,
  options: { now?: number; secret?: string } = {},
): Promise<StaffBookingResult> {
  const input = parse(staffBookingSchema, raw);
  const now = options.now ?? Date.now();
  const phone = requirePhone(input.patientPhone, input.phoneCountry, 'staff');

  try {
    return await sql.begin(async (tx) => {
      const doctor = await loadDoctor(tx, input.doctorId, { lock: true });
      if (!doctor || !doctor.active) throw new BookingError('doctor_unavailable');
      const service = await loadService(tx, input.serviceId);
      if (!service || !service.active) throw new BookingError('service_unavailable');
      if (!(await doctorOffersService(tx, doctor.id, service.id))) throw new BookingError('doctor_not_offering_service');

      const startsAt = input.startsAt;
      const endsAt = startsAt + minutes(service.durationMin);
      const check = await checkStaffTime(tx, { doctorId: doctor.id, startsAt, endsAt, now });
      if (check.inPast) throw new BookingError('in_past');
      if (check.appointmentConflict) throw new BookingError('appointment_conflict');
      if (check.issues.length > 0 && !input.allowOutsideWorkingHours) throw new BookingError('working_rules', check.details);

      const id = randomUUID();
      const { token, hash } = newManageToken(id, options.secret);
      const [row] = await tx<{ id: string }[]>`
        INSERT INTO appointments ${tx({
          id,
          doctorId: doctor.id,
          serviceId: service.id,
          serviceNameSnapshot: service.nameSq,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
          source: 'staff',
          patientName: input.patientName,
          patientPhone: phone,
          patientEmail: input.patientEmail,
          patientNote: input.patientNote,
          staffNote: input.staffNote,
          lang: input.lang,
          manageTokenHash: hash,
          createdBy: actor.userId,
        })}
        RETURNING id
      `;
      const [event] = await tx<{ id: number }[]>`
        INSERT INTO appointment_events (appointment_id, type, actor_type, actor_user_id, to_starts_at, to_doctor_id, to_status, details)
        VALUES (${row.id}, 'created', 'staff', ${actor.userId}, ${new Date(startsAt)}, ${doctor.id}, 'scheduled',
                ${tx.json({ overriddenIssues: check.issues })})
        RETURNING id
      `;
      // Staff bookings get no confirmation SMS (the patient is usually present or on the phone), only the reminder.
      await queueReminderSms(tx, { appointmentId: row.id, eventId: event.id, phone, lang: input.lang, payload: await notificationPayload(tx, row.id), now });
      return { appointment: await requireAppointment(tx, row.id), manageToken: token, overriddenIssues: check.issues };
    });
  } catch (err) {
    rethrowConstraint(err, 'appointment_conflict');
  }
}

// ---------------------------------------------------------------- rescheduling

export interface RescheduleResult {
  appointment: AppointmentView;
  changed: boolean;
  overriddenIssues: string[];
}

/**
 * Moves a scheduled appointment (staff only in V1). In one transaction: locks both doctors (old and
 * new, in a fixed order so two reschedules cannot deadlock), re-checks the new time while ignoring the
 * appointment itself, then updates it. The old time is released by the same update. The appointment
 * keeps its own duration, even if the service duration has changed since it was booked.
 */
export async function rescheduleAppointment(
  sql: Sql,
  raw: unknown,
  actor: StaffActor,
  options: { now?: number } = {},
): Promise<RescheduleResult> {
  const input = parse(rescheduleSchema, raw);
  const now = options.now ?? Date.now();
  const current = await requireAppointment(sql, input.appointmentId);
  const targetDoctorId = input.doctorId ?? current.doctorId;

  try {
    return await sql.begin(async (tx) => {
      const doctors = new Map<string, Awaited<ReturnType<typeof loadDoctor>>>();
      for (const id of [...new Set([current.doctorId, targetDoctorId])].sort()) {
        doctors.set(id, await loadDoctor(tx, id, { lock: true }));
      }
      const locked = await lockAppointment(tx, input.appointmentId, input.expectedVersion);
      if (locked.doctorId !== current.doctorId) throw new BookingError('concurrent_change');
      if (locked.status !== 'scheduled') throw new BookingError('invalid_status');

      const duration = locked.endsAt.getTime() - locked.startsAt.getTime();
      const startsAt = input.startsAt;
      const endsAt = startsAt + duration;
      if (targetDoctorId === locked.doctorId && startsAt === locked.startsAt.getTime()) {
        return { appointment: await requireAppointment(tx, locked.id), changed: false, overriddenIssues: [] };
      }

      const target = doctors.get(targetDoctorId);
      if (!target || !target.active) throw new BookingError('doctor_unavailable');
      if (targetDoctorId !== locked.doctorId) {
        if (!(await doctorOffersService(tx, targetDoctorId, current.serviceId))) {
          throw new BookingError('doctor_not_offering_service');
        }
      }

      const check = await checkStaffTime(tx, {
        doctorId: targetDoctorId,
        startsAt,
        endsAt,
        now,
        excludeAppointmentId: locked.id,
      });
      if (check.inPast) throw new BookingError('in_past');
      if (check.appointmentConflict) throw new BookingError('appointment_conflict');
      if (check.issues.length > 0 && !input.allowOutsideWorkingHours) throw new BookingError('working_rules', check.details);

      await tx`
        UPDATE appointments
        SET doctor_id = ${targetDoctorId}, starts_at = ${new Date(startsAt)}, ends_at = ${new Date(endsAt)}
        WHERE id = ${locked.id}
      `;
      const [event] = await tx<{ id: number }[]>`
        INSERT INTO appointment_events
          (appointment_id, type, actor_type, actor_user_id, from_starts_at, to_starts_at, from_doctor_id, to_doctor_id, details)
        VALUES (${locked.id}, 'rescheduled', 'staff', ${actor.userId}, ${locked.startsAt}, ${new Date(startsAt)},
                ${locked.doctorId}, ${targetDoctorId}, ${tx.json({ overriddenIssues: check.issues })})
        RETURNING id
      `;
      // Anything not yet sent about the old time is obsolete; the reminder is planned again for the new time.
      await supersedePending(tx, locked.id, ['confirmation', 'rescheduled', 'reminder'], 'superseded_by_reschedule');
      const after = await requireAppointment(tx, locked.id);
      await queueReminderSms(tx, { appointmentId: locked.id, eventId: event.id, phone: after.patientPhone, lang: after.lang, payload: await notificationPayload(tx, locked.id), now });
      return { appointment: after, changed: true, overriddenIssues: check.issues };
    });
  } catch (err) {
    rethrowConstraint(err, 'appointment_conflict');
  }
}

// ---------------------------------------------------------------- cancellation and status

async function cancelLocked(
  tx: Db,
  id: string,
  by: { type: 'staff'; userId: string | null } | { type: 'patient' },
  reason: string | null,
): Promise<AppointmentView> {
  const userId = by.type === 'staff' ? by.userId : null;
  await tx`
    UPDATE appointments
    SET status = 'cancelled', cancelled_at = now(), cancelled_by_type = ${by.type}, cancelled_by = ${userId},
        cancel_reason = ${reason}
    WHERE id = ${id}
  `;
  await tx`
    INSERT INTO appointment_events (appointment_id, type, actor_type, actor_user_id, from_status, to_status, details)
    VALUES (${id}, 'cancelled', ${by.type}, ${userId}, 'scheduled', 'cancelled', ${tx.json({ reason })})
  `;
  // A confirmation or reminder still waiting must not arrive after the cancellation.
  await supersedePending(tx, id, ['confirmation', 'rescheduled', 'reminder', 'clinic_new_booking'], 'superseded_by_cancellation');
  return requireAppointment(tx, id);
}

/** Cancels a scheduled appointment from the admin panel. The time becomes free immediately. */
export async function cancelAppointmentByStaff(
  sql: Sql,
  raw: unknown,
  actor: StaffActor,
): Promise<AppointmentView> {
  const input = parse(z.object({ appointmentId: z.uuid(), reason: optionalText(500), expectedVersion: versionSchema }), raw);
  return sql.begin(async (tx) => {
    const locked = await lockAppointment(tx, input.appointmentId, input.expectedVersion);
    if (locked.status !== 'scheduled') throw new BookingError('invalid_status');
    return cancelLocked(tx, locked.id, { type: 'staff', userId: actor.userId }, input.reason);
  });
}

export interface ManagedAppointment {
  appointment: AppointmentView;
  /** Whether the patient can still cancel online (scheduled, in the future, before the deadline). */
  canCancel: boolean;
  /** Last moment the patient can cancel online. */
  cancelDeadline: Date;
}

/** Looks up an appointment by the secret from the patient's link. */
export async function getByManageToken(
  db: Db,
  token: string,
  options: { now?: number } = {},
): Promise<ManagedAppointment | undefined> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return undefined;
  const [row] = await db<{ id: string }[]>`SELECT id FROM appointments WHERE manage_token_hash = ${hashToken(token)}`;
  if (!row) return undefined;
  const appointment = await requireAppointment(db, row.id);
  const settings = await loadSettings(db);
  const now = options.now ?? Date.now();
  const cancelDeadline = new Date(appointment.startsAt.getTime() - settings.cancelDeadlineHours * 3_600_000);
  return {
    appointment,
    canCancel: appointment.status === 'scheduled' && now <= cancelDeadline.getTime() && now < appointment.startsAt.getTime(),
    cancelDeadline,
  };
}

/** Patient cancels through their link, only before the cancellation deadline. */
export async function cancelAppointmentByPatient(
  sql: Sql,
  token: string,
  options: { now?: number } = {},
): Promise<AppointmentView> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw new BookingError('not_found');
  const now = options.now ?? Date.now();
  return sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`SELECT id FROM appointments WHERE manage_token_hash = ${hashToken(token)}`;
    if (!row) throw new BookingError('not_found');
    const locked = await lockAppointment(tx, row.id);
    if (locked.status !== 'scheduled') throw new BookingError('invalid_status');
    const settings = await loadSettings(tx);
    const deadline = locked.startsAt.getTime() - settings.cancelDeadlineHours * 3_600_000;
    if (now > deadline || now >= locked.startsAt.getTime()) throw new BookingError('cancel_deadline_passed');
    return cancelLocked(tx, locked.id, { type: 'patient' }, null);
  });
}

/**
 * Marks an appointment completed / no-show, or corrects it back to scheduled.
 * completed and no_show are only possible once the appointment has started. Cancelled is final:
 * a cancelled appointment cannot be revived (book a new one instead).
 */
export async function setAppointmentStatus(
  sql: Sql,
  raw: unknown,
  actor: StaffActor,
  options: { now?: number } = {},
): Promise<AppointmentView> {
  const input = parse(
    z.object({ appointmentId: z.uuid(), status: z.enum(['scheduled', 'completed', 'no_show']), expectedVersion: versionSchema }),
    raw,
  );
  const now = options.now ?? Date.now();
  return sql.begin(async (tx) => {
    const locked = await lockAppointment(tx, input.appointmentId, input.expectedVersion);
    if (locked.status === 'cancelled' || locked.status === input.status) throw new BookingError('invalid_status');
    if (input.status !== 'scheduled' && locked.startsAt.getTime() > now) throw new BookingError('invalid_status');
    await tx`UPDATE appointments SET status = ${input.status} WHERE id = ${locked.id}`;
    await tx`
      INSERT INTO appointment_events (appointment_id, type, actor_type, actor_user_id, from_status, to_status)
      VALUES (${locked.id}, 'status_changed', 'staff', ${actor.userId}, ${locked.status}, ${input.status})
    `;
    return requireAppointment(tx, locked.id);
  });
}

// ---------------------------------------------------------------- staff edits

export const editDetailsSchema = z.object({
  appointmentId: z.uuid(),
  expectedVersion: versionSchema,
  /** Contact fields: all three are sent together when editing contact information. */
  contact: z
    .object({
      patientName: patientFields.patientName,
      patientPhone: patientFields.patientPhone,
      phoneCountry: patientFields.phoneCountry,
      patientEmail: emailSchema,
    })
    .optional(),
  /** Internal note (visible to staff only). Empty string clears it. */
  staffNote: z.string().trim().max(2000).optional(),
});

/**
 * Edits patient contact details and/or the internal staff note. Allowed for every status (fixing
 * history is fine). Records which fields changed, not their values, in the appointment history.
 */
export async function updateAppointmentDetails(sql: Sql, raw: unknown, actor: StaffActor): Promise<AppointmentView> {
  const input = parse(editDetailsSchema, raw);
  const phone = input.contact ? requirePhone(input.contact.patientPhone, input.contact.phoneCountry, 'staff') : null;
  return sql.begin(async (tx) => {
    const locked = await lockAppointment(tx, input.appointmentId, input.expectedVersion);
    const before = await requireAppointment(tx, locked.id);
    const changes: Record<string, unknown> = {};
    if (input.contact) {
      if (input.contact.patientName !== before.patientName) changes.patientName = input.contact.patientName;
      if (phone !== before.patientPhone) changes.patientPhone = phone;
      if (input.contact.patientEmail !== before.patientEmail) changes.patientEmail = input.contact.patientEmail;
    }
    if (input.staffNote !== undefined) {
      const note = input.staffNote || null;
      if (note !== before.staffNote) changes.staffNote = note;
    }
    const fields = Object.keys(changes);
    if (fields.length === 0) return before;
    await tx`UPDATE appointments SET ${tx(changes)} WHERE id = ${locked.id}`;
    if (changes.patientPhone) await retargetPendingSms(tx, locked.id, phone!);
    await tx`
      INSERT INTO appointment_events (appointment_id, type, actor_type, actor_user_id, details)
      VALUES (${locked.id}, 'edited', 'staff', ${actor.userId}, ${tx.json({ fields })})
    `;
    return requireAppointment(tx, locked.id);
  });
}
