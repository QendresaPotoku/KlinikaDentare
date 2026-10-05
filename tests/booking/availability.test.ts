import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { getOnlineDates, getOnlineSlots } from '../../src/server/booking/availability.ts';
import {
  addAppointment,
  addDoctor,
  addOverride,
  addService,
  addTimeOff,
  addWeekly,
  at,
  clearAll,
  setSettings,
  times,
} from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

let sql: Sql;
let drA: string; // Mon–Fri 08:00–12:00 + 13:00–17:00
let drB: string; // Tue 09:00–17:00 only
let consult: string; // 30 min, both doctors
let cleaning: string; // 45 min, both doctors
let long: string; // 60 min, Dr A only

// Sunday 1 November 2026, 12:00 Kosovo time (CET, UTC+1). Monday 2 Nov is the first working day.
const NOW = at('2026-11-01T12:00');
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';
const SUN = '2026-11-08';

const MORNING_30 = ['08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30'];
const AFTERNOON_30 = ['13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30'];

async function slots(doctorId: string, serviceId: string, date: string, now = NOW) {
  const result = await getOnlineSlots(sql, { doctorId, serviceId, date, now });
  if (!result.ok) throw new Error(`unexpected: ${result.reason}`);
  return times(result.slots);
}

beforeAll(async () => {
  sql = await createTestDb();
});
afterAll(async () => {
  await sql?.end();
});

beforeEach(async () => {
  await clearAll(sql);
  await setSettings(sql, { onlineEnabled: true, minNoticeMinutes: 0, bookingWindowDays: 90, slotStepMinutes: 15 });
  drA = await addDoctor(sql, 'Dr. A');
  drB = await addDoctor(sql, 'Dr. B');
  await addWeekly(sql, drA, [1, 2, 3, 4, 5], ['08:00', '12:00'], ['13:00', '17:00']);
  await addWeekly(sql, drB, [2], ['09:00', '17:00']);
  consult = await addService(sql, 'Konsultë', 30, [drA, drB]);
  cleaning = await addService(sql, 'Pastrim', 45, [drA, drB]);
  long = await addService(sql, 'Trajtim', 60, [drA]);
});

describe('working periods', () => {
  it('offers times in both periods and none during the lunch break', async () => {
    expect(await slots(drA, consult, MON)).toEqual([...MORNING_30, ...AFTERNOON_30]);
  });

  it('considers the whole service duration before a break and before closing', async () => {
    const s45 = await slots(drA, cleaning, MON);
    expect(s45).toContain('11:15'); // ends 12:00
    expect(s45).not.toContain('11:30'); // would run into the break
    expect(s45).toContain('16:15'); // ends 17:00
    expect(s45).not.toContain('16:30'); // would run past closing
    const s60 = await slots(drA, long, MON);
    expect(s60.at(0)).toBe('08:00');
    expect(s60).toContain('11:00');
    expect(s60).not.toContain('11:15');
    expect(s60.at(-1)).toBe('16:00');
  });

  it('uses each doctor’s own schedule', async () => {
    expect(await slots(drB, consult, MON)).toEqual([]); // Dr B does not work Mondays
    const b = await slots(drB, consult, TUE);
    expect(b.at(0)).toBe('09:00');
    expect(b.at(-1)).toBe('16:30');
    expect(b).toContain('12:15'); // no lunch break in Dr B's schedule
  });

  it('honours the configured start-time grid', async () => {
    await setSettings(sql, { slotStepMinutes: 30 });
    expect((await slots(drA, consult, MON)).slice(0, 3)).toEqual(['08:00', '08:30', '09:00']);
  });
});

describe('existing appointments', () => {
  it('allows a slot ending exactly when another appointment begins, and one starting when it ends', async () => {
    await addAppointment(sql, drA, consult, `${MON}T09:00`, `${MON}T09:30`);
    const s = await slots(drA, consult, MON);
    expect(s).toContain('08:30'); // 08:30–09:00 ends as the appointment starts
    expect(s).not.toContain('08:45');
    expect(s).not.toContain('09:00');
    expect(s).not.toContain('09:15');
    expect(s).toContain('09:30'); // starts as the appointment ends
  });

  it('frees the time when the appointment is cancelled', async () => {
    await addAppointment(sql, drA, consult, `${MON}T09:00`, `${MON}T09:30`, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledByType: 'patient',
    });
    expect(await slots(drA, consult, MON)).toContain('09:00');
  });

  it('keeps completed and no-show appointments occupying their original time', async () => {
    await addAppointment(sql, drA, consult, `${MON}T09:00`, `${MON}T09:30`, { status: 'completed' });
    await addAppointment(sql, drA, consult, `${MON}T10:00`, `${MON}T10:30`, { status: 'no_show' });
    const s = await slots(drA, consult, MON);
    expect(s).not.toContain('09:00');
    expect(s).not.toContain('10:00');
  });

  it('only blocks the doctor who has the appointment', async () => {
    await addAppointment(sql, drA, consult, `${TUE}T10:00`, `${TUE}T10:30`);
    expect(await slots(drB, consult, TUE)).toContain('10:00');
  });
});

describe('time off and closures', () => {
  it('removes part of a day for doctor time off', async () => {
    await addTimeOff(sql, drA, `${MON}T10:00`, `${MON}T14:00`, 'personal');
    const s = await slots(drA, consult, MON);
    expect(s.filter((t) => t < '12:00')).toEqual(['08:00', '08:15', '08:30', '08:45', '09:00', '09:15', '09:30']);
    expect(s.filter((t) => t >= '13:00').at(0)).toBe('14:00');
  });

  it('blocks every day of a multi-day vacation', async () => {
    await addTimeOff(sql, drA, `${MON}T00:00`, `${WED}T00:00`); // Mon + Tue
    const result = await getOnlineDates(sql, { doctorId: drA, serviceId: consult, from: MON, to: '2026-11-06', now: NOW });
    expect(result).toEqual({ ok: true, dates: ['2026-11-04', '2026-11-05', '2026-11-06'] });
    // Dr B is not affected by Dr A's vacation.
    expect(await slots(drB, consult, TUE)).not.toEqual([]);
  });

  it('closes the clinic for every doctor', async () => {
    await addOverride(sql, TUE, null, 'closed');
    expect(await slots(drA, consult, TUE)).toEqual([]);
    expect(await slots(drB, consult, TUE)).toEqual([]);
    expect(await slots(drA, consult, WED)).not.toEqual([]);
  });

  it('applies doctor-specific special hours instead of the weekly schedule', async () => {
    await addOverride(sql, TUE, drA, 'custom_hours', ['10:00', '12:00']);
    expect(await slots(drA, consult, TUE)).toEqual(['10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30']);
    expect((await slots(drB, consult, TUE)).at(0)).toBe('09:00'); // other doctor unchanged
  });

  it('gives a doctor a day off with a doctor-specific closure', async () => {
    await addOverride(sql, TUE, drB, 'closed');
    expect(await slots(drB, consult, TUE)).toEqual([]);
    expect(await slots(drA, consult, TUE)).not.toEqual([]);
  });

  it('limits every doctor to clinic special hours', async () => {
    await addOverride(sql, WED, null, 'custom_hours', ['09:00', '11:00']);
    expect(await slots(drA, consult, WED)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30']);
  });

  it('combines clinic special hours with doctor special hours (intersection)', async () => {
    await addOverride(sql, WED, null, 'custom_hours', ['09:00', '11:00']);
    await addOverride(sql, WED, drA, 'custom_hours', ['10:00', '14:00']);
    expect(await slots(drA, consult, WED)).toEqual(['10:00', '10:15', '10:30']);
  });

  it('supports an exceptional working day', async () => {
    expect(await slots(drA, consult, SUN)).toEqual([]);
    await addOverride(sql, SUN, drA, 'custom_hours', ['09:00', '11:00']);
    expect(await slots(drA, consult, SUN)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30']);
  });

  it('keeps the clinic closed even if a doctor has special hours that day', async () => {
    await addOverride(sql, SUN, null, 'closed');
    await addOverride(sql, SUN, drA, 'custom_hours', ['09:00', '11:00']);
    expect(await slots(drA, consult, SUN)).toEqual([]);
  });
});

describe('notice, window and past times', () => {
  it('does not offer times that have already passed today', async () => {
    const now = at(`${MON}T09:05`);
    const s = await slots(drA, consult, MON, now);
    expect(s.at(0)).toBe('09:15');
    expect(s).not.toContain('09:00');
  });

  it('enforces the minimum booking notice', async () => {
    await setSettings(sql, { minNoticeMinutes: 120 });
    const s = await slots(drA, consult, MON, at(`${MON}T09:05`));
    expect(s.at(0)).toBe('11:15'); // 09:05 + 2h = 11:05 → next start on the grid
  });

  it('applies the notice across days', async () => {
    await setSettings(sql, { minNoticeMinutes: 24 * 60 });
    const s = await slots(drA, consult, TUE, at(`${MON}T14:10`));
    expect(s.at(0)).toBe('14:15');
  });

  it('enforces the maximum booking window', async () => {
    await setSettings(sql, { bookingWindowDays: 7 }); // today 1 Nov → last bookable date 8 Nov
    expect(await slots(drA, consult, '2026-11-06')).not.toEqual([]);
    expect(await slots(drA, consult, '2026-11-09')).toEqual([]);
    const dates = await getOnlineDates(sql, { doctorId: drA, serviceId: consult, from: '2026-11-01', to: '2026-11-30', now: NOW });
    expect(dates).toEqual({ ok: true, dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'] });
  });

  it('returns nothing for past dates', async () => {
    expect(await slots(drA, consult, '2026-10-30')).toEqual([]);
  });

  it('rejects invalid dates', async () => {
    expect(await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: '2026-02-30', now: NOW })).toEqual({
      ok: false,
      reason: 'invalid_date',
    });
    expect(
      await getOnlineDates(sql, { doctorId: drA, serviceId: consult, from: '2026-11-10', to: '2026-11-01', now: NOW }),
    ).toEqual({ ok: false, reason: 'invalid_date' });
  });
});

describe('fail-safe eligibility', () => {
  const reasonOf = async (doctorId: string, serviceId: string) => {
    const r = await getOnlineSlots(sql, { doctorId, serviceId, date: MON, now: NOW });
    return r.ok ? 'ok' : r.reason;
  };

  it('online booking globally off', async () => {
    await setSettings(sql, { onlineEnabled: false });
    expect(await reasonOf(drA, consult)).toBe('online_disabled');
  });

  it('doctor inactive', async () => {
    await sql`UPDATE doctors SET active = false WHERE id = ${drA}`;
    expect(await reasonOf(drA, consult)).toBe('doctor_unavailable');
  });

  it('doctor does not accept online bookings', async () => {
    await sql`UPDATE doctors SET accepts_online = false WHERE id = ${drA}`;
    expect(await reasonOf(drA, consult)).toBe('doctor_unavailable');
  });

  it('service inactive', async () => {
    await sql`UPDATE services SET active = false WHERE id = ${consult}`;
    expect(await reasonOf(drA, consult)).toBe('service_unavailable');
  });

  it('service not visible online', async () => {
    await sql`UPDATE services SET online_visible = false WHERE id = ${consult}`;
    expect(await reasonOf(drA, consult)).toBe('service_unavailable');
  });

  it('doctor not assigned to the service', async () => {
    expect(await reasonOf(drB, long)).toBe('doctor_not_offering_service');
  });

  it('unknown doctor or service (e.g. nothing configured yet)', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    expect(await reasonOf(missing, consult)).toBe('doctor_unavailable');
    expect(await reasonOf(drA, missing)).toBe('service_unavailable');
  });

  it('doctor without any schedule has no availability', async () => {
    const drC = await addDoctor(sql, 'Dr. C');
    await sql`INSERT INTO doctor_services (doctor_id, service_id) VALUES (${drC}, ${consult})`;
    expect(await slots(drC, consult, MON)).toEqual([]);
    const dates = await getOnlineDates(sql, { doctorId: drC, serviceId: consult, from: MON, to: '2026-11-30', now: NOW });
    expect(dates).toEqual({ ok: true, dates: [] });
  });
});

describe('Kosovo time zone', () => {
  it('returns UTC instants that match the local wall-clock time, winter and summer', async () => {
    const winter = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: MON, now: NOW });
    expect(winter.ok && winter.slots[0]).toEqual({ startsAt: '2026-11-02T07:00:00.000Z', time: '08:00' });

    const summerNow = at('2026-07-01T12:00');
    const summer = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: '2026-07-06', now: summerNow });
    expect(summer.ok && summer.slots[0]).toEqual({ startsAt: '2026-07-06T06:00:00.000Z', time: '08:00' });
  });

  it('handles the October daylight-saving week', async () => {
    const now = at('2026-10-20T12:00');
    // Friday 23 Oct (UTC+2) and Monday 26 Oct (UTC+1): same local hours.
    const fri = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: '2026-10-23', now });
    const mon = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: '2026-10-26', now });
    expect(fri.ok && fri.slots[0].startsAt).toBe('2026-10-23T06:00:00.000Z');
    expect(mon.ok && mon.slots[0].startsAt).toBe('2026-10-26T07:00:00.000Z');
    expect(fri.ok && times(fri.slots)).toEqual([...MORNING_30, ...AFTERNOON_30]);
    expect(mon.ok && times(mon.slots)).toEqual([...MORNING_30, ...AFTERNOON_30]);
  });

  it('blocks a full local day of time off across the March change', async () => {
    const now = at('2026-03-20T12:00');
    await addOverride(sql, '2026-03-29', drA, 'custom_hours', ['08:00', '10:00']); // working Sunday
    await addTimeOff(sql, drA, '2026-03-29T00:00', '2026-03-30T00:00'); // that whole (23-hour) day off
    expect(await slots(drA, consult, '2026-03-29', now)).toEqual([]);
    expect((await slots(drA, consult, '2026-03-30', now)).at(0)).toBe('08:00');
  });
});
