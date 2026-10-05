import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import {
  cancelAppointmentByPatient,
  cancelAppointmentByStaff,
  createOnlineBooking,
  createStaffAppointment,
  getByManageToken,
  rescheduleAppointment,
} from '../../src/server/booking/appointments.ts';
import { dispatchDue, retryNotification } from '../../src/server/notifications/dispatcher.ts';
import { EmailSendError, MemoryEmailProvider, maskEmail } from '../../src/server/notifications/email.ts';
import { hashManageToken, manageTokenFor, manageUrl } from '../../src/server/notifications/manage-link.ts';
import { renderClinicNotice, renderPatientEmail } from '../../src/server/notifications/templates.ts';
import type { NotificationPayload } from '../../src/server/notifications/outbox.ts';
import { isSmsEligible, MemorySmsProvider } from '../../src/server/notifications/sms.ts';
import { submitBooking } from '../../src/server/http/booking-api.ts';
import { issueFormToken } from '../../src/server/security/form-token.ts';
import { addDoctor, addService, addWeekly, at, clearAll, iso, newKey, setSettings } from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

/**
 * Outbox, dispatcher and the clinic's email notice. Patient SMS (confirmation, reminder) are
 * covered in sms.test.ts.
 */

const SECRET = 'notification-test-secret-0123456789abcdef';
const SITE = 'https://klinika.test';
const NOW = at('2026-11-01T12:00');
const MON = '2026-11-02';
const WED = '2026-11-04';

let sql: Sql;
let drA: string;
let drB: string;
let consult: string;
let mail: MemoryEmailProvider;
let sms: MemorySmsProvider;
const staff = { userId: null };

const online = (overrides: Record<string, unknown> = {}) =>
  createOnlineBooking(
    sql,
    {
      doctorId: drA,
      serviceId: consult,
      startsAt: iso(`${MON}T10:00`),
      lang: 'de',
      idempotencyKey: newKey(),
      patientName: 'Lena Berisha',
      patientPhone: '+4915112345678',
      patientEmail: 'lena@example.de',
      patientNote: 'Komme aus München',
      ...overrides,
    },
    { now: NOW, secret: SECRET },
  );

const dispatch = (opts: Partial<Parameters<typeof dispatchDue>[1]> = {}) =>
  dispatchDue(sql, { now: NOW + 1000, email: mail, sms, siteUrl: SITE, secret: SECRET, ...opts });

const rows = () =>
  sql<{ id: string; channel: string; type: string; status: string; recipient: string; lang: string; attempts: number; skipReason: string | null; failureKind: string | null; scheduledFor: Date }[]>`
    SELECT id, channel, type, status, recipient, lang, attempts, skip_reason, failure_kind, scheduled_for FROM notifications
    ORDER BY created_at, channel, type`;

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
  mail = new MemoryEmailProvider();
  sms = new MemorySmsProvider();
});

describe('what gets queued', () => {
  it('an online booking queues the clinic notice and the patient SMS, never a patient email', async () => {
    const { appointment } = await online({ startsAt: iso(`${WED}T10:00`) });
    const queued = await rows();
    expect(queued.map((r) => [r.channel, r.type, r.status, r.recipient, r.lang])).toEqual([
      ['email', 'clinic_new_booking', 'pending', 'klinika@example.com', 'sq'],
      ['sms', 'confirmation', 'pending', '+4915112345678', 'de'],
      ['sms', 'reminder', 'pending', '+4915112345678', 'de'],
    ]);
    const [event] = await sql`SELECT id FROM appointment_events WHERE appointment_id = ${appointment.id}`;
    const linked = await sql`SELECT event_id FROM notifications`;
    expect(linked.every((n) => n.eventId === event.id)).toBe(true);
  });

  it('queues no email at all without a clinic email, even when the patient gave an address', async () => {
    await setSettings(sql, { clinicNotifyEmail: null });
    await online();
    await online({ startsAt: iso(`${MON}T11:00`), patientEmail: '' });
    expect((await rows()).filter((r) => r.channel === 'email')).toEqual([]);
  });

  it('a repeated submit does not queue duplicates', async () => {
    const key = newKey();
    const same = { idempotencyKey: key, startsAt: iso(`${WED}T10:00`) };
    await online(same);
    await online(same);
    await Promise.all([online(same), online(same)]);
    expect(await rows()).toHaveLength(3);
  });

  it('reschedule and cancellation queue no patient email', async () => {
    const a = await online({ startsAt: iso(`${WED}T10:00`) });
    await rescheduleAppointment(sql, { appointmentId: a.appointment.id, startsAt: iso(`${WED}T14:00`), doctorId: drB }, staff, { now: NOW });
    await cancelAppointmentByStaff(sql, { appointmentId: a.appointment.id, reason: 'x' }, staff);
    const b = await online({ startsAt: iso(`${WED}T11:00`) }); // outside the 24 h cancellation deadline
    await cancelAppointmentByPatient(sql, b.manageToken!, { now: NOW });
    expect((await rows()).filter((r) => r.channel === 'email' && r.type !== 'clinic_new_booking')).toEqual([]);
  });

  it('a staff booking queues no clinic notice and no confirmation', async () => {
    await createStaffAppointment(sql, { doctorId: drA, serviceId: consult, startsAt: iso(`${WED}T09:00`), patientName: 'Walk In', patientPhone: '044 123 456', patientEmail: 'p@example.com' }, staff, { now: NOW, secret: SECRET });
    expect((await rows()).map((r) => [r.channel, r.type])).toEqual([['sms', 'reminder']]);
  });
});

describe('dispatching the clinic email', () => {
  it('sends the clinic notice in Albanian with the patient details and the admin link', async () => {
    const { appointment } = await online();
    await dispatch();
    expect(mail.sent).toHaveLength(1);
    const toClinic = mail.sent[0];
    expect(toClinic.to).toBe('klinika@example.com');
    expect(toClinic.subject).toContain('Rezervim i ri online: Lena Berisha');
    expect(toClinic.text).toContain('+49 1511 2345678');
    expect(toClinic.text).toContain('lena@example.de');
    expect(toClinic.text).toContain('Komme aus München');
    expect(toClinic.text).toContain(`${SITE}/admin/appointments/${appointment.id}/`);
    expect((await rows()).find((r) => r.type === 'clinic_new_booking')?.status).toBe('sent');
  });

  it('running the dispatcher again sends nothing twice', async () => {
    await online();
    await dispatch();
    await dispatch();
    await dispatch({ now: NOW + 3_600_000 });
    expect(mail.sent).toHaveLength(1);
  });

  it('two dispatchers running at the same time never send the same message', async () => {
    for (let i = 0; i < 4; i++) await online({ startsAt: iso(`${MON}T1${i}:00`), patientName: `Patient ${i}` });
    mail.delayMs = 30;
    sms.delayMs = 30;
    const results = await Promise.all([dispatch(), dispatch(), dispatch()]);
    expect(results.reduce((n, r) => n + r.sent, 0)).toBe(8); // 4 clinic emails + 4 confirmation SMS
    expect(mail.sent).toHaveLength(4);
    expect(new Set(mail.sent.map((m) => m.subject)).size).toBe(4);
    expect(new Set(sms.sent.map((m) => m.reference)).size).toBe(4);
    expect(sms.sent).toHaveLength(4);
  });

  it('a provider failure never affects the appointment, and the message is retried later', async () => {
    const { appointment } = await online();
    mail.failNext = [new EmailSendError('smtp ECONNECTION', false)];
    expect((await dispatch()).retrying).toBe(1);
    const [appt] = await sql`SELECT status FROM appointments WHERE id = ${appointment.id}`;
    expect(appt.status).toBe('scheduled');
    expect((await rows()).find((r) => r.type === 'clinic_new_booking')).toMatchObject({ status: 'pending', attempts: 1, failureKind: 'temporary' });
    expect((await dispatch({ now: NOW + 30_000 })).sent).toBe(0); // not before the back-off time…
    expect((await dispatch({ now: NOW + 2 * 60_000 })).sent).toBe(1); // …but after it
  });

  it('a permanent failure stops immediately; staff can retry it', async () => {
    await online();
    mail.failNext = [new EmailSendError('smtp 550', true)];
    expect((await dispatch()).failed).toBe(1);
    const failed = (await rows()).find((r) => r.type === 'clinic_new_booking')!;
    expect(failed).toMatchObject({ status: 'failed', failureKind: 'permanent' });
    expect((await dispatch({ now: NOW + 3_600_000 })).sent).toBe(0); // not retried by itself
    expect(await retryNotification(sql, failed.id)).toBe(true);
    expect((await dispatch({ now: Date.now() + 1000 })).sent).toBe(1);
  });

  it('gives up after the maximum number of temporary failures', async () => {
    await online();
    await sql`UPDATE notifications SET max_attempts = 2 WHERE type = 'clinic_new_booking'`;
    mail.failNext = [new EmailSendError('timeout', false), new EmailSendError('timeout', false)];
    await dispatch();
    await dispatch({ now: NOW + 10 * 60_000 });
    expect((await rows()).find((r) => r.type === 'clinic_new_booking')).toMatchObject({ status: 'failed', attempts: 2, failureKind: 'temporary' });
  });

  it('takes over a message whose dispatcher crashed (expired lease) and sends it once', async () => {
    await online();
    await sql`UPDATE notifications SET status = 'sending', claim_token = gen_random_uuid(), locked_until = ${new Date(NOW - 1000)} WHERE type = 'clinic_new_booking'`;
    await dispatch();
    expect(mail.sent).toHaveLength(1);
  });

  it('the clinic notice is not sent once the appointment is cancelled', async () => {
    const { appointment } = await online();
    await cancelAppointmentByStaff(sql, { appointmentId: appointment.id }, staff);
    await dispatch();
    expect(mail.sent).toEqual([]);
  });

  it('a patient email still queued from before the switch to SMS is skipped, not sent', async () => {
    await online();
    await sql`INSERT INTO notifications (appointment_id, event_id, channel, type, recipient, lang, payload, dedupe_key)
              SELECT appointment_id, event_id, 'email', 'confirmation', 'lena@example.de', 'de', payload, 'legacy'
              FROM notifications WHERE type = 'clinic_new_booking'`;
    await dispatch();
    expect(mail.sent.map((m) => m.to)).toEqual(['klinika@example.com']);
    expect((await rows()).find((r) => r.recipient === 'lena@example.de')).toMatchObject({ status: 'skipped', skipReason: 'patient_email_disabled' });
  });
});

describe('management link', () => {
  it('is derived from the appointment, only its hash is stored, and it opens the appointment', async () => {
    const { appointment, manageToken } = await online();
    expect(manageToken).toBe(manageTokenFor(appointment.id, SECRET));
    const [row] = await sql`SELECT manage_token_hash FROM appointments WHERE id = ${appointment.id}`;
    expect(row.manageTokenHash).toBe(hashManageToken(manageToken!));
    // The raw token appears nowhere in the database, even after the confirmation SMS containing it was sent.
    await dispatch();
    expect(sms.sent[0].text).toContain(manageToken);
    const dump = JSON.stringify(await sql`SELECT * FROM appointments`) + JSON.stringify(await sql`SELECT * FROM notifications`) + JSON.stringify(await sql`SELECT * FROM appointment_events`);
    expect(dump).not.toContain(manageToken);
    expect((await getByManageToken(sql, manageToken!))?.appointment.id).toBe(appointment.id);
    expect(manageUrl('https://klinika.test/', 'sq', 'abc')).toBe('https://klinika.test/sq/termin/abc/');
  });
});

describe('email templates (kept for the clinic notice and possible later use)', () => {
  const payload: NotificationPayload = {
    appointmentId: '00000000-0000-4000-8000-000000000001',
    doctorId: 'x',
    doctorName: 'Dr. Vlera',
    serviceNames: { sq: 'Pastrim', en: 'Cleaning', de: null },
    patientName: 'Arta <b>Krasniqi</b>',
    startsAt: '2026-11-03T09:00:00.000Z',
    endsAt: '2026-11-03T09:45:00.000Z',
    previous: { startsAt: '2026-11-02T13:00:00.000Z', endsAt: '2026-11-02T13:45:00.000Z', doctorName: 'Dr. Petriti' },
  };
  const ctx = { siteUrl: SITE, manageUrl: `${SITE}/x/termin/TOKEN/` };

  it('renders all three languages for every patient message', () => {
    const subjects = (['sq', 'en', 'de'] as const).flatMap((lang) =>
      (['confirmation', 'rescheduled', 'cancelled'] as const).map((type) => renderPatientEmail(type, lang, payload, ctx).subject),
    );
    expect(subjects).toEqual([
      'Termini juaj është rezervuar – 3 nën, 10:00',
      'Termini juaj u ndryshua – 3 nën, 10:00',
      'Termini juaj u anulua – 3 nën',
      'Your appointment is booked – 3 Nov, 10:00',
      'Your appointment has been changed – 3 Nov, 10:00',
      'Your appointment has been cancelled – 3 Nov',
      'Ihr Termin ist gebucht – 3. Nov, 10:00 Uhr',
      'Ihr Termin wurde geändert – 3. Nov, 10:00 Uhr',
      'Ihr Termin wurde storniert – 3. Nov',
    ]);
  });

  it('shows old and new time on a change, localises the service, escapes HTML, no link after cancellation', () => {
    const changed = renderPatientEmail('rescheduled', 'en', payload, ctx);
    expect(changed.text).toContain('Before: Monday, 2 November 2026, 14:00 (Dr. Petriti)');
    expect(changed.text).toContain('Now: Tuesday, 3 November 2026');
    expect(changed.text).toContain('Cleaning');
    expect(changed.html).toContain('Arta &lt;b&gt;Krasniqi&lt;/b&gt;');
    expect(changed.html).not.toContain('<b>Krasniqi</b>');
    expect(changed.html).toContain('TOKEN');
    const de = renderPatientEmail('confirmation', 'de', payload, ctx);
    expect(de.text).toContain('Pastrim'); // no German name → Albanian fallback
    const cancelled = renderPatientEmail('cancelled', 'sq', payload, ctx);
    expect(cancelled.html).not.toContain('TOKEN');
    expect(cancelled.text).toContain('u anulua');
    const clinic = renderClinicNotice({ ...payload, patientPhone: '+38344123456', patientEmail: null }, { siteUrl: SITE, adminUrl: `${SITE}/admin/appointments/1/` });
    expect(clinic.text).toContain('Email-i: —');
  });

  it('keeps the HTML simple: no scripts, external fonts, images or stylesheets', () => {
    const html = renderPatientEmail('confirmation', 'sq', payload, ctx).html;
    expect(html).not.toMatch(/<script|<link|<img|@import|fonts\.googleapis/i);
  });
});

describe('public API and privacy helpers', () => {
  it('tells the booking screen that a confirmation SMS was queued', async () => {
    const body = {
      serviceId: consult,
      doctorId: drA,
      startsAt: iso(`${MON}T15:00`),
      lang: 'sq',
      idempotencyKey: newKey(),
      patientName: 'Arta',
      patientPhone: '044 123 456',
      consent: true,
      formToken: issueFormToken(SECRET, NOW - 60_000),
    };
    const res = await submitBooking(sql, body, { now: NOW, ip: '10.9.9.9', secret: SECRET });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ smsQueued: true, appointment: { patientPhone: '+383 44 123 456', patientEmail: null } });
  });

  it('masks addresses in logs and knows which numbers can get SMS', () => {
    expect(maskEmail('lena@example.de')).toBe('l***@example.de');
    expect(isSmsEligible('+38344123456')).toBe(true);
    expect(isSmsEligible('+38338123456')).toBe(false);
  });
});
