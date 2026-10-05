import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { adminCatalog, adminCreateAppointment, adminReschedule, adminSlots } from '../../src/server/http/admin-api.ts';
import {
  cancelAppointmentByStaff,
  createStaffAppointment,
  getAppointment,
  setAppointmentStatus,
  updateAppointmentDetails,
} from '../../src/server/booking/appointments.ts';
import { layoutLanes, loadCalendar } from '../../src/server/admin/calendar.ts';
import { addAppointment, addDoctor, addOverride, addService, addTimeOff, addWeekly, at, bookingErrorCode, clearAll, iso } from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

let sql: Sql;
let drA: string; // Mon–Fri 08–12, 13–17
let drB: string; // no schedule
let consult: string;
let hidden: string; // not online
let userId: string;
const NOW = at('2026-11-01T12:00'); // Sunday
const MON = '2026-11-02';
const actor = () => ({ userId });

const create = (overrides: Record<string, unknown> = {}) =>
  createStaffAppointment(
    sql,
    { doctorId: drA, serviceId: consult, startsAt: iso(`${MON}T10:00`), patientName: 'Phone Patient', patientPhone: '044 123 456', ...overrides },
    actor(),
    { now: NOW },
  );

beforeAll(async () => {
  sql = await createTestDb();
});
afterAll(async () => {
  await sql?.end();
});
beforeEach(async () => {
  await clearAll(sql);
  drA = await addDoctor(sql, 'Dr. Petriti', { sortOrder: 1 });
  drB = await addDoctor(sql, 'Dr. Vlera', { sortOrder: 2 });
  await addWeekly(sql, drA, [1, 2, 3, 4, 5], ['08:00', '12:00'], ['13:00', '17:00']);
  consult = await addService(sql, 'Konsultë', 30, [drA, drB]);
  hidden = await addService(sql, 'Implant', 120, [drA], { onlineVisible: false });
  const [u] = await sql<{ id: string }[]>`INSERT INTO admin_users (email, name, password_hash) VALUES ('s@k.test', 'Arbëresha', 'x') RETURNING id`;
  userId = u.id;
});

describe('admin catalog', () => {
  it('includes services that are not visible online and flags dentists without a schedule', async () => {
    const body = (await adminCatalog(sql)).body as { services: { id: string; onlineVisible: boolean }[]; doctors: { id: string; hasSchedule: boolean }[] };
    expect(body.services.map((s) => s.id).sort()).toEqual([consult, hidden].sort());
    expect(body.services.find((s) => s.id === hidden)?.onlineVisible).toBe(false);
    expect(body.doctors.find((d) => d.id === drB)?.hasSchedule).toBe(false);
  });
});

describe('staff time options', () => {
  const slots = async (params: Record<string, string>, now = NOW) =>
    (await adminSlots(sql, new URLSearchParams(params), now)).body as {
      slots: { time: string; issues: { code: string; text: string }[] }[];
      working: unknown[];
      hasWeeklySchedule: boolean;
    };

  it('marks normal times and explains the others in plain words', async () => {
    await addTimeOff(sql, drA, `${MON}T15:00`, `${MON}T17:00`, 'vacation');
    const r = await slots({ doctorId: drA, serviceId: consult, date: MON });
    const t = (time: string) => r.slots.find((s) => s.time === time);
    expect(t('09:00')?.issues).toEqual([]);
    expect(t('12:00')?.issues[0].text).toBe('Kjo kohë është jashtë orarit të Dr. Petriti (08:00–12:00, 13:00–17:00).');
    expect(t('15:00')?.issues[0].text).toBe('Dr. Petriti është shënuar me pushim në këtë kohë.');
  });

  it('never offers times that overlap another appointment or lie in the past', async () => {
    await create();
    const r = await slots({ doctorId: drA, serviceId: consult, date: MON }, at(`${MON}T08:20`));
    const times = r.slots.map((s) => s.time);
    expect(times).not.toContain('08:15'); // past
    expect(times).not.toContain('09:45'); // would run into the 10:00 appointment
    expect(times).not.toContain('10:00');
    expect(times).toContain('10:30');
  });

  it('explains a closed clinic and a dentist without any schedule', async () => {
    await addOverride(sql, MON, null, 'closed');
    const closed = await slots({ doctorId: drA, serviceId: consult, date: MON });
    expect(closed.slots[0].issues[0].text).toBe('Klinika është e mbyllur në këtë datë.');
    const none = await slots({ doctorId: drB, serviceId: consult, date: '2026-11-03' });
    expect(none.hasWeeklySchedule).toBe(false);
    expect(none.slots[0].issues[0].text).toBe('Dr. Vlera nuk ka ende orar pune të konfiguruar.');
  });

  it('uses the appointment’s own duration and ignores its own time when rescheduling', async () => {
    const { appointment } = await create({ serviceId: hidden, startsAt: iso(`${MON}T08:00`) }); // 120 min, 08–10
    const r = await slots({ doctorId: drA, appointmentId: appointment.id, date: MON });
    const free = r.slots.filter((s) => s.issues.length === 0).map((s) => s.time);
    expect(free).toContain('08:00'); // its own current slot is not "busy"
    expect(free).toContain('10:00');
    expect(free).not.toContain('10:15'); // 10:15 + 2h runs into the lunch break
  });
});

describe('manual booking through the admin API', () => {
  it('explains why a time is outside normal availability and requires an explicit override', async () => {
    await addTimeOff(sql, drA, `${MON}T00:00`, '2026-11-03T00:00', 'vacation');
    const body = { doctorId: drA, serviceId: consult, startsAt: iso(`${MON}T10:00`), patientName: 'Walk In', patientPhone: '044 123 456' };
    const refused = await adminCreateAppointment(sql, body, actor(), NOW);
    expect(refused.status).toBe(409);
    expect(refused.body).toEqual({
      error: 'working_rules',
      issues: [{ code: 'doctor_time_off', text: 'Dr. Petriti është shënuar me pushim në këtë kohë.' }],
    });
    const forced = await adminCreateAppointment(sql, { ...body, allowOutsideWorkingHours: true }, actor(), NOW);
    expect(forced.status).toBe(201);
  });

  it('never allows an overlap, even with the override', async () => {
    await create();
    const res = await adminCreateAppointment(
      sql,
      { doctorId: drA, serviceId: consult, startsAt: iso(`${MON}T10:15`), patientName: 'Second', patientPhone: '044 123 457', allowOutsideWorkingHours: true },
      actor(),
      NOW,
    );
    expect(res).toEqual({ status: 409, body: { error: 'appointment_conflict' } });
  });

  it('stores a landline for staff bookings', async () => {
    const res = await adminCreateAppointment(
      sql,
      { doctorId: drA, serviceId: consult, startsAt: iso(`${MON}T11:00`), patientName: 'Landline', patientPhone: '038 123 456' },
      actor(),
      NOW,
    );
    expect(res.status).toBe(201);
  });
});

describe('concurrent edits by different staff members', () => {
  it('detects a stale version on reschedule, cancel, status and edits', async () => {
    const { appointment } = await create();
    const v1 = appointment.updatedAt.getTime();
    await updateAppointmentDetails(sql, { appointmentId: appointment.id, expectedVersion: v1, staffNote: 'Called back' }, actor());

    const stale = adminReschedule(sql, appointment.id, { startsAt: iso(`${MON}T14:00`), expectedVersion: v1 }, actor(), NOW);
    expect(await stale).toEqual({ status: 409, body: { error: 'concurrent_change' } });
    expect(await bookingErrorCode(cancelAppointmentByStaff(sql, { appointmentId: appointment.id, expectedVersion: v1 }, actor()))).toBe('concurrent_change');
    expect(
      await bookingErrorCode(setAppointmentStatus(sql, { appointmentId: appointment.id, status: 'completed', expectedVersion: v1 }, actor(), { now: at(`${MON}T11:00`) })),
    ).toBe('concurrent_change');

    const fresh = (await getAppointment(sql, appointment.id))!;
    const ok = await adminReschedule(sql, appointment.id, { startsAt: iso(`${MON}T14:00`), expectedVersion: fresh.updatedAt.getTime() }, actor(), NOW);
    expect(ok.status).toBe(200);
  });

  it('explains rule problems when rescheduling', async () => {
    const { appointment } = await create();
    const res = await adminReschedule(sql, appointment.id, { startsAt: iso(`${MON}T12:15`) }, actor(), NOW);
    expect(res.body).toMatchObject({ error: 'working_rules', issues: [{ code: 'outside_working_hours' }] });
  });
});

describe('editing contact details and the internal note', () => {
  it('updates fields, normalises the phone and records which fields changed', async () => {
    const { appointment } = await create();
    const updated = await updateAppointmentDetails(
      sql,
      {
        appointmentId: appointment.id,
        contact: { patientName: 'Phone Patient', patientPhone: '+49 151 12345678', patientEmail: 'NEW@Example.com' },
        staffNote: 'Prefers mornings',
      },
      actor(),
    );
    expect(updated).toMatchObject({ patientPhone: '+4915112345678', patientEmail: 'new@example.com', staffNote: 'Prefers mornings' });
    const [event] = await sql`SELECT details, actor_user_id FROM appointment_events WHERE type = 'edited'`;
    expect(event.details).toEqual({ fields: ['patientPhone', 'patientEmail', 'staffNote'] });
    expect(event.actorUserId).toBe(userId);
  });

  it('does nothing when nothing changed, and rejects invalid contact data', async () => {
    const { appointment } = await create();
    await updateAppointmentDetails(sql, { appointmentId: appointment.id, staffNote: '' }, actor());
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM appointment_events WHERE type = 'edited'`;
    expect(count).toBe(0);
    expect(
      await bookingErrorCode(
        updateAppointmentDetails(sql, { appointmentId: appointment.id, contact: { patientName: 'X', patientPhone: '12', patientEmail: '' } }, actor()),
      ),
    ).toBe('invalid_input');
  });

  it('works on cancelled appointments (history stays editable)', async () => {
    const { appointment } = await create();
    await cancelAppointmentByStaff(sql, { appointmentId: appointment.id }, actor());
    const updated = await updateAppointmentDetails(sql, { appointmentId: appointment.id, staffNote: 'Patient travelling' }, actor());
    expect(updated.status).toBe('cancelled');
    expect(updated.staffNote).toBe('Patient travelling');
  });
});

describe('calendar data', () => {
  it('places appointments by Kosovo time with one column per dentist (day view)', async () => {
    await create({ startsAt: iso(`${MON}T09:30`) });
    const cal = await loadCalendar(sql, { view: 'day', date: MON, doctorId: null, showCancelled: false, now: NOW });
    expect(cal.columns.map((c) => c.title)).toEqual(['Dr. Petriti', 'Dr. Vlera']);
    const a = cal.columns[0].appointments[0];
    expect(a).toMatchObject({ startMinute: 570, endMinute: 600, timeLabel: '09:30–10:00', patientName: 'Phone Patient' });
    expect(cal.columns[0].working).toEqual([{ startMinute: 480, endMinute: 720 }, { startMinute: 780, endMinute: 1020 }]);
    expect(cal.columns[1].working).toEqual([]);
    expect(cal.doctors.find((d) => d.id === drB)?.hasSchedule).toBe(false);
    expect(cal.hourStart).toBe(8);
    expect(cal.hourEnd).toBe(18);
  });

  it('hides cancelled appointments unless asked, and filters by dentist', async () => {
    const { appointment } = await create();
    await cancelAppointmentByStaff(sql, { appointmentId: appointment.id }, actor());
    await create({ doctorId: drB, startsAt: iso(`${MON}T10:00`), allowOutsideWorkingHours: true });
    const hiddenCancelled = await loadCalendar(sql, { view: 'day', date: MON, doctorId: null, showCancelled: false, now: NOW });
    expect(hiddenCancelled.agenda[0].items.map((i) => i.status)).toEqual(['scheduled']);
    const shown = await loadCalendar(sql, { view: 'day', date: MON, doctorId: null, showCancelled: true, now: NOW });
    expect(shown.agenda[0].items).toHaveLength(2);
    const onlyA = await loadCalendar(sql, { view: 'day', date: MON, doctorId: drA, showCancelled: true, now: NOW });
    expect(onlyA.columns.map((c) => c.doctorId)).toEqual([drA]);
    expect(onlyA.agenda[0].items.every((i) => i.doctorId === drA)).toBe(true);
  });

  it('shows the week Monday–Sunday with time off and closures for a filtered dentist', async () => {
    await addTimeOff(sql, drA, '2026-11-04T10:00', '2026-11-04T12:00', 'training');
    await addOverride(sql, '2026-11-05', null, 'closed');
    const cal = await loadCalendar(sql, { view: 'week', date: '2026-11-04', doctorId: drA, showCancelled: false, now: NOW });
    expect(cal.from).toBe('2026-11-02');
    expect(cal.to).toBe('2026-11-08');
    expect(cal.columns).toHaveLength(7);
    expect(cal.columns[2].timeOff).toEqual([{ startMinute: 600, endMinute: 720, reason: 'training', note: null }]);
    expect(cal.columns[3].closed).toEqual({ note: null });
    expect(cal.nowMinute).toBeNull(); // NOW (1 Nov) is not in this week
  });

  it('keeps showing an inactive dentist who still has appointments', async () => {
    await addAppointment(sql, drB, consult, `${MON}T10:00`, `${MON}T10:30`);
    await sql`UPDATE doctors SET active = false WHERE id = ${drB}`;
    const cal = await loadCalendar(sql, { view: 'day', date: MON, doctorId: null, showCancelled: false, now: NOW });
    expect(cal.columns.map((c) => c.title)).toContain('Dr. Vlera');
    const nextWeek = await loadCalendar(sql, { view: 'day', date: '2026-11-09', doctorId: null, showCancelled: false, now: NOW });
    expect(nextWeek.columns.map((c) => c.title)).toEqual(['Dr. Petriti']);
  });

  it('lays overlapping blocks side by side', () => {
    const items = [
      { id: 'a', startMinute: 600, endMinute: 660, lane: 0, lanes: 1 },
      { id: 'b', startMinute: 630, endMinute: 690, lane: 0, lanes: 1 },
      { id: 'c', startMinute: 690, endMinute: 720, lane: 0, lanes: 1 },
    ];
    const out = layoutLanes(items);
    expect(out.map((i) => [i.id, i.lane, i.lanes])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 1],
    ]);
  });
});
