import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { getOnlineSlots } from '../../src/server/booking/availability.ts';
import {
  cancelAppointmentByPatient,
  cancelAppointmentByStaff,
  createOnlineBooking,
  createStaffAppointment,
  getByManageToken,
  rescheduleAppointment,
  setAppointmentStatus,
} from '../../src/server/booking/appointments.ts';
import { BookingError } from '../../src/server/booking/errors.ts';
import { normalizePhone } from '../../src/server/booking/phone.ts';
import {
  addAppointment,
  addDoctor,
  addOverride,
  addService,
  addTimeOff,
  addWeekly,
  at,
  bookingErrorCode,
  clearAll,
  iso,
  newKey,
  setSettings,
  times,
} from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

let sql: Sql;
let drA: string; // Mon–Fri 08:00–12:00 + 13:00–17:00
let drB: string; // Mon–Fri 09:00–17:00
let consult: string; // 30 min, both
let surgery: string; // 120 min, Dr A only, not online
const staff = { userId: null };

const NOW = at('2026-11-01T12:00'); // Sunday
const MON = '2026-11-02';

const online = (overrides: Record<string, unknown> = {}) => ({
  doctorId: drA,
  serviceId: consult,
  startsAt: iso(`${MON}T10:00`),
  lang: 'en',
  idempotencyKey: newKey(),
  patientName: 'Arta Krasniqi',
  patientPhone: '044 123 456',
  patientEmail: 'Arta@Example.com',
  ...overrides,
});

const staffInput = (overrides: Record<string, unknown> = {}) => ({
  doctorId: drA,
  serviceId: consult,
  startsAt: iso(`${MON}T10:00`),
  patientName: 'Phone Patient',
  patientPhone: '+49 151 12345678',
  ...overrides,
});

async function slotTimes(doctorId = drA, date = MON, now = NOW, serviceId = consult) {
  const r = await getOnlineSlots(sql, { doctorId, serviceId, date, now });
  if (!r.ok) throw new Error(r.reason);
  return times(r.slots);
}

async function countAppointments() {
  const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM appointments`;
  return count;
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
  await addWeekly(sql, drB, [1, 2, 3, 4, 5], ['09:00', '17:00']);
  consult = await addService(sql, 'Konsultë', 30, [drA, drB]);
  surgery = await addService(sql, 'Implant', 120, [drA], { onlineVisible: false });
});

describe('online booking', () => {
  it('creates a scheduled appointment, normalises contact data and takes the slot', async () => {
    const result = await createOnlineBooking(sql, online(), { now: NOW });
    expect(result.duplicate).toBe(false);
    expect(result.manageToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const a = result.appointment;
    expect(a).toMatchObject({
      doctorId: drA,
      doctorName: 'Dr. A',
      serviceName: 'Konsultë',
      status: 'scheduled',
      source: 'online',
      lang: 'en',
      patientPhone: '+38344123456',
      patientEmail: 'arta@example.com',
    });
    expect(a.startsAt.toISOString()).toBe('2026-11-02T09:00:00.000Z'); // 10:00 Kosovo time
    expect(a.endsAt.getTime() - a.startsAt.getTime()).toBe(30 * 60_000);
    expect(await slotTimes()).not.toContain('10:00');

    const [event] = await sql`SELECT * FROM appointment_events WHERE appointment_id = ${a.id}`;
    expect(event).toMatchObject({ type: 'created', actorType: 'patient', toStatus: 'scheduled' });
  });

  it('uses the service duration from the database, whatever the client sends', async () => {
    const r = await createOnlineBooking(sql, online({ endsAt: iso(`${MON}T16:00`), durationMin: 300 }), { now: NOW });
    expect(r.appointment.endsAt.getTime() - r.appointment.startsAt.getTime()).toBe(30 * 60_000);
  });

  it('accepts no email by default (patients get SMS) and requires one only when the clinic turns it on', async () => {
    const r = await createOnlineBooking(sql, online({ patientEmail: '' }), { now: NOW });
    expect(r.appointment.patientEmail).toBeNull();
    await setSettings(sql, { emailRequired: true });
    expect(await bookingErrorCode(createOnlineBooking(sql, online({ patientEmail: '', startsAt: iso(`${MON}T11:00`) }), { now: NOW }))).toBe('email_required');
  });

  it('rejects invalid or manipulated input', async () => {
    const code = (o: Record<string, unknown>) => bookingErrorCode(createOnlineBooking(sql, online(o), { now: NOW }));
    expect(await code({ doctorId: 'not-a-uuid' })).toBe('invalid_input');
    expect(await code({ startsAt: 'tomorrow' })).toBe('invalid_input');
    expect(await code({ startsAt: '2026-11-02T09:00:30Z' })).toBe('invalid_input'); // not a whole minute
    expect(await code({ lang: 'fr' })).toBe('invalid_input');
    expect(await code({ patientName: 'A' })).toBe('invalid_input');
    expect(await code({ patientEmail: 'not-an-email' })).toBe('invalid_input');
    expect(await code({ idempotencyKey: 'short' })).toBe('invalid_input');
    expect(await code({ patientPhone: '12345' })).toBe('invalid_phone');
    expect(await countAppointments()).toBe(0);
  });

  it('rejects start times the engine would not offer', async () => {
    const code = (local: string) =>
      bookingErrorCode(createOnlineBooking(sql, online({ startsAt: iso(local) }), { now: NOW }));
    expect(await code(`${MON}T10:07`)).toBe('slot_unavailable'); // off the 15-minute grid
    expect(await code(`${MON}T12:15`)).toBe('slot_unavailable'); // lunch break
    expect(await code(`${MON}T11:45`)).toBe('slot_unavailable'); // runs into the break
    expect(await code(`${MON}T16:45`)).toBe('slot_unavailable'); // runs past closing
    expect(await code('2026-11-01T10:00')).toBe('slot_unavailable'); // Sunday, and in the past
    expect(await code('2027-03-01T10:00')).toBe('slot_unavailable'); // beyond the 90-day window
  });

  it('enforces online eligibility at booking time', async () => {
    expect(await bookingErrorCode(createOnlineBooking(sql, online({ serviceId: surgery }), { now: NOW }))).toBe(
      'service_unavailable',
    );
    await sql`UPDATE doctors SET accepts_online = false WHERE id = ${drA}`;
    expect(await bookingErrorCode(createOnlineBooking(sql, online(), { now: NOW }))).toBe('doctor_unavailable');
    await setSettings(sql, { onlineEnabled: false });
    expect(await bookingErrorCode(createOnlineBooking(sql, online({ doctorId: drB }), { now: NOW }))).toBe('online_disabled');
  });

  it('enforces the minimum notice at booking time', async () => {
    await setSettings(sql, { minNoticeMinutes: 120 });
    const now = at(`${MON}T09:00`);
    expect(await bookingErrorCode(createOnlineBooking(sql, online({ startsAt: iso(`${MON}T10:00`) }), { now }))).toBe(
      'slot_unavailable',
    );
    await expect(createOnlineBooking(sql, online({ startsAt: iso(`${MON}T11:00`) }), { now })).resolves.toBeTruthy();
  });
});

describe('stale availability', () => {
  it('rejects a slot taken by someone else after it was shown', async () => {
    expect(await slotTimes()).toContain('10:00'); // patient sees 10:00
    await createStaffAppointment(sql, staffInput({ startsAt: iso(`${MON}T10:00`) }), staff, { now: NOW }); // receptionist takes it
    expect(await bookingErrorCode(createOnlineBooking(sql, online(), { now: NOW }))).toBe('slot_unavailable');
  });

  it('rejects a slot that now overlaps a newer appointment', async () => {
    await createOnlineBooking(sql, online({ startsAt: iso(`${MON}T10:15`) }), { now: NOW });
    expect(await bookingErrorCode(createOnlineBooking(sql, online({ startsAt: iso(`${MON}T10:00`) }), { now: NOW }))).toBe(
      'slot_unavailable',
    );
  });

  it('rejects a slot after time off or a closure was added', async () => {
    await addTimeOff(sql, drA, `${MON}T09:00`, `${MON}T11:00`, 'sick');
    expect(await bookingErrorCode(createOnlineBooking(sql, online(), { now: NOW }))).toBe('slot_unavailable');
    await addOverride(sql, '2026-11-03', null, 'closed');
    expect(
      await bookingErrorCode(createOnlineBooking(sql, online({ startsAt: iso('2026-11-03T10:00') }), { now: NOW })),
    ).toBe('slot_unavailable');
  });

  it('rejects a slot after the doctor stopped accepting online bookings', async () => {
    await sql`UPDATE doctors SET accepts_online = false WHERE id = ${drA}`;
    expect(await bookingErrorCode(createOnlineBooking(sql, online(), { now: NOW }))).toBe('doctor_unavailable');
  });
});

describe('concurrency', () => {
  it('lets exactly one of several simultaneous bookings for the same slot succeed', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) =>
        createOnlineBooking(sql, online({ patientPhone: `+3834412345${i}` }), { now: NOW }),
      ),
    );
    const ok = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(failed.every((r) => r.reason instanceof BookingError && r.reason.code === 'slot_unavailable')).toBe(true);
    expect(await countAppointments()).toBe(1);
  });

  it('lets only one of two overlapping (not identical) bookings succeed', async () => {
    const results = await Promise.allSettled([
      createOnlineBooking(sql, online({ startsAt: iso(`${MON}T10:00`) }), { now: NOW }),
      createOnlineBooking(sql, online({ startsAt: iso(`${MON}T10:15`) }), { now: NOW }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('resolves a patient and the receptionist booking the same time simultaneously', async () => {
    const results = await Promise.allSettled([
      createOnlineBooking(sql, online(), { now: NOW }),
      createStaffAppointment(sql, staffInput(), staff, { now: NOW }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')!;
    expect(['slot_unavailable', 'appointment_conflict']).toContain(failed.reason.code);
    expect(await countAppointments()).toBe(1);
  });

  it('allows simultaneous bookings for different doctors at the same time', async () => {
    const results = await Promise.allSettled([
      createOnlineBooking(sql, online({ doctorId: drA }), { now: NOW }),
      createOnlineBooking(sql, online({ doctorId: drB }), { now: NOW }),
    ]);
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
  });
});

describe('duplicate submissions', () => {
  it('returns the same booking for a repeated submit', async () => {
    const input = online();
    const first = await createOnlineBooking(sql, input, { now: NOW });
    const second = await createOnlineBooking(sql, input, { now: NOW });
    expect(second.duplicate).toBe(true);
    expect(second.appointment.id).toBe(first.appointment.id);
    expect(second.manageToken).toBeNull(); // the secret is only handed out once
    expect(await countAppointments()).toBe(1);
  });

  it('handles a double-click (simultaneous identical submits)', async () => {
    const input = online();
    const results = await Promise.all([1, 2, 3].map(() => createOnlineBooking(sql, input, { now: NOW })));
    expect(new Set(results.map((r) => r.appointment.id)).size).toBe(1);
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    expect(await countAppointments()).toBe(1);
  });

  it('refuses to reuse a key for a different booking', async () => {
    const input = online();
    await createOnlineBooking(sql, input, { now: NOW });
    expect(
      await bookingErrorCode(createOnlineBooking(sql, { ...input, startsAt: iso(`${MON}T11:00`) }, { now: NOW })),
    ).toBe('idempotency_conflict');
  });
});

describe('staff booking', () => {
  it('ignores online-only rules', async () => {
    await setSettings(sql, { onlineEnabled: false, minNoticeMinutes: 24 * 60 });
    await sql`UPDATE doctors SET accepts_online = false WHERE id = ${drA}`;
    const r = await createStaffAppointment(sql, staffInput({ serviceId: surgery, startsAt: iso(`${MON}T08:10`) }), staff, {
      now: at(`${MON}T07:30`),
    });
    expect(r.appointment.source).toBe('staff');
    expect(r.appointment.patientPhone).toBe('+4915112345678');
    expect(r.appointment.endsAt.getTime() - r.appointment.startsAt.getTime()).toBe(120 * 60_000);
    expect(r.overriddenIssues).toEqual([]);
  });

  it('requires an explicit override outside working hours, during time off or on a closed day', async () => {
    const attempt = (local: string, allow = false) =>
      createStaffAppointment(sql, staffInput({ startsAt: iso(local), allowOutsideWorkingHours: allow }), staff, { now: NOW });

    const lunch = await attempt(`${MON}T12:00`).catch((e) => e);
    expect(lunch.code).toBe('working_rules');
    expect(lunch.details).toEqual([
      { code: 'outside_working_hours', hours: [{ startMinute: 480, endMinute: 720 }, { startMinute: 780, endMinute: 1020 }], dayOff: false, noSchedule: false },
    ]);
    const r = await attempt(`${MON}T12:00`, true);
    expect(r.overriddenIssues).toEqual(['outside_working_hours']);
    const [event] = await sql`SELECT details FROM appointment_events WHERE appointment_id = ${r.appointment.id}`;
    expect(event.details).toEqual({ overriddenIssues: ['outside_working_hours'] });

    await addTimeOff(sql, drA, '2026-11-03T00:00', '2026-11-04T00:00');
    expect(await attempt('2026-11-03T10:00').catch((e) => e.details)).toEqual([{ code: 'doctor_time_off', reason: 'vacation', note: null }]);
    await addOverride(sql, '2026-11-04', null, 'closed');
    expect(await attempt('2026-11-04T10:00').catch((e) => e.details)).toEqual([{ code: 'clinic_closed', note: null }]);
  });

  it('never allows overlapping another appointment, even with the override', async () => {
    await createOnlineBooking(sql, online(), { now: NOW });
    const attempt = createStaffAppointment(
      sql,
      staffInput({ startsAt: iso(`${MON}T10:15`), allowOutsideWorkingHours: true }),
      staff,
      { now: NOW },
    );
    expect(await bookingErrorCode(attempt)).toBe('appointment_conflict');
  });

  it('checks doctor, service and assignment', async () => {
    expect(await bookingErrorCode(createStaffAppointment(sql, staffInput({ doctorId: drB, serviceId: surgery }), staff, { now: NOW }))).toBe(
      'doctor_not_offering_service',
    );
    await sql`UPDATE services SET active = false WHERE id = ${consult}`;
    expect(await bookingErrorCode(createStaffAppointment(sql, staffInput(), staff, { now: NOW }))).toBe('service_unavailable');
    await sql`UPDATE doctors SET active = false WHERE id = ${drB}`;
    expect(await bookingErrorCode(createStaffAppointment(sql, staffInput({ doctorId: drB }), staff, { now: NOW }))).toBe(
      'doctor_unavailable',
    );
  });

  it('rejects times in the past', async () => {
    expect(await bookingErrorCode(createStaffAppointment(sql, staffInput(), staff, { now: at(`${MON}T10:01`) }))).toBe('in_past');
  });
});

describe('rescheduling', () => {
  it('releases the old time and takes the new one', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    const r = await rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${MON}T14:00`) }, staff, { now: NOW });
    expect(r.changed).toBe(true);
    expect(r.appointment.startsAt.getTime()).toBe(at(`${MON}T14:00`));
    const s = await slotTimes();
    expect(s).toContain('10:00');
    expect(s).not.toContain('14:00');

    const [event] = await sql`SELECT * FROM appointment_events WHERE appointment_id = ${appointment.id} AND type = 'rescheduled'`;
    expect(event.fromStartsAt.getTime()).toBe(at(`${MON}T10:00`));
    expect(event.toStartsAt.getTime()).toBe(at(`${MON}T14:00`));
  });

  it('can move by a few minutes into its own old time', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    const r = await rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${MON}T10:15`) }, staff, { now: NOW });
    expect(r.appointment.startsAt.getTime()).toBe(at(`${MON}T10:15`));
  });

  it('refuses to move onto another appointment', async () => {
    const first = await createOnlineBooking(sql, online(), { now: NOW });
    await createOnlineBooking(sql, online({ startsAt: iso(`${MON}T14:00`) }), { now: NOW });
    const attempt = rescheduleAppointment(
      sql,
      { appointmentId: first.appointment.id, startsAt: iso(`${MON}T14:15`), allowOutsideWorkingHours: true },
      staff,
      { now: NOW },
    );
    expect(await bookingErrorCode(attempt)).toBe('appointment_conflict');
    // Nothing changed: the original time is still taken.
    expect(await slotTimes()).not.toContain('10:00');
  });

  it('moves to another doctor who offers the service, not to one who does not', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    const r = await rescheduleAppointment(sql, { appointmentId: appointment.id, doctorId: drB, startsAt: iso(`${MON}T10:00`) }, staff, {
      now: NOW,
    });
    expect(r.appointment.doctorId).toBe(drB);
    expect(await slotTimes(drA)).toContain('10:00');
    expect(await slotTimes(drB)).not.toContain('10:00');

    const s = await createStaffAppointment(sql, staffInput({ serviceId: surgery, startsAt: iso(`${MON}T13:00`) }), staff, { now: NOW });
    expect(
      await bookingErrorCode(
        rescheduleAppointment(sql, { appointmentId: s.appointment.id, doctorId: drB, startsAt: iso(`${MON}T13:00`) }, staff, { now: NOW }),
      ),
    ).toBe('doctor_not_offering_service');
  });

  it('keeps the appointment’s own duration after the service duration changed', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    await sql`UPDATE services SET duration_min = 60 WHERE id = ${consult}`;
    const r = await rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${MON}T15:00`) }, staff, { now: NOW });
    expect(r.appointment.endsAt.getTime() - r.appointment.startsAt.getTime()).toBe(30 * 60_000);
  });

  it('lets only one of two simultaneous moves into the same time succeed', async () => {
    const a = await createOnlineBooking(sql, online({ startsAt: iso(`${MON}T09:00`) }), { now: NOW });
    const b = await createOnlineBooking(sql, online({ startsAt: iso(`${MON}T09:30`) }), { now: NOW });
    const results = await Promise.allSettled(
      [a, b].map((x) =>
        rescheduleAppointment(sql, { appointmentId: x.appointment.id, startsAt: iso(`${MON}T15:00`) }, staff, { now: NOW }),
      ),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('only moves scheduled appointments', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    await cancelAppointmentByStaff(sql, { appointmentId: appointment.id }, staff);
    expect(
      await bookingErrorCode(rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${MON}T14:00`) }, staff, { now: NOW })),
    ).toBe('invalid_status');
  });
});

describe('cancellation', () => {
  it('staff cancellation frees the time and keeps the record', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    const cancelled = await cancelAppointmentByStaff(sql, { appointmentId: appointment.id, reason: 'Patient called' }, staff);
    expect(cancelled).toMatchObject({ status: 'cancelled', cancelReason: 'Patient called' });
    expect(await slotTimes()).toContain('10:00');
    expect(await countAppointments()).toBe(1);
    expect(await bookingErrorCode(cancelAppointmentByStaff(sql, { appointmentId: appointment.id }, staff))).toBe('invalid_status');
    // The freed time can be booked again.
    await expect(createOnlineBooking(sql, online(), { now: NOW })).resolves.toBeTruthy();
  });

  it('patient can cancel through the link before the deadline, not after', async () => {
    const { manageToken } = await createOnlineBooking(sql, online(), { now: NOW }); // Mon 10:00
    const dayBefore = at('2026-11-01T09:59');
    const tooLate = at('2026-11-01T10:01'); // less than 24 h before

    const view = await getByManageToken(sql, manageToken!, { now: dayBefore });
    expect(view).toMatchObject({ canCancel: true });
    expect((await getByManageToken(sql, manageToken!, { now: tooLate }))?.canCancel).toBe(false);

    expect(await bookingErrorCode(cancelAppointmentByPatient(sql, manageToken!, { now: tooLate }))).toBe('cancel_deadline_passed');
    const cancelled = await cancelAppointmentByPatient(sql, manageToken!, { now: dayBefore });
    expect(cancelled.status).toBe('cancelled');
    const [event] = await sql`SELECT actor_type FROM appointment_events WHERE appointment_id = ${cancelled.id} AND type = 'cancelled'`;
    expect(event.actorType).toBe('patient');
  });

  it('rejects unknown or malformed tokens', async () => {
    expect(await getByManageToken(sql, 'x'.repeat(43))).toBeUndefined();
    expect(await getByManageToken(sql, "' OR 1=1 --")).toBeUndefined();
    expect(await bookingErrorCode(cancelAppointmentByPatient(sql, 'y'.repeat(43)))).toBe('not_found');
  });
});

describe('statuses', () => {
  it('marks completed or no-show only after the start, and the time stays occupied', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    expect(
      await bookingErrorCode(setAppointmentStatus(sql, { appointmentId: appointment.id, status: 'completed' }, staff, { now: NOW })),
    ).toBe('invalid_status');
    const after = at(`${MON}T10:30`);
    const done = await setAppointmentStatus(sql, { appointmentId: appointment.id, status: 'completed' }, staff, { now: after });
    expect(done.status).toBe('completed');
    expect(await slotTimes(drA, MON, at(`${MON}T07:00`))).not.toContain('10:00');

    const noShow = await setAppointmentStatus(sql, { appointmentId: appointment.id, status: 'no_show' }, staff, { now: after });
    expect(noShow.status).toBe('no_show');
    const back = await setAppointmentStatus(sql, { appointmentId: appointment.id, status: 'scheduled' }, staff, { now: after });
    expect(back.status).toBe('scheduled');
  });

  it('cannot change a cancelled appointment', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    await cancelAppointmentByStaff(sql, { appointmentId: appointment.id }, staff);
    expect(
      await bookingErrorCode(
        setAppointmentStatus(sql, { appointmentId: appointment.id, status: 'completed' }, staff, { now: at(`${MON}T11:00`) }),
      ),
    ).toBe('invalid_status');
  });
});

describe('configuration changes never touch existing appointments', () => {
  it('keeps appointments when the doctor is deactivated, the service disabled or its duration changed', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    await sql`UPDATE doctors SET active = false WHERE id = ${drA}`;
    await sql`UPDATE services SET active = false, online_visible = false, duration_min = 90 WHERE id = ${consult}`;
    const [row] = await sql`SELECT status, starts_at, ends_at FROM appointments WHERE id = ${appointment.id}`;
    expect(row.status).toBe('scheduled');
    expect(row.endsAt.getTime() - row.startsAt.getTime()).toBe(30 * 60_000);
  });

  it('keeps appointments that now fall in new time off or outside new hours', async () => {
    const { appointment } = await createOnlineBooking(sql, online(), { now: NOW });
    await addTimeOff(sql, drA, `${MON}T00:00`, '2026-11-03T00:00');
    await sql`DELETE FROM weekly_schedules WHERE doctor_id = ${drA}`;
    const [row] = await sql`SELECT status FROM appointments WHERE id = ${appointment.id}`;
    expect(row.status).toBe('scheduled');
  });

  it('still blocks the time of an existing appointment after the doctor’s hours changed', async () => {
    await addAppointment(sql, drA, consult, `${MON}T10:00`, `${MON}T10:30`);
    await sql`DELETE FROM weekly_schedules WHERE doctor_id = ${drA}`;
    await addWeekly(sql, drA, [1], ['09:00', '12:00']);
    expect(await slotTimes()).not.toContain('10:00');
  });
});

describe('phone numbers', () => {
  it('normalises Kosovo and international numbers to E.164', () => {
    expect(normalizePhone('044 123 456')).toBe('+38344123456');
    expect(normalizePhone('049/123-456')).toBe('+38349123456');
    expect(normalizePhone('+383 44 123 456')).toBe('+38344123456');
    expect(normalizePhone('00383 44 123 456')).toBe('+38344123456');
    expect(normalizePhone('0151 12345678', 'DE')).toBe('+4915112345678');
    expect(normalizePhone('+43 664 1234567')).toBe('+436641234567');
    expect(normalizePhone('+41 79 123 45 67')).toBe('+41791234567');
    expect(normalizePhone('12')).toBeNull();
    expect(normalizePhone('+383 99 999 999')).toBeNull();
    expect(normalizePhone('hello')).toBeNull();
  });
});
