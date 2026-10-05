import { z } from 'astro/zod';
import type { Sql } from '../db/client.ts';
import { staffDaySlots } from '../booking/availability.ts';
import { createStaffAppointment, getAppointment, rescheduleAppointment, type StaffActor } from '../booking/appointments.ts';
import { BookingError } from '../booking/errors.ts';
import { loadDoctor, loadService, loadSettings } from '../booking/repository.ts';
import { phoneCountries } from '../booking/phone.ts';
import { isValidLocalDate } from '../time.ts';
import { explainIssue, type IssueDetail } from '../../admin/strings.ts';
import type { ApiResult } from './booking-api.ts';

/**
 * Admin JSON API (staff only; src/middleware.ts rejects unauthenticated requests).
 * Availability always comes from the booking engine; the admin browser code only displays it.
 */

const ok = (body: unknown, status = 200): ApiResult => ({ status, body });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): ApiResult => ({ status, body: { error, ...extra } });

const STATUS: Record<string, number> = {
  invalid_input: 400,
  invalid_phone: 400,
  in_past: 400,
  not_found: 404,
  working_rules: 409,
  appointment_conflict: 409,
  doctor_unavailable: 409,
  service_unavailable: 409,
  doctor_not_offering_service: 409,
  invalid_status: 409,
  concurrent_change: 409,
};

/** Services that staff can book (active, with at least one active dentist), all dentists, phone countries. */
export async function adminCatalog(sql: Sql): Promise<ApiResult> {
  const services = await sql<{ id: string; name: string; durationMin: number; onlineVisible: boolean; doctorIds: string[] }[]>`
    SELECT s.id, s.name_sq AS name, s.duration_min, s.online_visible,
           array_agg(d.id ORDER BY d.sort_order, d.name) AS doctor_ids
    FROM services s
    JOIN doctor_services ds ON ds.service_id = s.id
    JOIN doctors d ON d.id = ds.doctor_id AND d.active
    WHERE s.active
    GROUP BY s.id
    ORDER BY s.sort_order, s.name_sq
  `;
  const doctors = await sql<{ id: string; name: string; acceptsOnline: boolean; hasSchedule: boolean }[]>`
    SELECT d.id, d.name, d.accepts_online, EXISTS (SELECT 1 FROM weekly_schedules w WHERE w.doctor_id = d.id) AS has_schedule
    FROM doctors d WHERE d.active ORDER BY d.sort_order, d.name
  `;
  const settings = await loadSettings(sql);
  return ok({ services, doctors, countries: phoneCountries(), stepMinutes: settings.slotStepMinutes });
}

const slotsQuery = z.object({
  doctorId: z.uuid(),
  date: z.string(),
  serviceId: z.uuid().optional(),
  /** Rescheduling: use this appointment's own duration and ignore its current time. */
  appointmentId: z.uuid().optional(),
});

export async function adminSlots(sql: Sql, params: URLSearchParams, now: number): Promise<ApiResult> {
  const parsed = slotsQuery.safeParse(Object.fromEntries(params));
  if (!parsed.success || !isValidLocalDate(parsed.data.date) || (!parsed.data.serviceId && !parsed.data.appointmentId)) {
    return fail(400, 'invalid_input');
  }
  const q = parsed.data;
  const doctor = await loadDoctor(sql, q.doctorId);
  if (!doctor || !doctor.active) return fail(409, 'doctor_unavailable');

  let durationMin: number;
  if (q.appointmentId) {
    const appointment = await getAppointment(sql, q.appointmentId);
    if (!appointment) return fail(404, 'not_found');
    durationMin = Math.round((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000);
  } else {
    const service = await loadService(sql, q.serviceId!);
    if (!service || !service.active) return fail(409, 'service_unavailable');
    durationMin = service.durationMin;
  }
  const settings = await loadSettings(sql);
  const result = await staffDaySlots(sql, {
    doctorId: q.doctorId,
    durationMin,
    date: q.date,
    now,
    stepMin: settings.slotStepMinutes,
    excludeAppointmentId: q.appointmentId,
  });
  return ok({
    durationMin,
    working: result.working,
    hasWeeklySchedule: result.hasWeeklySchedule,
    slots: result.slots.map((s) => ({
      startsAt: s.startsAt,
      time: s.time,
      issues: s.issues.map((i) => ({ code: i.code, text: explainIssue(i as IssueDetail, doctor.name) })),
    })),
  });
}

async function explainError(sql: Sql, err: BookingError, doctorId: unknown): Promise<ApiResult> {
  const extra: Record<string, unknown> = {};
  if (err.code === 'working_rules' && Array.isArray(err.details)) {
    const doctor = typeof doctorId === 'string' ? await loadDoctor(sql, doctorId).catch(() => undefined) : undefined;
    extra.issues = (err.details as IssueDetail[]).map((i) => ({ code: i.code, text: explainIssue(i, doctor?.name ?? 'Dentisti') }));
  }
  if (err.code === 'invalid_input' && Array.isArray(err.details)) extra.fields = err.details;
  return fail(STATUS[err.code] ?? 400, err.code, extra);
}

export async function adminCreateAppointment(sql: Sql, body: unknown, actor: StaffActor, now: number): Promise<ApiResult> {
  try {
    const result = await createStaffAppointment(sql, body, actor, { now });
    return ok({ id: result.appointment.id }, 201);
  } catch (err) {
    if (err instanceof BookingError) return explainError(sql, err, (body as { doctorId?: unknown })?.doctorId);
    throw err;
  }
}

export async function adminReschedule(sql: Sql, id: string, body: unknown, actor: StaffActor, now: number): Promise<ApiResult> {
  try {
    const input = { ...(typeof body === 'object' && body ? body : {}), appointmentId: id };
    const result = await rescheduleAppointment(sql, input, actor, { now });
    return ok({ id: result.appointment.id, changed: result.changed });
  } catch (err) {
    if (err instanceof BookingError) {
      const current = await getAppointment(sql, id).catch(() => undefined);
      return explainError(sql, err, (body as { doctorId?: unknown })?.doctorId ?? current?.doctorId);
    }
    throw err;
  }
}
