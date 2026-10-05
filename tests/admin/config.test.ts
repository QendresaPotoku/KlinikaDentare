import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import {
  ConfigError,
  createDoctor,
  createStaffUser,
  deleteDateOverride,
  deleteDoctor,
  deleteService,
  deleteTimeOff,
  resetStaffPassword,
  saveDateOverride,
  saveService,
  saveSettings,
  saveTimeOff,
  saveWeeklySchedule,
  updateDoctor,
  updateStaffUser,
} from '../../src/server/admin/config.ts';
import { findAttention } from '../../src/server/admin/attention.ts';
import { createStaffAppointment, rescheduleAppointment } from '../../src/server/booking/appointments.ts';
import { createSession, getSessionUser } from '../../src/server/auth/session.ts';
import { getOnlineSlots } from '../../src/server/booking/availability.ts';
import { addDoctor, addService, addWeekly, at, clearAll, iso, setSettings, times } from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

let sql: Sql;
let drA: string;
let drB: string;
let consult: string;
const NOW = at('2026-11-01T12:00'); // Sunday
const MON = '2026-11-02';
const staff = { userId: null };
const MON_FRI = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, periods: [{ start: '08:00', end: '12:00' }, { start: '13:00', end: '17:00' }] }));

async function book(local: string, doctorId = drA, serviceId = consult, extra: Record<string, unknown> = {}) {
  const r = await createStaffAppointment(
    sql,
    { doctorId, serviceId, startsAt: iso(local), patientName: 'Arta Hoxha', patientPhone: '044 123 456', ...extra },
    staff,
    { now: NOW },
  );
  return r.appointment.id;
}

/** Runs a save, returns the conflict list it reports (or [] if it saved). */
async function conflictsOf(promise: Promise<unknown>) {
  try {
    await promise;
    return [];
  } catch (err) {
    if (err instanceof ConfigError && err.code === 'conflicts') return err.conflicts;
    throw err;
  }
}
const errorCode = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e instanceof ConfigError ? e.code : String(e)));
const version = async (table: string, id: string | number) =>
  (await sql.unsafe(`SELECT updated_at FROM ${table} WHERE id = $1`, [id as string]))[0].updatedAt.getTime() as number;

beforeAll(async () => {
  sql = await createTestDb();
});
afterAll(async () => {
  await sql?.end();
});
beforeEach(async () => {
  await clearAll(sql);
  await setSettings(sql, { onlineEnabled: true, minNoticeMinutes: 0 });
  drA = await addDoctor(sql, 'Dr. Petriti');
  drB = await addDoctor(sql, 'Dr. Vlera');
  await addWeekly(sql, drA, [1, 2, 3, 4, 5], ['08:00', '12:00'], ['13:00', '17:00']);
  await addWeekly(sql, drB, [1, 2, 3, 4, 5], ['09:00', '17:00']);
  consult = await addService(sql, 'Konsultë', 30, [drA, drB]);
});

describe('weekly schedule', () => {
  it('saves split shifts and days off; online availability follows immediately', async () => {
    await saveWeeklySchedule(sql, {
      doctorId: drA,
      days: [{ weekday: 1, periods: [{ start: '09:00', end: '11:00' }, { start: '14:00', end: '15:00' }] }],
    }, { now: NOW });
    const slots = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: MON, now: NOW });
    expect(slots.ok && times(slots.slots)).toEqual(['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '14:00', '14:15', '14:30']);
    const tue = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: '2026-11-03', now: NOW });
    expect(tue.ok && tue.slots).toEqual([]);
  });

  it('rejects invalid and overlapping periods with a readable message', async () => {
    const bad = (periods: { start: string; end: string }[]) =>
      saveWeeklySchedule(sql, { doctorId: drA, days: [{ weekday: 2, periods }] }).catch((e: ConfigError) => e.fields.periods);
    expect(await bad([{ start: '12:00', end: '08:00' }])).toBe('E martë: ora e mbarimit (08:00) duhet të jetë pas orës së fillimit (12:00).');
    expect(await bad([{ start: '08:00', end: '12:00' }, { start: '11:00', end: '13:00' }])).toBe('E martë: oraret mbivendosen. Kontrolloni periudhat.');
    expect(await bad([{ start: '8', end: '12:00' }])).toBe('E martë: shkruani orët si 08:00.');
  });

  it('warns about appointments outside the new hours, saves only after acknowledgement, never touches them', async () => {
    const early = await book(`${MON}T08:30`);
    const late = await book(`${MON}T16:00`);
    await book(`${MON}T10:00`); // still inside the new hours
    const newHours = [{ weekday: 1, periods: [{ start: '09:00', end: '15:00' }] }];

    const conflicts = await conflictsOf(saveWeeklySchedule(sql, { doctorId: drA, days: newHours }, { now: NOW }));
    expect(conflicts.map((c) => c.id).sort()).toEqual([early, late].sort());
    expect(conflicts[0].reasons[0].text).toBe('Kjo kohë është jashtë orarit të Dr. Petriti (09:00–15:00).');
    // Nothing was saved.
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM weekly_schedules WHERE doctor_id = ${drA}`;
    expect(count).toBe(10);

    await saveWeeklySchedule(sql, { doctorId: drA, days: newHours }, { now: NOW, acknowledged: [early, late] });
    const [{ count: after }] = await sql`SELECT count(*)::int AS count FROM weekly_schedules WHERE doctor_id = ${drA}`;
    expect(after).toBe(1);
    const statuses = await sql`SELECT status FROM appointments`;
    expect(statuses.every((s) => s.status === 'scheduled')).toBe(true);
    expect((await findAttention(sql, { now: NOW })).map((a) => a.id).sort()).toEqual([early, late].sort());
  });

  it('re-checks on confirmation: an appointment created after the warning must be acknowledged too', async () => {
    const first = await book(`${MON}T08:30`);
    const newHours = [{ weekday: 1, periods: [{ start: '09:00', end: '15:00' }] }];
    await conflictsOf(saveWeeklySchedule(sql, { doctorId: drA, days: newHours }, { now: NOW }));
    const second = await book(`${MON}T16:00`); // booked by a colleague meanwhile
    const again = await conflictsOf(saveWeeklySchedule(sql, { doctorId: drA, days: newHours }, { now: NOW, acknowledged: [first] }));
    expect(again.map((c) => c.id).sort()).toEqual([first, second].sort());
  });

  it('refuses a stale save', async () => {
    const v = await version('doctors', drA);
    await saveWeeklySchedule(sql, { doctorId: drA, version: v, days: MON_FRI }, { now: NOW });
    expect(await errorCode(saveWeeklySchedule(sql, { doctorId: drA, version: v, days: [] }, { now: NOW }))).toBe('stale');
  });
});

describe('dentists', () => {
  it('warns before deactivating a dentist with future appointments and keeps them', async () => {
    const id = await book(`${MON}T10:00`);
    const input = { doctorId: drA, name: 'Dr. Petriti', active: false, acceptsOnline: true, serviceIds: [consult] };
    const conflicts = await conflictsOf(updateDoctor(sql, input, { now: NOW }));
    expect(conflicts.map((c) => [c.id, c.reasons[0].text])).toEqual([[id, 'Dr. Petriti nuk është më aktiv/e në sistem.']]);
    await updateDoctor(sql, input, { now: NOW, acknowledged: [id] });
    const [row] = await sql`SELECT status FROM appointments WHERE id = ${id}`;
    expect(row.status).toBe('scheduled');
  });

  it('warns when a service is removed from a dentist who has appointments for it', async () => {
    const id = await book(`${MON}T10:00`);
    const conflicts = await conflictsOf(
      updateDoctor(sql, { doctorId: drA, name: 'Dr. Petriti', active: true, acceptsOnline: true, serviceIds: [] }, { now: NOW }),
    );
    expect(conflicts[0]).toMatchObject({ id, reasons: [{ code: 'doctor_not_offering_service', text: 'Dr. Petriti nuk e ofron më shërbimin “Konsultë”.' }] });
  });

  it('turning online booking off creates no conflicts', async () => {
    await book(`${MON}T10:00`);
    await expect(updateDoctor(sql, { doctorId: drA, name: 'Dr. Petriti', active: true, acceptsOnline: false, serviceIds: [consult] }, { now: NOW })).resolves.toEqual({ conflicts: [] });
  });

  it('can be deleted only without appointment history', async () => {
    await book(`${MON}T10:00`);
    expect(await errorCode(deleteDoctor(sql, drA))).toBe('in_use');
    const fresh = await createDoctor(sql, { name: 'Dr. Typo' });
    await deleteDoctor(sql, fresh);
    expect(await sql`SELECT 1 FROM doctors WHERE id = ${fresh}`).toHaveLength(0);
  });
});

describe('services', () => {
  it('creates a service with translations and dentists', async () => {
    const { id } = await saveService(sql, { nameSq: 'Pastrim', nameEn: 'Cleaning', nameDe: '', durationMin: 45, active: true, onlineVisible: true, doctorIds: [drB] });
    const [s] = await sql`SELECT name_en, name_de, duration_min FROM services WHERE id = ${id}`;
    expect(s).toEqual({ nameEn: 'Cleaning', nameDe: null, durationMin: 45 });
    expect((await sql`SELECT doctor_id FROM doctor_services WHERE service_id = ${id}`).map((r) => r.doctorId)).toEqual([drB]);
  });

  it('validates duration', async () => {
    const err = await saveService(sql, { nameSq: 'X', nameEn: '', nameDe: '', durationMin: 7, active: true, onlineVisible: true, doctorIds: [] }).catch((e) => e);
    expect(err.fields).toMatchObject({ nameSq: expect.any(String), durationMin: expect.stringContaining('5 deri në 720') });
  });

  it('duration changes affect new appointments only', async () => {
    const id = await book(`${MON}T10:00`);
    await saveService(sql, { serviceId: consult, nameSq: 'Konsultë', nameEn: '', nameDe: '', durationMin: 60, active: true, onlineVisible: true, doctorIds: [drA, drB] }, { now: NOW });
    const [a] = await sql`SELECT ends_at - starts_at AS len FROM appointments WHERE id = ${id}`;
    expect(a.len).toBe('00:30:00');
  });

  it('warns before deactivating a service or removing a dentist from it', async () => {
    const id = await book(`${MON}T10:00`);
    const base = { serviceId: consult, nameSq: 'Konsultë', nameEn: '', nameDe: '', durationMin: 30, onlineVisible: true };
    const off = await conflictsOf(saveService(sql, { ...base, active: false, doctorIds: [drA, drB] }, { now: NOW }));
    expect(off[0].reasons[0].code).toBe('service_inactive');
    const removed = await conflictsOf(saveService(sql, { ...base, active: true, doctorIds: [drB] }, { now: NOW }));
    expect(removed.map((c) => c.id)).toEqual([id]);
  });

  it('cannot be deleted with appointment history', async () => {
    await book(`${MON}T10:00`);
    expect(await errorCode(deleteService(sql, consult))).toBe('in_use');
  });
});

describe('time off', () => {
  it('blocks a range of full days (inclusive) and reports conflicting appointments', async () => {
    const a = await book(`${MON}T10:00`);
    const b = await book('2026-11-04T15:00');
    await book('2026-11-05T10:00'); // after the vacation
    const input = { doctorId: drA, reason: 'vacation', mode: 'days' as const, fromDate: MON, toDate: '2026-11-04' };
    const conflicts = await conflictsOf(saveTimeOff(sql, input, { now: NOW }));
    expect(conflicts.map((c) => c.id)).toEqual([a, b]);
    expect(conflicts[0].reasons[0].text).toBe('Dr. Petriti është shënuar me pushim në këtë kohë.');
    const { id } = await saveTimeOff(sql, input, { now: NOW, acknowledged: [a, b] });
    const [row] = await sql`SELECT starts_at, ends_at, all_day FROM time_off WHERE id = ${id}`;
    expect(row.startsAt.toISOString()).toBe('2026-11-01T23:00:00.000Z'); // Mon 00:00 Kosovo
    expect(row.endsAt.toISOString()).toBe('2026-11-04T23:00:00.000Z'); // Thu 00:00 Kosovo
    expect(row.allDay).toBe(true);
  });

  it('supports part of a day and validates input', async () => {
    const { id } = await saveTimeOff(sql, { doctorId: drA, reason: 'personal', mode: 'hours', date: MON, fromTime: '10:00', toTime: '12:00' }, { now: NOW });
    const slots = await getOnlineSlots(sql, { doctorId: drA, serviceId: consult, date: MON, now: NOW });
    expect(slots.ok && times(slots.slots).filter((t) => t < '12:00').at(-1)).toBe('09:30');
    await deleteTimeOff(sql, id);
    expect(await errorCode(saveTimeOff(sql, { doctorId: drA, reason: 'vacation', mode: 'days', fromDate: '2026-11-05', toDate: MON }))).toBe('invalid');
    expect(await errorCode(saveTimeOff(sql, { doctorId: drA, reason: 'party', mode: 'days', fromDate: MON }))).toBe('invalid');
  });

  it('removing the time off resolves the attention item automatically', async () => {
    const a = await book(`${MON}T10:00`);
    const { id } = await saveTimeOff(sql, { doctorId: drA, reason: 'sick', mode: 'days', fromDate: MON }, { now: NOW, acknowledged: [a] });
    expect(await findAttention(sql, { now: NOW })).toHaveLength(1);
    await deleteTimeOff(sql, id);
    expect(await findAttention(sql, { now: NOW })).toHaveLength(0);
  });

  it('also resolves when the appointment is moved', async () => {
    const a = await book(`${MON}T10:00`);
    await saveTimeOff(sql, { doctorId: drA, reason: 'sick', mode: 'days', fromDate: MON }, { now: NOW, acknowledged: [a] });
    await rescheduleAppointment(sql, { appointmentId: a, startsAt: iso('2026-11-03T10:00') }, staff, { now: NOW });
    expect(await findAttention(sql, { now: NOW })).toHaveLength(0);
  });
});

describe('special dates', () => {
  it('closing the clinic affects every dentist and can cover several days', async () => {
    const a = await book(`${MON}T10:00`);
    const b = await book('2026-11-03T10:00', drB);
    const conflicts = await conflictsOf(saveDateOverride(sql, { doctorId: null, date: MON, toDate: '2026-11-03', kind: 'closed', periods: [] }, { now: NOW }));
    expect(conflicts.map((c) => c.id)).toEqual([a, b]);
    expect(conflicts[0].reasons[0].text).toBe('Klinika është e mbyllur në këtë datë.');
    const { ids } = await saveDateOverride(sql, { doctorId: null, date: MON, toDate: '2026-11-03', kind: 'closed', periods: [], note: 'Festë' }, { now: NOW, acknowledged: [a, b] });
    expect(ids).toHaveLength(2);
    expect((await findAttention(sql, { now: NOW }))[0].reasons[0].text).toBe('Klinika është e mbyllur në këtë datë (Festë).');
  });

  it('clinic special hours conflict with appointments outside them', async () => {
    const late = await book(`${MON}T15:00`);
    const conflicts = await conflictsOf(saveDateOverride(sql, { doctorId: null, date: MON, kind: 'custom_hours', periods: [{ start: '08:00', end: '12:00' }] }, { now: NOW }));
    expect(conflicts.map((c) => c.id)).toEqual([late]);
  });

  it('an exceptional working day adds availability without conflicts; removing it can create conflicts', async () => {
    const sunday = '2026-11-08';
    const { ids } = await saveDateOverride(sql, { doctorId: drA, date: sunday, kind: 'custom_hours', periods: [{ start: '09:00', end: '12:00' }] }, { now: NOW });
    const appt = await book(`${sunday}T10:00`);
    const conflicts = await conflictsOf(deleteDateOverride(sql, ids[0], { now: NOW }));
    expect(conflicts.map((c) => c.id)).toEqual([appt]);
  });

  it('refuses a second entry for the same date and scope', async () => {
    await saveDateOverride(sql, { doctorId: drA, date: MON, kind: 'closed', periods: [] }, { now: NOW, acknowledged: [] });
    const err = await saveDateOverride(sql, { doctorId: drA, date: MON, kind: 'closed', periods: [] }).catch((e) => e);
    expect(err.code).toBe('exists');
    // A clinic entry and a doctor entry for the same date may coexist.
    await saveDateOverride(sql, { doctorId: null, date: MON, kind: 'custom_hours', periods: [{ start: '08:00', end: '16:00' }] }, { now: NOW });
  });
});

describe('needs attention', () => {
  it('does not report a rule that staff explicitly overrode when booking', async () => {
    await book(`${MON}T12:00`, drA, consult, { allowOutsideWorkingHours: true }); // lunch break, on purpose
    expect(await findAttention(sql, { now: NOW })).toEqual([]);
  });

  it('ignores past, cancelled and completed appointments', async () => {
    const id = await book(`${MON}T10:00`);
    await saveTimeOff(sql, { doctorId: drA, reason: 'vacation', mode: 'days', fromDate: MON }, { now: NOW, acknowledged: [id] });
    expect(await findAttention(sql, { now: at(`${MON}T11:00`) })).toHaveLength(0);
    await sql`UPDATE appointments SET status = 'cancelled', cancelled_at = now(), cancelled_by_type = 'staff'`;
    expect(await findAttention(sql, { now: NOW })).toHaveLength(0);
  });
});

describe('settings', () => {
  const base = {
    onlineEnabled: true,
    disabledMessageSq: 'Na telefononi.',
    disabledMessageEn: 'Please call us.',
    disabledMessageDe: 'Bitte rufen Sie an.',
    bookingWindowDays: 60,
    minNoticeMinutes: 240,
    cancelDeadlineHours: 48,
    slotStepMinutes: 30,
    emailRequired: false,
    clinicNotifyEmail: 'Klinika@Example.com',
  };
  it('saves valid values and validates ranges', async () => {
    await saveSettings(sql, base, null);
    const [s] = await sql`SELECT booking_window_days, slot_step_minutes, clinic_notify_email, email_required FROM settings`;
    expect(s).toEqual({ bookingWindowDays: 60, slotStepMinutes: 30, clinicNotifyEmail: 'klinika@example.com', emailRequired: false });
    const err = await saveSettings(sql, { ...base, bookingWindowDays: 0, slotStepMinutes: 7, disabledMessageEn: '', clinicNotifyEmail: 'x' }, null).catch((e) => e);
    expect(Object.keys(err.fields).sort()).toEqual(['bookingWindowDays', 'clinicNotifyEmail', 'disabledMessageEn', 'slotStepMinutes']);
  });

  it('refuses a stale save', async () => {
    const v = await version('settings', 1);
    await saveSettings(sql, { ...base, version: v }, null);
    expect(await errorCode(saveSettings(sql, { ...base, version: v }, null))).toBe('stale');
  });
});

describe('staff accounts', () => {
  it('creates accounts with unique emails', async () => {
    await createStaffUser(sql, { name: 'Arbëresha', email: 'A@k.test', password: 'long-enough-1' });
    expect(await errorCode(createStaffUser(sql, { name: 'Other', email: 'a@k.test', password: 'long-enough-2' }))).toBe('email_taken');
  });

  it('never leaves the clinic without an active account, and nobody deactivates themselves', async () => {
    const a = await createStaffUser(sql, { name: 'Ana', email: 'a@k.test', password: 'long-enough-1' });
    const b = await createStaffUser(sql, { name: 'Besa', email: 'b@k.test', password: 'long-enough-2' });
    const edit = (userId: string, active: boolean, actor: string) =>
      updateStaffUser(sql, { userId, name: userId === a ? 'Ana' : 'Besa', email: userId === a ? 'a@k.test' : 'b@k.test', active }, actor);
    expect(await errorCode(edit(a, false, a))).toBe('self');
    await edit(b, false, a);
    // Now A is the only active account: it cannot be deactivated (by anyone).
    expect(await errorCode(edit(a, false, b))).toBe('last_active');
  });

  it('deactivation and password reset end sessions immediately', async () => {
    const a = await createStaffUser(sql, { name: 'Ana', email: 'a@k.test', password: 'long-enough-1' });
    const b = await createStaffUser(sql, { name: 'Besa', email: 'b@k.test', password: 'long-enough-2' });
    const sb = await createSession(sql, b, {}, NOW);
    await updateStaffUser(sql, { userId: b, name: 'Besa', email: 'b@k.test', active: false }, a);
    expect(await getSessionUser(sql, sb.token, NOW + 1000)).toBeNull();

    const own = await createSession(sql, a, {}, NOW);
    const other = await createSession(sql, a, {}, NOW);
    await resetStaffPassword(sql, { userId: a, password: 'new-password-123', repeat: 'new-password-123' }, own.token);
    expect(await getSessionUser(sql, own.token, NOW + 1000)).not.toBeNull(); // the session doing the change stays
    expect(await getSessionUser(sql, other.token, NOW + 1000)).toBeNull();
    expect(await errorCode(resetStaffPassword(sql, { userId: a, password: 'abc', repeat: 'abc' }))).toBe('invalid');
  });
});
