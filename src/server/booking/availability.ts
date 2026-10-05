import type { Db } from '../db/client.ts';
import {
  doctorOffersService,
  loadDayContexts,
  loadDoctor,
  loadService,
  loadSettings,
  type BookingSettings,
  type DoctorRow,
  type ServiceRow,
} from './repository.ts';
import {
  explainWorkingRules,
  slotsForDay,
  workingIntervals,
  workingPeriods,
  type DayContext,
  type IssueDetail,
  type MinutePeriod,
  type StaffIssue,
} from './schedule.ts';
import { contains, normalize, overlapsAny } from './intervals.ts';
import {
  addDays,
  datesBetween,
  formatLocalTime,
  isValidLocalDate,
  localDateOf,
  localMinuteOf,
  minutes,
  todayLocal,
  wallClockToInstant,
  type LocalDate,
} from '../time.ts';

/**
 * Availability engine. The only place where bookable times are calculated: the public booking API,
 * the final re-check inside the booking transaction and the admin panel all use these functions.
 */

export type UnavailableReason =
  | 'online_disabled'
  | 'service_unavailable'
  | 'doctor_unavailable'
  | 'doctor_not_offering_service';

export interface OnlineContext {
  settings: BookingSettings;
  doctor: DoctorRow;
  service: ServiceRow;
}

export type OnlineContextResult = { ok: true; context: OnlineContext } | { ok: false; reason: UnavailableReason };

/**
 * Checks whether this doctor + service can be booked online at all. Fails safe: anything missing,
 * inactive or not explicitly enabled means "not bookable".
 */
export function onlineEligibility(
  settings: BookingSettings,
  doctor: DoctorRow | undefined,
  service: ServiceRow | undefined,
  offers: boolean,
): UnavailableReason | null {
  if (!settings.onlineEnabled) return 'online_disabled';
  if (!service || !service.active || !service.onlineVisible) return 'service_unavailable';
  if (!doctor || !doctor.active || !doctor.acceptsOnline) return 'doctor_unavailable';
  if (!offers) return 'doctor_not_offering_service';
  return null;
}

export async function loadOnlineContext(
  db: Db,
  doctorId: string,
  serviceId: string,
  options: { lockDoctor?: boolean } = {},
): Promise<OnlineContextResult> {
  const settings = await loadSettings(db);
  const doctor = await loadDoctor(db, doctorId, { lock: options.lockDoctor });
  const service = await loadService(db, serviceId);
  const offers = doctor && service ? await doctorOffersService(db, doctorId, serviceId) : false;
  const reason = onlineEligibility(settings, doctor, service, offers);
  return reason ? { ok: false, reason } : { ok: true, context: { settings, doctor: doctor!, service: service! } };
}

/** Local dates patients may book: today … today + booking window (inclusive). */
export function bookableDateRange(settings: BookingSettings, now: number): { from: LocalDate; to: LocalDate } {
  const from = todayLocal(now);
  return { from, to: addDays(from, settings.bookingWindowDays) };
}

export interface Slot {
  /** ISO instant (UTC), sent back unchanged when booking. */
  startsAt: string;
  /** Wall-clock start in Kosovo time, 'HH:mm'. */
  time: string;
}

function onlineSlotsFromContexts(
  context: OnlineContext,
  contexts: Map<LocalDate, DayContext>,
  date: LocalDate,
  now: number,
): number[] {
  const ctx = contexts.get(date);
  if (!ctx) return [];
  return slotsForDay(ctx, {
    durationMin: context.service.durationMin,
    stepMin: context.settings.slotStepMinutes,
    earliestStart: now + minutes(context.settings.minNoticeMinutes),
  });
}

/** Available online start times for one date. Dates outside the booking window have none. */
export async function getOnlineSlots(
  db: Db,
  input: { doctorId: string; serviceId: string; date: LocalDate; now: number },
): Promise<{ ok: true; slots: Slot[] } | { ok: false; reason: UnavailableReason | 'invalid_date' }> {
  if (!isValidLocalDate(input.date)) return { ok: false, reason: 'invalid_date' };
  const eligibility = await loadOnlineContext(db, input.doctorId, input.serviceId);
  if (!eligibility.ok) return eligibility;
  const { from, to } = bookableDateRange(eligibility.context.settings, input.now);
  if (input.date < from || input.date > to) return { ok: true, slots: [] };

  const contexts = await loadDayContexts(db, input.doctorId, input.date, input.date);
  const starts = onlineSlotsFromContexts(eligibility.context, contexts, input.date, input.now);
  return { ok: true, slots: starts.map((s) => ({ startsAt: new Date(s).toISOString(), time: formatLocalTime(s) })) };
}

/** Dates in [from, to] (clipped to the booking window) that have at least one online slot. */
export async function getOnlineDates(
  db: Db,
  input: { doctorId: string; serviceId: string; from: LocalDate; to: LocalDate; now: number },
): Promise<{ ok: true; dates: LocalDate[] } | { ok: false; reason: UnavailableReason | 'invalid_date' }> {
  if (!isValidLocalDate(input.from) || !isValidLocalDate(input.to) || input.from > input.to) {
    return { ok: false, reason: 'invalid_date' };
  }
  const eligibility = await loadOnlineContext(db, input.doctorId, input.serviceId);
  if (!eligibility.ok) return eligibility;
  const window = bookableDateRange(eligibility.context.settings, input.now);
  const from = input.from > window.from ? input.from : window.from;
  const to = input.to < window.to ? input.to : window.to;
  if (from > to) return { ok: true, dates: [] };

  const contexts = await loadDayContexts(db, input.doctorId, from, to);
  const dates = datesBetween(from, to).filter(
    (d) => onlineSlotsFromContexts(eligibility.context, contexts, d, input.now).length > 0,
  );
  return { ok: true, dates };
}

/**
 * Final online check for one exact start time, run inside the booking transaction against fresh
 * data. True only if the start is one of the slots the engine would offer right now.
 */
export async function isOnlineStartAvailable(
  db: Db,
  context: OnlineContext,
  startsAt: number,
  now: number,
  options: { excludeAppointmentId?: string } = {},
): Promise<boolean> {
  const date = localDateOf(startsAt);
  const { from, to } = bookableDateRange(context.settings, now);
  if (date < from || date > to) return false;
  const contexts = await loadDayContexts(db, context.doctor.id, date, date, options);
  return onlineSlotsFromContexts(context, contexts, date, now).includes(startsAt);
}

export interface StaffTimeCheck {
  /** Overlaps another active appointment of this doctor. Always a hard conflict. */
  appointmentConflict: boolean;
  /** Starts in the past. */
  inPast: boolean;
  /** Working-rule problems staff may knowingly override. */
  issues: StaffIssue[];
  /** The same problems with details for the admin panel ("on vacation", working hours…). */
  details: IssueDetail[];
}

/**
 * Check for a staff-chosen time. Online-only rules (notice, window, start-time grid, online
 * visibility) do not apply to staff.
 */
export async function checkStaffTime(
  db: Db,
  input: { doctorId: string; startsAt: number; endsAt: number; now: number; excludeAppointmentId?: string },
): Promise<StaffTimeCheck> {
  const firstDate = localDateOf(input.startsAt);
  const lastDate = localDateOf(input.endsAt - 1);
  const contexts = await loadDayContexts(db, input.doctorId, firstDate, lastDate, {
    excludeAppointmentId: input.excludeAppointmentId,
  });
  return staffCheckFromContexts([...contexts.values()], input.startsAt, input.endsAt, input.now);
}

export function staffCheckFromContexts(days: DayContext[], startsAt: number, endsAt: number, now: number): StaffTimeCheck {
  const appointmentConflict = overlapsAny(days[0].appointments, startsAt, endsAt);
  let details: IssueDetail[];
  if (days.length === 1) {
    details = explainWorkingRules(days[0], startsAt, endsAt);
  } else {
    // Appointment crosses midnight: judge it against the combined working time of both dates.
    const byCode = new Map<StaffIssue, IssueDetail>();
    for (const d of days) for (const i of explainWorkingRules(d, startsAt, endsAt)) if (!byCode.has(i.code)) byCode.set(i.code, i);
    if (contains(normalize(days.flatMap(workingIntervals)), startsAt, endsAt)) byCode.delete('outside_working_hours');
    details = [...byCode.values()];
  }
  return { appointmentConflict, inPast: startsAt < now, issues: details.map((d) => d.code), details };
}

export interface StaffSlot {
  startsAt: string;
  time: string;
  /** Empty when the time fits the doctor's working rules; otherwise why it does not. */
  issues: IssueDetail[];
}

/**
 * Candidate start times for staff on one date: every grid step from midnight, excluding times in the
 * past and times that would overlap another appointment (never allowed). Times outside working
 * hours / in time off / on closed days are included with their reasons, so staff can knowingly
 * override them. Also returns the doctor's working periods for the date.
 */
export async function staffDaySlots(
  db: Db,
  input: { doctorId: string; durationMin: number; date: LocalDate; now: number; stepMin: number; excludeAppointmentId?: string },
): Promise<{ slots: StaffSlot[]; working: MinutePeriod[]; hasWeeklySchedule: boolean }> {
  const next = addDays(input.date, 1);
  const contexts = await loadDayContexts(db, input.doctorId, input.date, next, { excludeAppointmentId: input.excludeAppointmentId });
  const day = contexts.get(input.date)!;
  const duration = minutes(input.durationMin);
  const slots: StaffSlot[] = [];
  for (let m = 0; m < 1440; m += input.stepMin) {
    const start = wallClockToInstant(input.date, m);
    if (localMinuteOf(start) !== m || localDateOf(start) !== input.date) continue; // DST gap
    if (start < input.now) continue;
    const end = start + duration;
    const days = localDateOf(end - 1) === input.date ? [day] : [day, contexts.get(next)!];
    const check = staffCheckFromContexts(days, start, end, input.now);
    if (check.appointmentConflict) continue;
    slots.push({ startsAt: new Date(start).toISOString(), time: formatLocalTime(start), issues: check.details });
  }
  return { slots, working: workingPeriods(day), hasWeeklySchedule: day.hasWeeklySchedule !== false };
}
