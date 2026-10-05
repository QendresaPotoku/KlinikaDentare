import type { Db } from '../db/client.ts';
import type { Interval } from './intervals.ts';
import type { DayContext, DayOverride, MinutePeriod, TimeOffEntry } from './schedule.ts';
import { datesBetween, dayBounds, isoWeekday, type LocalDate } from '../time.ts';

/** Database reads shared by the availability engine and the booking service. */

export interface BookingSettings {
  onlineEnabled: boolean;
  disabledMessage: { sq: string; en: string; de: string };
  bookingWindowDays: number;
  minNoticeMinutes: number;
  cancelDeadlineHours: number;
  slotStepMinutes: number;
  emailRequired: boolean;
  clinicNotifyEmail: string | null;
}

export interface DoctorRow {
  id: string;
  name: string;
  active: boolean;
  acceptsOnline: boolean;
}

export interface ServiceRow {
  id: string;
  nameSq: string;
  nameEn: string | null;
  nameDe: string | null;
  durationMin: number;
  active: boolean;
  onlineVisible: boolean;
}

export async function loadSettings(db: Db): Promise<BookingSettings> {
  const [s] = await db`SELECT * FROM settings WHERE id = 1`;
  if (!s) throw new Error('settings row missing: run npm run db:migrate');
  return {
    onlineEnabled: s.onlineEnabled,
    disabledMessage: { sq: s.disabledMessageSq, en: s.disabledMessageEn, de: s.disabledMessageDe },
    bookingWindowDays: s.bookingWindowDays,
    minNoticeMinutes: s.minNoticeMinutes,
    cancelDeadlineHours: s.cancelDeadlineHours,
    slotStepMinutes: s.slotStepMinutes,
    emailRequired: s.emailRequired,
    clinicNotifyEmail: s.clinicNotifyEmail,
  };
}

/**
 * Loads a doctor. With `lock`, takes a row lock that serialises every booking change for this
 * doctor until the transaction ends (see booking/appointments.ts).
 */
export async function loadDoctor(db: Db, id: string, options: { lock?: boolean } = {}): Promise<DoctorRow | undefined> {
  const rows = options.lock
    ? await db<DoctorRow[]>`SELECT id, name, active, accepts_online FROM doctors WHERE id = ${id} FOR UPDATE`
    : await db<DoctorRow[]>`SELECT id, name, active, accepts_online FROM doctors WHERE id = ${id}`;
  return rows[0];
}

export async function loadService(db: Db, id: string): Promise<ServiceRow | undefined> {
  const [row] = await db<ServiceRow[]>`
    SELECT id, name_sq, name_en, name_de, duration_min, active, online_visible FROM services WHERE id = ${id}
  `;
  return row;
}

export async function doctorOffersService(db: Db, doctorId: string, serviceId: string): Promise<boolean> {
  const rows = await db`SELECT 1 FROM doctor_services WHERE doctor_id = ${doctorId} AND service_id = ${serviceId}`;
  return rows.length > 0;
}

/**
 * Everything the scheduling rules need for one doctor over a range of local dates, in four queries.
 * `excludeAppointmentId` leaves one appointment out of the busy times (used when rescheduling it).
 */
export async function loadDayContexts(
  db: Db,
  doctorId: string,
  from: LocalDate,
  to: LocalDate,
  options: { excludeAppointmentId?: string } = {},
): Promise<Map<LocalDate, DayContext>> {
  const rangeStart = new Date(dayBounds(from).start);
  const rangeEnd = new Date(dayBounds(to).end);

  const weeklyRows = await db<{ weekday: number; startMinute: number; endMinute: number }[]>`
    SELECT weekday, start_minute, end_minute FROM weekly_schedules
    WHERE doctor_id = ${doctorId} ORDER BY weekday, start_minute
  `;

  const overrideRows = await db<
    { date: string; doctorId: string | null; kind: DayOverride['kind']; note: string | null; periods: MinutePeriod[] }[]
  >`
    SELECT o.date::text AS date, o.doctor_id, o.kind, o.note,
           coalesce(json_agg(json_build_object('startMinute', p.start_minute, 'endMinute', p.end_minute)
                             ORDER BY p.start_minute) FILTER (WHERE p.id IS NOT NULL), '[]') AS periods
    FROM date_overrides o
    LEFT JOIN date_override_periods p ON p.override_id = o.id
    WHERE o.date BETWEEN ${from}::date AND ${to}::date AND (o.doctor_id IS NULL OR o.doctor_id = ${doctorId})
    GROUP BY o.id
  `;

  const timeOffRows = await db<{ startsAt: Date; endsAt: Date; reason: TimeOffEntry['reason']; note: string | null }[]>`
    SELECT starts_at, ends_at, reason, note FROM time_off
    WHERE doctor_id = ${doctorId}
      AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${rangeStart}, ${rangeEnd}, '[)')
  `;

  const excluded = options.excludeAppointmentId ?? null;
  const appointmentRows = await db<{ startsAt: Date; endsAt: Date }[]>`
    SELECT starts_at, ends_at FROM appointments
    WHERE doctor_id = ${doctorId} AND status <> 'cancelled'
      AND (${excluded}::uuid IS NULL OR id <> ${excluded}::uuid)
      AND tstzrange(starts_at, ends_at, '[)') && tstzrange(${rangeStart}, ${rangeEnd}, '[)')
  `;

  const toInterval = (r: { startsAt: Date; endsAt: Date }): Interval => ({ start: r.startsAt.getTime(), end: r.endsAt.getTime() });
  const timeOff = timeOffRows.map(toInterval);
  const timeOffEntries: TimeOffEntry[] = timeOffRows.map((r) => ({ ...toInterval(r), reason: r.reason, note: r.note }));
  const appointments = appointmentRows.map(toInterval);

  const weekly = new Map<number, MinutePeriod[]>();
  for (const r of weeklyRows) {
    const list = weekly.get(r.weekday) ?? [];
    list.push({ startMinute: r.startMinute, endMinute: r.endMinute });
    weekly.set(r.weekday, list);
  }

  const contexts = new Map<LocalDate, DayContext>();
  for (const date of datesBetween(from, to)) {
    const forDate = overrideRows.filter((o) => o.date === date);
    const clinic = forDate.find((o) => o.doctorId === null);
    const doctor = forDate.find((o) => o.doctorId !== null);
    contexts.set(date, {
      date,
      weekly: weekly.get(isoWeekday(date)) ?? [],
      clinicOverride: clinic && { kind: clinic.kind, periods: clinic.periods, note: clinic.note },
      doctorOverride: doctor && { kind: doctor.kind, periods: doctor.periods, note: doctor.note },
      timeOff,
      timeOffEntries,
      hasWeeklySchedule: weeklyRows.length > 0,
      appointments,
    });
  }
  return contexts;
}
