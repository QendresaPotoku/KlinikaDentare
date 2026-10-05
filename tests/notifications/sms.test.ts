import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import {
  cancelAppointmentByPatient,
  cancelAppointmentByStaff,
  createOnlineBooking,
  createStaffAppointment,
  rescheduleAppointment,
  updateAppointmentDetails,
} from '../../src/server/booking/appointments.ts';
import { dispatchDue, retryNotification } from '../../src/server/notifications/dispatcher.ts';
import { MemoryEmailProvider } from '../../src/server/notifications/email.ts';
import { manageTokenFor } from '../../src/server/notifications/manage-link.ts';
import { plannedReminder, reminderTimeFor } from '../../src/server/notifications/patient-sms.ts';
import { renderPatientSms } from '../../src/server/notifications/sms-templates.ts';
import { ConsoleSmsProvider, isGsm7, maskPhone, MemorySmsProvider, smsSegments, SmsSendError, toGsm7 } from '../../src/server/notifications/sms.ts';
import { loadPatientNotifications, notificationState } from '../../src/server/admin/notifications.ts';
import { addDoctor, addService, addWeekly, at, clearAll, iso, newKey, setSettings } from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

const SECRET = 'sms-test-secret-0123456789abcdefghijkl';
const SITE = 'https://www.klinika-test.com';
const NOW = at('2026-11-01T12:00'); // Sunday
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';
const THU = '2026-11-05';
const HOUR = 3_600_000;

const MOBILE_DE = '+4915112345678';
const MOBILE_XK = '+38344123456';
const LANDLINE_XK = '+38338123456';

let sql: Sql;
let drA: string;
let drB: string;
let consult: string;
let sms: MemorySmsProvider;
let mail: MemoryEmailProvider;
const staff = { userId: null };

const online = (overrides: Record<string, unknown> = {}, now = NOW) =>
  createOnlineBooking(
    sql,
    {
      doctorId: drA,
      serviceId: consult,
      startsAt: iso(`${WED}T10:00`),
      lang: 'en',
      idempotencyKey: newKey(),
      patientName: 'Lena Berisha',
      patientPhone: MOBILE_DE,
      ...overrides,
    },
    { now, secret: SECRET },
  );

const staffBooking = (overrides: Record<string, unknown> = {}, now = NOW) =>
  createStaffAppointment(
    sql,
    { doctorId: drA, serviceId: consult, startsAt: iso(`${WED}T09:00`), patientName: 'Phone Patient', patientPhone: MOBILE_XK, lang: 'sq', ...overrides },
    staff,
    { now, secret: SECRET },
  );

const dispatchAt = (now: number, opts: Partial<Parameters<typeof dispatchDue>[1]> = {}) =>
  dispatchDue(sql, { now, email: mail, sms, siteUrl: SITE, secret: SECRET, ...opts });

const smsRows = () =>
  sql<{ id: string; type: string; status: string; recipient: string; lang: string; attempts: number; skipReason: string | null; failureKind: string | null; scheduledFor: Date; payload: { startsAt: string; doctorName: string } }[]>`
    SELECT id, type, status, recipient, lang, attempts, skip_reason, failure_kind, scheduled_for, payload
    FROM notifications WHERE channel = 'sms' ORDER BY created_at, type`;

const reminders = async () => (await smsRows()).filter((r) => r.type === 'reminder');
const pendingReminders = async () => (await reminders()).filter((r) => r.status === 'pending');

beforeAll(async () => {
  sql = await createTestDb();
});
afterAll(async () => {
  await sql?.end();
});
beforeEach(async () => {
  await clearAll(sql);
  await setSettings(sql, { onlineEnabled: true, minNoticeMinutes: 0, clinicNotifyEmail: 'klinika@example.com' });
  drA = await addDoctor(sql, 'Dr. Petriti');
  drB = await addDoctor(sql, 'Dr. Vlera');
  await addWeekly(sql, drA, [1, 2, 3, 4, 5], ['08:00', '17:00']);
  await addWeekly(sql, drB, [1, 2, 3, 4, 5], ['08:00', '17:00']);
  consult = await addService(sql, 'Konsultë', 30, [drA, drB], { nameEn: 'Consultation', nameDe: 'Beratung' });
  sms = new MemorySmsProvider();
  mail = new MemoryEmailProvider();
});
afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------- confirmation

describe('confirmation SMS', () => {
  it('an online booking queues exactly one confirmation SMS, due immediately, to the E.164 number', async () => {
    await online({ patientPhone: '044 123 456', lang: 'sq' });
    const confirmations = (await smsRows()).filter((r) => r.type === 'confirmation');
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0]).toMatchObject({ status: 'pending', recipient: MOBILE_XK, lang: 'sq' });
    expect(confirmations[0].scheduledFor.getTime()).toBeLessThanOrEqual(NOW);
    await dispatchAt(NOW + 1000);
    expect(sms.sent.map((m) => [m.tag, m.to])).toEqual([['confirmation', MOBILE_XK]]);
  });

  it('is written in the booking language with service, dentist, date, time and the cancellation link', async () => {
    const a = await online({ lang: 'sq', startsAt: iso(`${WED}T10:00`) });
    const b = await online({ lang: 'en', startsAt: iso(`${WED}T11:00`), doctorId: drB });
    const c = await online({ lang: 'de', startsAt: iso(`${WED}T12:00`) });
    await dispatchAt(NOW + 1000);
    const textFor = (lang: string) => sms.sent.find((m) => m.text.includes(`/${lang}/termin/`))!.text;
    const [sq, en, de] = [textFor('sq'), textFor('en'), textFor('de')];
    expect(sms.sent).toHaveLength(3);
    const link = (lang: string, id: string) => `${SITE}/${lang}/termin/${manageTokenFor(id, SECRET)}/`;
    expect(sq).toBe(`Klinika Dentare Dr. Petriti & Dr. Vlera: Termini juaj u rezervua: Konsulte, Dr. Petriti, mer 4 nen, ora 10:00 (ora e Kosoves). Per ta anuluar: ${link('sq', a.appointment.id)}`);
    expect(en).toBe(`Klinika Dentare Dr. Petriti & Dr. Vlera: Your appointment is booked: Consultation, Dr. Vlera, Wed 4 Nov, 11:00 (Kosovo time). To cancel: ${link('en', b.appointment.id)}`);
    expect(de).toBe(`Klinika Dentare Dr. Petriti & Dr. Vlera: Ihr Termin ist gebucht: Beratung, Dr. Petriti, Mi, 4. Nov, 12:00 Uhr (Ortszeit Kosovo). Stornieren: ${link('de', c.appointment.id)}`);
    for (const t of [sq, en, de]) {
      expect(isGsm7(t)).toBe(true);
      expect(smsSegments(t)).toBeLessThanOrEqual(2);
    }
  });

  it('staff bookings get no confirmation SMS, only the reminder', async () => {
    await staffBooking();
    expect((await smsRows()).map((r) => r.type)).toEqual(['reminder']);
  });
});

// ---------------------------------------------------------------- reminder scheduling

describe('reminder scheduling', () => {
  it('is scheduled for the same Kosovo time on the day before', async () => {
    await online({ startsAt: iso(`${WED}T10:00`) });
    const [r] = await pendingReminders();
    expect(r.scheduledFor.getTime()).toBe(at(`${TUE}T10:00`));
    expect(r.scheduledFor.getTime()).toBe(at(`${WED}T10:00`) - 24 * HOUR);
  });

  it('handles daylight-saving changes in the clinic time zone (25 h in autumn, 23 h in spring)', async () => {
    // Clocks go back at 03:00 on Sun 25 Oct 2026 and forward at 02:00 on Sun 28 Mar 2027 (Europe/Belgrade).
    // Only an appointment on the change day itself has its reminder on the other side of the change.
    expect(reminderTimeFor(at('2026-10-25T10:00'))).toBe(at('2026-10-24T10:00'));
    expect(at('2026-10-25T10:00') - reminderTimeFor(at('2026-10-25T10:00'))).toBe(25 * HOUR);
    expect(reminderTimeFor(at('2027-03-28T10:00'))).toBe(at('2027-03-27T10:00'));
    expect(at('2027-03-28T10:00') - reminderTimeFor(at('2027-03-28T10:00'))).toBe(23 * HOUR);
    // Next to the change, nothing moves: Monday 10:00 → Sunday 10:00 is exactly 24 h.
    expect(at('2026-10-26T10:00') - reminderTimeFor(at('2026-10-26T10:00'))).toBe(24 * HOUR);
    // Stored correctly by a real booking (staff, on the closed Sunday) across the autumn change.
    await staffBooking({ startsAt: iso('2026-10-25T10:00'), allowOutsideWorkingHours: true }, at('2026-10-20T12:00'));
    const [r] = await pendingReminders();
    expect(r.scheduledFor.toISOString()).toBe('2026-10-24T08:00:00.000Z'); // Sat 10:00 CEST (UTC+2)
    expect(r.payload.startsAt).toBe('2026-10-25T09:00:00.000Z'); // Sun 10:00 CET (UTC+1)
  });

  it('a booking made less than about a day ahead gets the confirmation only', async () => {
    await online({ startsAt: iso(`${MON}T10:00`) }); // 22 h ahead: the reminder time has passed
    await online({ startsAt: iso(`${MON}T12:30`) }); // 24.5 h ahead: a reminder 30 min after the confirmation
    await online({ startsAt: iso(`${MON}T14:00`) }); // 26 h ahead: reminder in 2 h, planned
    const rs = await reminders();
    expect(rs.map((r) => [r.status, r.skipReason])).toEqual([
      ['skipped', 'booked_within_reminder_window'],
      ['skipped', 'booked_within_reminder_window'],
      ['pending', null],
    ]);
    expect(plannedReminder(at(`${MON}T10:00`), NOW)).toBeNull();
    expect(plannedReminder(at(`${MON}T14:00`), NOW)).toBe(at('2026-11-01T14:00'));
    await dispatchAt(NOW + 1000);
    expect(sms.sent.map((m) => m.tag)).toEqual(['confirmation', 'confirmation', 'confirmation']);
    for (const t of [at('2026-11-01T14:00'), at(`${MON}T09:00`), at(`${MON}T12:00`)]) await dispatchAt(t);
    expect(sms.sent.filter((m) => m.tag === 'reminder').map((m) => m.text)).toEqual([expect.stringContaining('Mon 2 Nov, 14:00')]);
  });

  it('is not sent early, is sent once when due, and carries the details but no link', async () => {
    await online({ startsAt: iso(`${WED}T10:00`) });
    await dispatchAt(NOW + 1000); // confirmation only
    await dispatchAt(at(`${TUE}T09:59`));
    expect(sms.sent.map((m) => m.tag)).toEqual(['confirmation']);
    await dispatchAt(at(`${TUE}T10:00`));
    const reminder = sms.sent.find((m) => m.tag === 'reminder')!;
    expect(reminder.text).toBe('Klinika Dentare Dr. Petriti & Dr. Vlera: Reminder: Consultation, Dr. Petriti, Wed 4 Nov, 10:00 (Kosovo time). Can\'t come? Please call +383 44 292 393');
    expect(reminder.text).not.toContain('/termin/');
    expect(smsSegments(reminder.text)).toBe(1);
  });

  it('repeated and concurrent worker runs never send a reminder twice', async () => {
    await online({ startsAt: iso(`${WED}T10:00`) });
    sms.delayMs = 25;
    const due = at(`${TUE}T10:00`);
    await Promise.all([dispatchAt(due), dispatchAt(due), dispatchAt(due)]);
    await dispatchAt(due + 60_000);
    await dispatchAt(due + 6 * HOUR);
    expect(sms.sent.map((m) => m.tag).sort()).toEqual(['confirmation', 'reminder']);
  });
});

// ---------------------------------------------------------------- lifecycle

describe('reminder lifecycle', () => {
  it('a cancellation by staff or patient cancels the pending reminder', async () => {
    const a = await online({ startsAt: iso(`${WED}T10:00`) });
    const b = await online({ startsAt: iso(`${WED}T11:00`) });
    await cancelAppointmentByStaff(sql, { appointmentId: a.appointment.id }, staff);
    await cancelAppointmentByPatient(sql, b.manageToken!, { now: NOW });
    expect((await reminders()).map((r) => [r.status, r.skipReason])).toEqual([
      ['skipped', 'superseded_by_cancellation'],
      ['skipped', 'superseded_by_cancellation'],
    ]);
    await dispatchAt(at(`${TUE}T12:00`));
    expect(sms.sent).toEqual([]); // not even the confirmations, which were still waiting
  });

  it('a reschedule replaces the reminder with one for the new time and dentist', async () => {
    const { appointment } = await online({ startsAt: iso(`${WED}T10:00`) });
    await dispatchAt(NOW + 1000);
    await rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${THU}T15:00`), doctorId: drB }, staff, { now: NOW + HOUR });
    const rs = await reminders();
    expect(rs.map((r) => [r.status, r.skipReason])).toEqual([
      ['skipped', 'superseded_by_reschedule'],
      ['pending', null],
    ]);
    expect(rs[1].scheduledFor.getTime()).toBe(at(`${WED}T15:00`));
    expect(rs[1].payload).toMatchObject({ startsAt: new Date(at(`${THU}T15:00`)).toISOString(), doctorName: 'Dr. Vlera' });
    await dispatchAt(at(`${TUE}T10:00`)); // old reminder time: nothing
    expect(sms.sent.map((m) => m.tag)).toEqual(['confirmation']);
    await dispatchAt(at(`${WED}T15:00`));
    const reminder = sms.sent.find((m) => m.tag === 'reminder')!;
    expect(reminder.text).toContain('Dr. Vlera, Thu 5 Nov, 15:00');
    expect(sms.sent).toHaveLength(2);
  });

  it('a reschedule into the reminder window leaves no reminder: no stale one, no duplicate', async () => {
    const { appointment } = await online({ startsAt: iso(`${WED}T10:00`) });
    await rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${MON}T11:00`) }, staff, { now: NOW });
    expect(await pendingReminders()).toEqual([]);
    expect((await reminders()).map((r) => r.skipReason)).toEqual(['superseded_by_reschedule', 'booked_within_reminder_window']);
    for (const t of [NOW + 1000, at(`${MON}T09:00`), at(`${TUE}T10:00`)]) await dispatchAt(t);
    expect(sms.sent.filter((m) => m.tag === 'reminder')).toEqual([]);
  });

  it('after a reminder went out, moving the appointment later plans a reminder for the new time', async () => {
    const { appointment } = await online({ startsAt: iso(`${TUE}T14:00`) });
    await dispatchAt(at(`${MON}T14:00`));
    expect(sms.sent.map((m) => m.tag).sort()).toEqual(['confirmation', 'reminder']);
    await rescheduleAppointment(sql, { appointmentId: appointment.id, startsAt: iso(`${THU}T09:00`) }, staff, { now: at(`${MON}T15:00`) });
    expect((await pendingReminders()).map((r) => r.scheduledFor.getTime())).toEqual([at(`${WED}T09:00`)]);
  });

  it('a reminder claimed just before the appointment moved is re-checked and skipped', async () => {
    const { appointment } = await online({ startsAt: iso(`${WED}T10:00`) });
    await sql`UPDATE notifications SET status = 'sending', claim_token = gen_random_uuid(), locked_until = ${new Date(at(`${TUE}T09:00`))} WHERE type = 'reminder'`;
    await sql`UPDATE appointments SET starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour' WHERE id = ${appointment.id}`;
    await dispatchAt(at(`${TUE}T10:00`));
    expect(sms.sent.filter((m) => m.tag === 'reminder')).toEqual([]);
    expect((await reminders())[0]).toMatchObject({ status: 'skipped', skipReason: 'superseded_by_reschedule' });
  });

  it('is never sent for completed or no-show appointments', async () => {
    const a = await online({ startsAt: iso(`${WED}T10:00`) });
    const b = await online({ startsAt: iso(`${WED}T11:00`) });
    await sql`UPDATE appointments SET status = 'completed' WHERE id = ${a.appointment.id}`;
    await sql`UPDATE appointments SET status = 'no_show' WHERE id = ${b.appointment.id}`;
    await dispatchAt(at(`${TUE}T12:00`));
    expect(sms.sent).toEqual([]);
    expect((await reminders()).map((r) => r.skipReason)).toEqual(['appointment_no_longer_scheduled', 'appointment_no_longer_scheduled']);
  });

  it('is skipped instead of arriving less than an hour before the appointment (e.g. after a long outage)', async () => {
    await online({ startsAt: iso(`${WED}T10:00`) });
    await dispatchAt(at(`${WED}T09:30`)); // the worker was down since Monday
    expect(sms.sent.map((m) => m.tag)).toEqual(['confirmation']);
    expect((await reminders())[0]).toMatchObject({ status: 'skipped', skipReason: 'reminder_too_late' });
  });
});

// ---------------------------------------------------------------- delivery

describe('delivery', () => {
  it('a temporary provider failure is retried with back-off and sent once', async () => {
    await online({ startsAt: iso(`${WED}T10:00`) });
    const due = at(`${TUE}T10:00`);
    await dispatchAt(NOW + 1000);
    sms.failNext = [new SmsSendError('provider 503', false), new SmsSendError('provider timeout', false)];
    expect((await dispatchAt(due)).retrying).toBe(1);
    expect((await reminders())[0]).toMatchObject({ status: 'pending', attempts: 1, failureKind: 'temporary' });
    expect((await dispatchAt(due + 30_000)).sent).toBe(0); // back-off: 1 min
    expect((await dispatchAt(due + 61_000)).retrying).toBe(1); // second failure; back-off: 5 min
    expect((await dispatchAt(due + 61_000 + 5 * 60_000)).sent).toBe(1);
    expect(sms.sent.filter((m) => m.tag === 'reminder')).toHaveLength(1);
    expect((await reminders())[0]).toMatchObject({ status: 'sent', attempts: 3 });
  });

  it('a permanent failure is marked failed and staff can retry it', async () => {
    await online();
    sms.failNext = [new SmsSendError('provider: invalid number', true)];
    expect((await dispatchAt(NOW + 1000)).failed).toBe(1);
    const [confirmation] = await smsRows();
    expect(confirmation).toMatchObject({ type: 'confirmation', status: 'failed', failureKind: 'permanent' });
    expect(await retryNotification(sql, confirmation.id)).toBe(true);
    expect((await dispatchAt(Date.now() + 1000)).sent).toBe(1);
  });

  it('an SMS failure never affects the appointment', async () => {
    sms.failNext = [new SmsSendError('provider down', false)];
    const { appointment } = await online();
    await sql`UPDATE notifications SET max_attempts = 1 WHERE channel = 'sms'`;
    await dispatchAt(NOW + 1000);
    expect((await smsRows())[0]).toMatchObject({ type: 'confirmation', status: 'failed', failureKind: 'temporary' });
    const [row] = await sql`SELECT status FROM appointments WHERE id = ${appointment.id}`;
    expect(row.status).toBe('scheduled');
    // The time stays taken.
    expect(await online().catch((e) => e.code)).toBe('slot_unavailable');
  });

  it('without a configured provider, due SMS are recorded as not configured; bookings work normally', async () => {
    const { appointment } = await online();
    expect(await dispatchAt(NOW + 1000, { sms: null })).toMatchObject({ sent: 1, skipped: 1 }); // clinic email sent
    expect((await smsRows())[0]).toMatchObject({ type: 'confirmation', status: 'skipped', skipReason: 'sms_not_configured' });
    expect((await pendingReminders())).toHaveLength(1); // the reminder is not due yet and stays planned
    const [row] = await sql`SELECT status FROM appointments WHERE id = ${appointment.id}`;
    expect(row.status).toBe('scheduled');
  });

  it('a landline never receives an SMS', async () => {
    await staffBooking({ patientPhone: LANDLINE_XK });
    expect((await reminders()).map((r) => [r.status, r.skipReason])).toEqual([['skipped', 'landline']]);
    await dispatchAt(at(`${TUE}T09:00`));
    expect(sms.sent).toEqual([]);
    // Online bookings refuse landlines up front.
    expect(await online({ patientPhone: LANDLINE_XK }).catch((e) => e.code)).toBe('phone_landline');
  });

  it('a phone change by staff redirects pending SMS; landline → mobile restores the reminder', async () => {
    const { appointment } = await staffBooking({ patientPhone: LANDLINE_XK });
    const edit = (patientPhone: string) =>
      updateAppointmentDetails(sql, { appointmentId: appointment.id, contact: { patientName: 'Phone Patient', patientPhone } }, staff);
    await edit('044 123 456');
    expect((await reminders()).map((r) => [r.status, r.recipient])).toEqual([['pending', MOBILE_XK]]);
    await edit('+41791234567');
    expect((await reminders()).map((r) => [r.status, r.recipient])).toEqual([['pending', '+41791234567']]);
    await edit('038 123 456');
    expect((await reminders()).map((r) => [r.status, r.skipReason])).toEqual([['skipped', 'landline']]);
  });

  it('logs never contain the full number, the text or the link', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { appointment } = await online();
    sms.failNext = [new SmsSendError(`provider rejected ${MOBILE_DE} for ${SITE}/en/termin/${manageTokenFor(appointment.id, SECRET)}/`, false)];
    await dispatchAt(NOW + 1000);
    await new ConsoleSmsProvider().send({ to: MOBILE_DE, text: 'Your appointment… secret', tag: 'confirmation', reference: 'r' });
    const output = [...log.mock.calls, ...warn.mock.calls].flat().join('\n');
    expect(output).toContain('+491*******678');
    expect(output).not.toContain(MOBILE_DE);
    expect(output).not.toContain('15112345678');
    expect(output).not.toContain(manageTokenFor(appointment.id, SECRET));
    expect(output).not.toContain('secret');
    const [row] = await sql`SELECT last_error FROM notifications WHERE channel = 'sms' AND type = 'confirmation'`;
    expect(row.lastError).not.toContain('15112345678');
    expect(row.lastError).not.toContain(manageTokenFor(appointment.id, SECRET));
  });
});

// ---------------------------------------------------------------- admin

describe('admin notification status', () => {
  it('shows confirmation and reminder SMS with plain states', async () => {
    const { appointment } = await online({ startsAt: iso(`${WED}T10:00`) });
    const states = async (now: number) =>
      (await loadPatientNotifications(sql, appointment.id)).map((n) => [n.channel, n.type, notificationState(n, now).state]);
    expect(await states(NOW)).toEqual([
      ['sms', 'confirmation', 'pending'],
      ['sms', 'reminder', 'scheduled'],
    ]);
    const [, reminder] = await loadPatientNotifications(sql, appointment.id);
    expect(notificationState(reminder, NOW).text).toBe('E planifikuar: 10:00, 3 nëntor 2026');
    await dispatchAt(NOW + 1000);
    expect(await states(NOW + 2000)).toEqual([
      ['sms', 'confirmation', 'sent'],
      ['sms', 'reminder', 'scheduled'],
    ]);
    sms.failNext = [new SmsSendError('provider: unknown subscriber', true)];
    await dispatchAt(at(`${TUE}T10:00`));
    expect(await states(at(`${TUE}T10:01`))).toEqual([
      ['sms', 'confirmation', 'sent'],
      ['sms', 'reminder', 'failed'],
    ]);
  });

  it('explains skipped SMS and hides retired patient emails', async () => {
    const { appointment } = await staffBooking({ patientPhone: LANDLINE_XK });
    await sql`INSERT INTO notifications (appointment_id, channel, type, recipient, lang, status, skip_reason)
              VALUES (${appointment.id}, 'email', 'confirmation', 'old@example.com', 'sq', 'skipped', 'patient_email_disabled')`;
    const list = await loadPatientNotifications(sql, appointment.id);
    expect(list.map((n) => [n.channel, n.type])).toEqual([['sms', 'reminder']]);
    expect(notificationState(list[0], NOW)).toMatchObject({ state: 'skipped', text: 'Nuk dërgohet: numri është telefon fiks.' });
    const { appointment: late } = await online({ startsAt: iso(`${MON}T10:00`) });
    const lateReminder = (await loadPatientNotifications(sql, late.id)).find((n) => n.type === 'reminder')!;
    expect(notificationState(lateReminder, NOW).text).toBe('Pa kujtesë: termini u caktua më pak se një ditë përpara.');
  });
});

// ---------------------------------------------------------------- texts

describe('SMS texts', () => {
  const payload = {
    appointmentId: 'x',
    doctorId: 'x',
    doctorName: 'Dr. Vlera',
    serviceNames: { sq: 'Trajtim i kanalit të rrënjës me mikroskop dhe kontroll përfundimtar', en: null, de: null },
    patientName: 'Arta Krasniqi',
    startsAt: '2026-11-04T09:00:00.000Z',
    endsAt: '2026-11-04T10:00:00.000Z',
  };
  const url = `${SITE}/sq/termin/${'A'.repeat(43)}/`;

  it('stay within 2 SMS parts in GSM-7, even with a long service name and the link', () => {
    for (const lang of ['sq', 'en', 'de'] as const) {
      for (const type of ['confirmation', 'reminder'] as const) {
        const text = renderPatientSms(type, lang, payload, { manageUrl: url });
        expect(isGsm7(text)).toBe(true);
        expect(smsSegments(text)).toBeLessThanOrEqual(2);
        expect(text).not.toContain('Arta'); // no patient name in an SMS
      }
    }
    // No English name → Albanian fallback, shortened.
    expect(renderPatientSms('confirmation', 'en', payload, { manageUrl: url })).toContain('Trajtim i kanalit te rrenjes me mikro..., Dr. Vlera');
  });

  it('without a link, the confirmation tells the patient to call', () => {
    expect(renderPatientSms('confirmation', 'en', payload)).toContain('To change it, please call +383 44 292 393');
  });

  it('GSM helpers: transliteration, part counting and masking', () => {
    expect(toGsm7('Konsultë – “Çmimi” për fëmijë')).toBe('Konsulte - "Çmimi" per femije');
    expect(isGsm7('Prüfung für Zähne')).toBe(true);
    expect(smsSegments('a'.repeat(160))).toBe(1);
    expect(smsSegments('a'.repeat(161))).toBe(2);
    expect(smsSegments('ë'.repeat(70))).toBe(1);
    expect(smsSegments('ë'.repeat(71))).toBe(2);
    expect(maskPhone(MOBILE_XK)).toBe('+383*****456');
  });
});
