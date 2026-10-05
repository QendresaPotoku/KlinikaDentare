import { describe, expect, it } from 'vitest';
import { intersect, normalize, subtract } from '../../src/server/booking/intervals.ts';
import { slotsForDay, workingIntervals, workingRuleIssues, type DayContext } from '../../src/server/booking/schedule.ts';
import {
  addDays,
  dayBounds,
  formatLocalTime,
  isValidLocalDate,
  isoWeekday,
  localDateOf,
  wallClockToInstant,
} from '../../src/server/time.ts';
import { at } from '../helpers/booking.ts';

const H = 3_600_000;

describe('interval maths', () => {
  it('merges, subtracts and intersects half-open intervals', () => {
    expect(normalize([{ start: 5, end: 8 }, { start: 1, end: 3 }, { start: 3, end: 4 }, { start: 6, end: 6 }])).toEqual([
      { start: 1, end: 4 },
      { start: 5, end: 8 },
    ]);
    expect(subtract([{ start: 0, end: 10 }], [{ start: 2, end: 3 }, { start: 5, end: 12 }])).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ]);
    expect(intersect([{ start: 0, end: 10 }], [{ start: 5, end: 15 }])).toEqual([{ start: 5, end: 10 }]);
  });
});

describe('Kosovo time and daylight saving', () => {
  it('uses UTC+1 in winter and UTC+2 in summer', () => {
    expect(new Date(wallClockToInstant('2026-11-02', 8 * 60)).toISOString()).toBe('2026-11-02T07:00:00.000Z');
    expect(new Date(wallClockToInstant('2026-07-06', 8 * 60)).toISOString()).toBe('2026-07-06T06:00:00.000Z');
  });

  it('keeps 08:00 at 08:00 on both sides of the March and October changes', () => {
    // Clocks go forward on Sunday 29 March 2026 and back on Sunday 25 October 2026.
    expect(new Date(wallClockToInstant('2026-03-28', 480)).toISOString()).toBe('2026-03-28T07:00:00.000Z');
    expect(new Date(wallClockToInstant('2026-03-29', 480)).toISOString()).toBe('2026-03-29T06:00:00.000Z');
    expect(new Date(wallClockToInstant('2026-10-24', 480)).toISOString()).toBe('2026-10-24T06:00:00.000Z');
    expect(new Date(wallClockToInstant('2026-10-25', 480)).toISOString()).toBe('2026-10-25T07:00:00.000Z');
  });

  it('has 23- and 25-hour days at the changes', () => {
    const spring = dayBounds('2026-03-29');
    const autumn = dayBounds('2026-10-25');
    expect((spring.end - spring.start) / H).toBe(23);
    expect((autumn.end - autumn.start) / H).toBe(25);
    expect((dayBounds('2026-11-02').end - dayBounds('2026-11-02').start) / H).toBe(24);
  });

  it('validates dates and computes weekdays', () => {
    expect(isValidLocalDate('2026-11-02')).toBe(true);
    expect(isValidLocalDate('2026-02-30')).toBe(false);
    expect(isValidLocalDate('2026-11-2')).toBe(false);
    expect(isValidLocalDate("2026-11-02'; DROP TABLE")).toBe(false);
    expect(isoWeekday('2026-11-02')).toBe(1); // Monday
    expect(isoWeekday('2026-11-08')).toBe(7); // Sunday
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(localDateOf(Date.parse('2026-11-01T23:30:00Z'))).toBe('2026-11-02'); // 00:30 local
  });
});

const day = (date: string, overrides: Partial<DayContext> = {}): DayContext => ({
  date,
  weekly: [],
  timeOff: [],
  appointments: [],
  ...overrides,
});
const p = (from: number, to: number) => ({ startMinute: from * 60, endMinute: to * 60 });
const rules = (durationMin: number, earliestStart = 0) => ({ durationMin, stepMin: 30, earliestStart });

describe('slots on daylight-saving days', () => {
  it('offers the same wall-clock times on the spring-forward Sunday', () => {
    const ctx = day('2026-03-29', { doctorOverride: { kind: 'custom_hours', periods: [p(8, 10)] } });
    const slots = slotsForDay(ctx, rules(30));
    expect(slots.map(formatLocalTime)).toEqual(['08:00', '08:30', '09:00', '09:30']);
    expect(new Date(slots[0]).toISOString()).toBe('2026-03-29T06:00:00.000Z');
  });

  it('offers the same wall-clock times on the fall-back Sunday', () => {
    const ctx = day('2026-10-25', { doctorOverride: { kind: 'custom_hours', periods: [p(8, 10)] } });
    const slots = slotsForDay(ctx, rules(30));
    expect(slots.map(formatLocalTime)).toEqual(['08:00', '08:30', '09:00', '09:30']);
    expect(new Date(slots[0]).toISOString()).toBe('2026-10-25T07:00:00.000Z');
  });

  it('skips the non-existent hour 02:00–03:00 in March and measures duration in real time', () => {
    const ctx = day('2026-03-29', { doctorOverride: { kind: 'custom_hours', periods: [p(1, 4)] } });
    const slots = slotsForDay(ctx, rules(30));
    // 01:00–04:00 local is only 2 real hours that night.
    expect(slots.map(formatLocalTime)).toEqual(['01:00', '01:30', '03:00', '03:30']);
    const working = workingIntervals(ctx);
    expect((working[0].end - working[0].start) / H).toBe(2);
  });
});

describe('working rules for staff-chosen times', () => {
  it('reports closure, outside hours and time off separately', () => {
    const date = '2026-11-02';
    const base = day(date, { weekly: [p(8, 12)] });
    expect(workingRuleIssues(base, at(`${date}T09:00`), at(`${date}T09:30`))).toEqual([]);
    expect(workingRuleIssues(base, at(`${date}T11:45`), at(`${date}T12:15`))).toEqual(['outside_working_hours']);
    expect(
      workingRuleIssues({ ...base, clinicOverride: { kind: 'closed', periods: [] } }, at(`${date}T09:00`), at(`${date}T09:30`)),
    ).toEqual(['clinic_closed']);
    expect(
      workingRuleIssues(
        { ...base, timeOff: [{ start: at(`${date}T09:15`), end: at(`${date}T10:00`) }] },
        at(`${date}T09:00`),
        at(`${date}T09:30`),
      ),
    ).toEqual(['doctor_time_off']);
  });
});
