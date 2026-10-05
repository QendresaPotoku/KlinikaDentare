import { contains, intersect, normalize, subtract, type Interval } from './intervals.ts';
import { minutes, wallClockToInstant, localMinuteOf, localDateOf, type LocalDate } from '../time.ts';

/**
 * Pure scheduling rules for one doctor on one local date. No database access: the caller loads the
 * data, which keeps these rules easy to test (including daylight-saving days).
 */

/** Wall-clock period, minutes since local midnight, [startMinute, endMinute). */
export interface MinutePeriod {
  startMinute: number;
  endMinute: number;
}

export interface DayOverride {
  kind: 'closed' | 'custom_hours';
  periods: MinutePeriod[];
  note?: string | null;
}

export type TimeOffReason = 'vacation' | 'sick' | 'training' | 'personal' | 'other';

/** Time off with its reason, for explaining to staff why a time is blocked. */
export interface TimeOffEntry {
  start: number;
  end: number;
  reason: TimeOffReason;
  note: string | null;
}

export interface DayContext {
  date: LocalDate;
  /** The doctor's regular periods for this weekday (empty = not configured / day off). */
  weekly: MinutePeriod[];
  /** Whole-clinic override for this date, if any. */
  clinicOverride?: DayOverride;
  /** Doctor-specific override for this date, if any. */
  doctorOverride?: DayOverride;
  /** Doctor time off overlapping this date. */
  timeOff: Interval[];
  /** Same time off with reasons (optional; used for staff explanations). */
  timeOffEntries?: TimeOffEntry[];
  /** False when the doctor has no weekly schedule rows at all (optional). */
  hasWeeklySchedule?: boolean;
  /** Other active (non-cancelled) appointments of this doctor overlapping this date. */
  appointments: Interval[];
}

function periodsToIntervals(date: LocalDate, periods: MinutePeriod[]): Interval[] {
  return periods.map((p) => ({ start: wallClockToInstant(date, p.startMinute), end: wallClockToInstant(date, p.endMinute) }));
}

/**
 * When the doctor works on this date, before time off and appointments are taken out:
 *   1. Clinic closed                 → nothing.
 *   2. Doctor override for the date  → 'closed' = nothing; 'custom_hours' replaces the weekly hours
 *                                      (this is also how an exceptional working day is entered).
 *   3. Otherwise                     → the doctor's weekly periods for that weekday.
 *   4. Clinic special hours          → every doctor is limited to (intersected with) those hours.
 */
export function workingIntervals(ctx: DayContext): Interval[] {
  if (ctx.clinicOverride?.kind === 'closed') return [];
  let periods: MinutePeriod[];
  if (ctx.doctorOverride) periods = ctx.doctorOverride.kind === 'closed' ? [] : ctx.doctorOverride.periods;
  else periods = ctx.weekly;

  let intervals = normalize(periodsToIntervals(ctx.date, periods));
  if (ctx.clinicOverride?.kind === 'custom_hours') {
    intervals = intersect(intervals, periodsToIntervals(ctx.date, ctx.clinicOverride.periods));
  }
  return intervals;
}

/** Working time minus time off and other appointments. */
export function freeIntervals(ctx: DayContext): Interval[] {
  return subtract(workingIntervals(ctx), [...ctx.timeOff, ...ctx.appointments]);
}

export interface SlotRules {
  durationMin: number;
  /** Start times are offered on this wall-clock grid (e.g. every 15 minutes from midnight). */
  stepMin: number;
  /** Earliest allowed start instant (now + minimum notice). */
  earliestStart: number;
}

/**
 * Start instants on the date where the whole service fits inside one free stretch.
 * Candidates are wall-clock times on the step grid; times that do not exist on a spring-forward day
 * are skipped. The end is start + duration in real elapsed time.
 */
export function slotsForDay(ctx: DayContext, rules: SlotRules): number[] {
  const free = freeIntervals(ctx);
  if (free.length === 0) return [];
  const duration = minutes(rules.durationMin);
  const out: number[] = [];
  for (let m = 0; m < 1440; m += rules.stepMin) {
    const start = wallClockToInstant(ctx.date, m);
    if (localMinuteOf(start) !== m || localDateOf(start) !== ctx.date) continue; // DST gap
    if (start < rules.earliestStart) continue;
    if (contains(free, start, start + duration)) out.push(start);
  }
  return out;
}

export type StaffIssue = 'clinic_closed' | 'outside_working_hours' | 'doctor_time_off';

/** A staff issue with the facts needed to explain it in plain words. */
export type IssueDetail =
  | { code: 'clinic_closed'; note: string | null }
  | {
      code: 'outside_working_hours';
      /** The doctor's working periods that date (empty = not working that day). */
      hours: MinutePeriod[];
      /** True when the doctor has a day-off override for the date. */
      dayOff: boolean;
      /** True when the doctor has no weekly schedule configured at all. */
      noSchedule?: boolean;
    }
  | { code: 'doctor_time_off'; reason: TimeOffReason; note: string | null };

/** The working periods of the date as wall-clock minutes (after overrides, before time off). */
export function workingPeriods(ctx: DayContext): MinutePeriod[] {
  if (ctx.clinicOverride?.kind === 'closed') return [];
  const base = ctx.doctorOverride ? (ctx.doctorOverride.kind === 'closed' ? [] : ctx.doctorOverride.periods) : ctx.weekly;
  if (ctx.clinicOverride?.kind !== 'custom_hours') return base;
  const out: MinutePeriod[] = [];
  for (const p of base) {
    for (const c of ctx.clinicOverride.periods) {
      const startMinute = Math.max(p.startMinute, c.startMinute);
      const endMinute = Math.min(p.endMinute, c.endMinute);
      if (endMinute > startMinute) out.push({ startMinute, endMinute });
    }
  }
  return out.sort((a, b) => a.startMinute - b.startMinute);
}

/** Like workingRuleIssues, with details for messages such as "Dr. X is on vacation at this time". */
export function explainWorkingRules(ctx: DayContext, start: number, end: number): IssueDetail[] {
  const codes = workingRuleIssues(ctx, start, end);
  const out: IssueDetail[] = [];
  for (const code of codes) {
    if (code === 'clinic_closed') out.push({ code, note: ctx.clinicOverride?.note ?? null });
    if (code === 'outside_working_hours') {
      out.push({
        code,
        hours: workingPeriods(ctx),
        dayOff: ctx.doctorOverride?.kind === 'closed',
        noSchedule: ctx.hasWeeklySchedule === false && !ctx.doctorOverride,
      });
    }
    if (code === 'doctor_time_off') {
      const entry = ctx.timeOffEntries?.find((t) => t.start < end && start < t.end);
      out.push({ code, reason: entry?.reason ?? 'other', note: entry?.note ?? null });
    }
  }
  return out;
}

/**
 * Why a staff-chosen time breaks the doctor's working rules (empty = fits).
 * Appointment overlaps are NOT reported here: they are always a hard conflict and checked separately.
 */
export function workingRuleIssues(ctx: DayContext, start: number, end: number): StaffIssue[] {
  const issues: StaffIssue[] = [];
  if (ctx.clinicOverride?.kind === 'closed') issues.push('clinic_closed');
  else if (!contains(workingIntervals(ctx), start, end)) issues.push('outside_working_hours');
  if (ctx.timeOff.some((t) => t.start < end && start < t.end)) issues.push('doctor_time_off');
  return issues;
}
