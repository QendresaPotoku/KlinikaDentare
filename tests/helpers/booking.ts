import { DateTime } from 'luxon';
import { CLINIC_TIME_ZONE } from '../../src/server/config.ts';
import type { Sql } from '../../src/server/db/client.ts';
import type { Slot } from '../../src/server/booking/availability.ts';
import { BookingError } from '../../src/server/booking/errors.ts';

/** Instant (ms) of a Kosovo wall-clock time, e.g. at('2026-11-02T09:00'). */
export function at(local: string): number {
  const d = DateTime.fromISO(local, { zone: CLINIC_TIME_ZONE });
  if (!d.isValid) throw new Error(`bad local time ${local}`);
  return d.toMillis();
}

export const iso = (local: string) => new Date(at(local)).toISOString();

const toMinute = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const times = (slots: Slot[]) => slots.map((s) => s.time);

export { resetData as clearAll } from './db.ts';

export async function setSettings(sql: Sql, values: Record<string, unknown>) {
  await sql`UPDATE settings SET ${sql(values)} WHERE id = 1`;
}

export async function addDoctor(sql: Sql, name: string, values: Record<string, unknown> = {}) {
  const [row] = await sql<{ id: string }[]>`INSERT INTO doctors ${sql({ name, ...values })} RETURNING id`;
  return row.id;
}

export async function addService(sql: Sql, nameSq: string, durationMin: number, doctorIds: string[], values: Record<string, unknown> = {}) {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO services ${sql({ nameSq, durationMin, onlineVisible: true, ...values })} RETURNING id`;
  for (const doctorId of doctorIds) await sql`INSERT INTO doctor_services (doctor_id, service_id) VALUES (${doctorId}, ${row.id})`;
  return row.id;
}

/** weekday: 1 = Monday … 7 = Sunday; periods like ['08:00', '12:00']. */
export async function addWeekly(sql: Sql, doctorId: string, weekdays: number[], ...periods: [string, string][]) {
  for (const weekday of weekdays) {
    for (const [from, to] of periods) {
      await sql`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
                VALUES (${doctorId}, ${weekday}, ${toMinute(from)}, ${to === '24:00' ? 1440 : toMinute(to)})`;
    }
  }
}

export async function addOverride(
  sql: Sql,
  date: string,
  doctorId: string | null,
  kind: 'closed' | 'custom_hours',
  ...periods: [string, string][]
) {
  const [o] = await sql<{ id: string }[]>`
    INSERT INTO date_overrides (date, doctor_id, kind) VALUES (${date}, ${doctorId}, ${kind}) RETURNING id`;
  for (const [from, to] of periods) {
    await sql`INSERT INTO date_override_periods (override_id, start_minute, end_minute)
              VALUES (${o.id}, ${toMinute(from)}, ${toMinute(to)})`;
  }
}

/** Time off between two local wall-clock times, e.g. ('2026-11-02T00:00', '2026-11-05T00:00'). */
export async function addTimeOff(sql: Sql, doctorId: string, fromLocal: string, toLocal: string, reason = 'vacation') {
  await sql`INSERT INTO time_off (doctor_id, starts_at, ends_at, reason)
            VALUES (${doctorId}, ${new Date(at(fromLocal))}, ${new Date(at(toLocal))}, ${reason})`;
}

/** Inserts an appointment directly (bypassing the booking service), for setting up busy times. */
export async function addAppointment(
  sql: Sql,
  doctorId: string,
  serviceId: string,
  fromLocal: string,
  toLocal: string,
  values: Record<string, unknown> = {},
) {
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO appointments ${sql({
      doctorId,
      serviceId,
      serviceNameSnapshot: 'Test',
      startsAt: new Date(at(fromLocal)),
      endsAt: new Date(at(toLocal)),
      source: 'staff',
      patientName: 'Existing Patient',
      patientPhone: '+38344000000',
      lang: 'sq',
      ...values,
    })} RETURNING id`;
  return row.id;
}

/** Awaits a promise expected to fail with a BookingError and returns its code. */
export async function bookingErrorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    if (err instanceof BookingError) return err.code;
    throw err;
  }
  throw new Error('expected a BookingError, but the call succeeded');
}

let keyCounter = 0;
export function newKey() {
  keyCounter += 1;
  return `test-key-${Date.now()}-${keyCounter}-abcdef`;
}
