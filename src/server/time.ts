import { DateTime } from 'luxon';
import { CLINIC_TIME_ZONE } from './config.ts';

/**
 * Clinic-time helpers. Instants are epoch milliseconds (UTC). "Local" always means Kosovo wall-clock
 * time (Europe/Belgrade), including its daylight-saving changes. Wall-clock times are converted per
 * calendar date, never by adding fixed offsets, so 08:00 is 08:00 on both sides of a DST change.
 */

/** Calendar date in clinic time, 'YYYY-MM-DD'. */
export type LocalDate = string;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MINUTE = 60_000;

function localMidnight(date: LocalDate): DateTime {
  return DateTime.fromISO(date, { zone: CLINIC_TIME_ZONE }).startOf('day');
}

export function isValidLocalDate(value: unknown): value is LocalDate {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const d = DateTime.fromISO(value, { zone: CLINIC_TIME_ZONE });
  return d.isValid && d.toISODate() === value;
}

/**
 * Instant of a wall-clock time on a date. `minute` is minutes since local midnight, 0–1440
 * (1440 = midnight at the end of the day). A time that does not exist because clocks jump forward
 * (02:00–02:59 on the last Sunday of March) resolves to the instant after the jump.
 */
export function wallClockToInstant(date: LocalDate, minute: number): number {
  const midnight = localMidnight(date);
  if (minute >= 1440) return midnight.plus({ days: 1 }).startOf('day').toMillis();
  return midnight.set({ hour: Math.floor(minute / 60), minute: minute % 60, second: 0, millisecond: 0 }).toMillis();
}

export function localDateOf(instant: number): LocalDate {
  return DateTime.fromMillis(instant, { zone: CLINIC_TIME_ZONE }).toISODate()!;
}

/** Minutes since local midnight of an instant. */
export function localMinuteOf(instant: number): number {
  const d = DateTime.fromMillis(instant, { zone: CLINIC_TIME_ZONE });
  return d.hour * 60 + d.minute;
}

/** 'HH:mm' in clinic time. */
export function formatLocalTime(instant: number): string {
  return DateTime.fromMillis(instant, { zone: CLINIC_TIME_ZONE }).toFormat('HH:mm');
}

/** ISO weekday of a local date: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: LocalDate): number {
  return localMidnight(date).weekday;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return localMidnight(date).plus({ days }).toISODate()!;
}

export function todayLocal(now: number): LocalDate {
  return localDateOf(now);
}

/** [start, end) instants of a local day (23 or 25 hours long on DST change days). */
export function dayBounds(date: LocalDate): { start: number; end: number } {
  return { start: wallClockToInstant(date, 0), end: wallClockToInstant(date, 1440) };
}

/** Inclusive list of local dates. */
export function datesBetween(from: LocalDate, to: LocalDate): LocalDate[] {
  const out: LocalDate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function minutes(n: number): number {
  return n * MINUTE;
}
