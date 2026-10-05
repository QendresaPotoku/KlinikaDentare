import type { Db } from '../db/client.ts';
import { addDays, localDateOf, localMinuteOf, todayLocal } from '../time.ts';
import { formatDayMonth, formatDateLong, hhmm, timeOffLabel } from '../../admin/strings.ts';

/** Read models for the configuration lists (absences, special days). */

export interface TimeOffRow {
  id: string;
  doctorId: string;
  doctorName: string;
  reason: string;
  note: string | null;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  updatedAt: Date;
}

export async function listTimeOff(db: Db, options: { doctorId?: string | null; now: number }) {
  const doctorId = options.doctorId ?? null;
  const rows = await db<TimeOffRow[]>`
    SELECT t.id, t.doctor_id, d.name AS doctor_name, t.reason, t.note, t.starts_at, t.ends_at, t.all_day, t.updated_at
    FROM time_off t JOIN doctors d ON d.id = t.doctor_id
    WHERE (${doctorId}::uuid IS NULL OR t.doctor_id = ${doctorId}::uuid)
    ORDER BY t.starts_at`;
  const now = new Date(options.now);
  return { upcoming: rows.filter((r) => r.endsAt > now), past: rows.filter((r) => r.endsAt <= now).reverse() };
}

/** "10 gusht → 20 gusht 2026" / "e hënë, 5 tetor 2026" / "e hënë, 5 tetor 2026, 10:00–12:00" */
export function describeTimeOffRange(r: { startsAt: Date; endsAt: Date; allDay: boolean }): string {
  const first = localDateOf(r.startsAt.getTime());
  // Entries from local midnight to local midnight are whole days, however they were created.
  const wholeDays = r.allDay || (localMinuteOf(r.startsAt.getTime()) === 0 && localMinuteOf(r.endsAt.getTime()) === 0);
  if (wholeDays) {
    const last = addDays(localDateOf(r.endsAt.getTime()), -1);
    return first === last ? formatDateLong(first) : `${formatDayMonth(first)} → ${formatDateLong(last).replace(/^[^,]+,\s*/, '')}`;
  }
  const end = localMinuteOf(r.endsAt.getTime());
  return `${formatDateLong(first)}, ${hhmm(localMinuteOf(r.startsAt.getTime()))}–${hhmm(end === 0 ? 1440 : end)}`;
}

export const reasonTitle = (reason: string) => {
  const t = timeOffLabel[reason] ?? reason;
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** Form values for editing an existing absence. */
export function timeOffFormValues(row: TimeOffRow) {
  const first = localDateOf(row.startsAt.getTime());
  const r = { ...row, allDay: row.allDay || (localMinuteOf(row.startsAt.getTime()) === 0 && localMinuteOf(row.endsAt.getTime()) === 0) };
  return {
    doctorId: r.doctorId,
    reason: r.reason,
    mode: (r.allDay ? 'days' : 'hours') as 'days' | 'hours',
    fromDate: r.allDay ? first : '',
    toDate: r.allDay ? addDays(localDateOf(r.endsAt.getTime()), -1) : '',
    date: r.allDay ? '' : first,
    fromTime: r.allDay ? '' : hhmm(localMinuteOf(r.startsAt.getTime())),
    toTime: r.allDay ? '' : hhmm(localMinuteOf(r.endsAt.getTime())),
    note: r.note ?? '',
  };
}

export interface OverrideRow {
  id: string;
  date: string;
  doctorId: string | null;
  doctorName: string | null;
  kind: 'closed' | 'custom_hours';
  note: string | null;
  periods: { startMinute: number; endMinute: number }[];
  updatedAt: Date;
}

export async function listOverrides(db: Db, options: { doctorId?: string | null; now: number }) {
  const doctorId = options.doctorId ?? null;
  const rows = await db<OverrideRow[]>`
    SELECT o.id, o.date::text AS date, o.doctor_id, d.name AS doctor_name, o.kind, o.note, o.updated_at,
           coalesce(json_agg(json_build_object('startMinute', p.start_minute, 'endMinute', p.end_minute) ORDER BY p.start_minute)
             FILTER (WHERE p.id IS NOT NULL), '[]') AS periods
    FROM date_overrides o
    LEFT JOIN doctors d ON d.id = o.doctor_id
    LEFT JOIN date_override_periods p ON p.override_id = o.id
    WHERE (${doctorId}::uuid IS NULL OR o.doctor_id = ${doctorId}::uuid OR o.doctor_id IS NULL)
    GROUP BY o.id, d.name
    ORDER BY o.date, o.doctor_id NULLS FIRST`;
  const today = todayLocal(options.now);
  return { upcoming: rows.filter((r) => r.date >= today), past: rows.filter((r) => r.date < today).reverse() };
}
