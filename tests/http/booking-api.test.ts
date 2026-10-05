import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { bookingDates, bookingOptions, bookingSlots, submitBooking, type RequestContext } from '../../src/server/http/booking-api.ts';
import { checkFormToken, issueFormToken } from '../../src/server/security/form-token.ts';
import { hitRateLimit } from '../../src/server/security/rate-limit.ts';
import { clientIp } from '../../src/server/security/client-ip.ts';
import { createStaffAppointment } from '../../src/server/booking/appointments.ts';
import { isLandline, parsePhone } from '../../src/server/booking/phone.ts';
import { addDoctor, addService, addWeekly, at, clearAll, iso, newKey, setSettings } from '../helpers/booking.ts';
import { createTestDb } from '../helpers/db.ts';

const SECRET = 'test-secret-that-is-long-enough-1234567890';
const NOW = at('2026-11-01T12:00'); // Sunday
const MON = '2026-11-02';

let sql: Sql;
let drA: string;
let drB: string;
let consult: string;
let ipCounter = 0;

/** Fresh IP per call so rate limits don't interfere unless a test wants them to. */
const ctx = (overrides: Partial<RequestContext> = {}): RequestContext => ({
  now: NOW,
  ip: `10.0.0.${++ipCounter}`,
  secret: SECRET,
  ...overrides,
});

/** A token issued 10 minutes before NOW (old enough to pass the minimum fill time). */
const token = () => issueFormToken(SECRET, NOW - 10 * 60_000);

const submission = (overrides: Record<string, unknown> = {}) => ({
  serviceId: consult,
  doctorId: drA,
  startsAt: iso(`${MON}T10:00`),
  lang: 'de',
  idempotencyKey: newKey(),
  patientName: 'Lena Berisha',
  patientPhone: '0151 12345678',
  phoneCountry: 'DE',
  patientEmail: 'lena@example.de',
  consent: true,
  website: '',
  formToken: token(),
  ...overrides,
});

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
  consult = await addService(sql, 'Konsultë', 30, [drA, drB], { nameEn: 'Consultation', nameDe: 'Beratung' });
  await setSettings(sql, { onlineEnabled: true, minNoticeMinutes: 0 });
});

describe('GET options', () => {
  it('shows the localized contact message while online booking is off', async () => {
    await setSettings(sql, { onlineEnabled: false, disabledMessageDe: 'Bitte rufen Sie uns an.', disabledMessageSq: 'Na telefononi.' });
    const res = await bookingOptions(sql, 'de', ctx());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ enabled: false, message: 'Bitte rufen Sie uns an.' });
    expect((await bookingOptions(sql, 'sq', ctx())).body).toEqual({ enabled: false, message: 'Na telefononi.' });
  });

  it('reports "not configured" when no service is bookable', async () => {
    await sql`UPDATE services SET online_visible = false`;
    const res = await bookingOptions(sql, 'en', ctx());
    expect(res.body).toMatchObject({ enabled: false, reason: 'not_configured' });
  });

  it('hides services that have no eligible dentist', async () => {
    const lonely = await addService(sql, 'Vetëm Dr B', 30, [drB]);
    await sql`UPDATE doctors SET accepts_online = false WHERE id = ${drB}`;
    const res = await bookingOptions(sql, 'sq', ctx());
    const body = res.body as { services: { id: string; doctors: { id: string }[] }[] };
    expect(body.services.map((s) => s.id)).toEqual([consult]);
    expect(body.services.map((s) => s.id)).not.toContain(lonely);
    expect(body.services[0].doctors.map((d) => d.id)).toEqual([drA]);
  });

  it('returns localized services, dentists, window, countries and a form token', async () => {
    const res = await bookingOptions(sql, 'de', ctx());
    const body = res.body as Record<string, any>;
    expect(body.enabled).toBe(true);
    expect(body.services).toEqual([
      { id: consult, name: 'Beratung', durationMin: 30, doctors: [{ id: drA, name: 'Dr. Petriti' }, { id: drB, name: 'Dr. Vlera' }] },
    ]);
    expect(body.emailRequired).toBe(false);
    expect(body.window).toEqual({ from: '2026-11-01', to: '2027-01-30' });
    expect(body.defaultCountry).toBe('XK');
    expect(body.countries).toEqual(expect.arrayContaining([{ code: 'XK', dial: '383' }, { code: 'DE', dial: '49' }, { code: 'CH', dial: '41' }]));
    expect(checkFormToken(body.formToken, SECRET, NOW + 5_000)).toBe('ok');
  });

  it('falls back to the Albanian name when a translation is missing', async () => {
    await sql`UPDATE services SET name_de = NULL`;
    const body = (await bookingOptions(sql, 'de', ctx())).body as { services: { name: string }[] };
    expect(body.services[0].name).toBe('Konsultë');
  });

  it('exposes no patient or appointment data', async () => {
    await createStaffAppointment(
      sql,
      { doctorId: drA, serviceId: consult, startsAt: iso(`${MON}T10:00`), patientName: 'Secret Patient', patientPhone: '+38344999888' },
      { userId: null },
      { now: NOW },
    );
    const all = JSON.stringify([
      (await bookingOptions(sql, 'sq', ctx())).body,
      (await bookingDates(sql, new URLSearchParams({ serviceId: consult, doctorId: drA, from: MON, to: MON }), ctx())).body,
      (await bookingSlots(sql, new URLSearchParams({ serviceId: consult, doctorId: drA, date: MON }), ctx())).body,
    ]);
    expect(all).not.toContain('Secret');
    expect(all).not.toContain('38344999888');
  });
});

describe('GET dates and slots', () => {
  it('returns available dates and times; a doctor without a schedule has none', async () => {
    const dates = await bookingDates(sql, new URLSearchParams({ serviceId: consult, doctorId: drA, from: MON, to: '2026-11-08' }), ctx());
    expect(dates.body).toEqual({ dates: ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'] });
    const none = await bookingDates(sql, new URLSearchParams({ serviceId: consult, doctorId: drB, from: MON, to: '2026-11-30' }), ctx());
    expect(none.body).toEqual({ dates: [] });

    const slots = await bookingSlots(sql, new URLSearchParams({ serviceId: consult, doctorId: drA, date: MON }), ctx());
    expect((slots.body as { slots: unknown[] }).slots[0]).toEqual({ startsAt: '2026-11-02T07:00:00.000Z', time: '08:00' });
  });

  it('rejects malformed or oversized queries', async () => {
    const bad = (p: Record<string, string>) => bookingDates(sql, new URLSearchParams(p), ctx());
    expect((await bad({ serviceId: 'x', doctorId: drA, from: MON, to: MON })).status).toBe(400);
    expect((await bad({ serviceId: consult, doctorId: drA, from: '2026-13-01', to: MON })).status).toBe(400);
    expect((await bad({ serviceId: consult, doctorId: drA, from: MON, to: '2028-12-31' })).status).toBe(400);
    expect((await bookingSlots(sql, new URLSearchParams({ serviceId: consult, doctorId: drA, date: "2026-11-02' OR 1=1" }), ctx())).status).toBe(400);
  });

  it('reports why a doctor/service is not bookable', async () => {
    await sql`UPDATE doctors SET accepts_online = false WHERE id = ${drA}`;
    const res = await bookingSlots(sql, new URLSearchParams({ serviceId: consult, doctorId: drA, date: MON }), ctx());
    expect(res).toEqual({ status: 409, body: { error: 'doctor_unavailable' } });
  });
});

describe('POST booking', () => {
  it('books and returns a localized summary without the cancellation secret', async () => {
    const res = await submitBooking(sql, submission(), ctx());
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      duplicate: false,
      appointment: {
        doctorName: 'Dr. Petriti',
        serviceName: 'Beratung',
        startsAt: '2026-11-02T09:00:00.000Z',
        endsAt: '2026-11-02T09:30:00.000Z',
        patientEmail: 'lena@example.de',
        patientPhone: '+49 1511 2345678',
      },
      smsQueued: true,
    });
    const [row] = await sql`SELECT lang, patient_phone FROM appointments`;
    expect(row).toEqual({ lang: 'de', patientPhone: '+4915112345678' });
  });

  it('answers a repeated submit with the same booking (200, duplicate)', async () => {
    const body = submission();
    await submitBooking(sql, body, ctx());
    const again = await submitBooking(sql, body, ctx());
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ duplicate: true });
  });

  it('returns slot_unavailable (409) when the time was taken meanwhile', async () => {
    await submitBooking(sql, submission(), ctx());
    const res = await submitBooking(sql, submission({ patientPhone: '+38349111222', phoneCountry: 'XK' }), ctx());
    expect(res).toEqual({ status: 409, body: { error: 'slot_unavailable' } });
  });

  it('requires consent, a valid form token and an empty honeypot', async () => {
    expect((await submitBooking(sql, submission({ consent: false }), ctx())).body).toMatchObject({
      error: 'invalid_input',
      fields: [{ field: 'consent' }],
    });
    expect((await submitBooking(sql, submission({ website: 'http://spam' }), ctx())).body).toEqual({ error: 'rejected' });
    expect((await submitBooking(sql, submission({ formToken: 'forged.token' }), ctx())).body).toEqual({ error: 'form_expired' });
    expect((await submitBooking(sql, submission({ formToken: issueFormToken(SECRET, NOW - 500) }), ctx())).body).toEqual({
      error: 'too_fast',
    });
    expect((await submitBooking(sql, submission({ formToken: issueFormToken(SECRET, NOW - 13 * 3_600_000) }), ctx())).body).toEqual({
      error: 'form_expired',
    });
    expect((await submitBooking(sql, submission({ formToken: issueFormToken('another-secret-of-sufficient-length-xx', NOW - 60_000) }), ctx())).body).toEqual({
      error: 'form_expired',
    });
    const [{ count }] = await sql`SELECT count(*)::int AS count FROM appointments`;
    expect(count).toBe(0);
  });

  it('applies the phone policy: landlines rejected online, unknown-type numbers accepted', async () => {
    const landline = await submitBooking(sql, submission({ patientPhone: '038 123 456', phoneCountry: 'XK' }), ctx());
    expect(landline).toEqual({ status: 400, body: { error: 'phone_landline' } });
    const invalid = await submitBooking(sql, submission({ patientPhone: '12345' }), ctx());
    expect(invalid).toEqual({ status: 400, body: { error: 'invalid_phone' } });
    // Swiss mobile, Austrian mobile, international prefix overriding the selected country:
    for (const [i, phone] of ['+41 79 123 45 67', '+43 664 1234567', '+383 44 123 456'].entries()) {
      const res = await submitBooking(sql, submission({ patientPhone: phone, phoneCountry: 'DE', startsAt: iso(`${MON}T1${i + 3}:00`) }), ctx());
      expect(res.status, phone).toBe(201);
    }
  });

  it('rejects a body that is not an object, and invalid fields with field names', async () => {
    expect((await submitBooking(sql, 'hello', ctx())).status).toBe(400);
    const res = await submitBooking(sql, submission({ patientEmail: 'nope' }), ctx());
    expect(res.body).toMatchObject({ error: 'invalid_input', fields: [{ field: 'patientEmail' }] });
  });

  it('limits upcoming online bookings per phone number', async () => {
    // 10 upcoming bookings are fine (e.g. a parent booking for the family); the 11th is refused.
    const starts = ['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30'];
    for (const h of starts) {
      expect((await submitBooking(sql, submission({ startsAt: iso(`${MON}T${h}`) }), ctx())).status, h).toBe(201);
    }
    const eleventh = await submitBooking(sql, submission({ startsAt: iso(`${MON}T14:00`) }), ctx());
    expect(eleventh).toEqual({ status: 429, body: { error: 'too_many_bookings' } });
  });

  it('rate-limits submissions per IP', async () => {
    const same = ctx();
    const results = [];
    for (let i = 0; i < 11; i++) results.push((await submitBooking(sql, { nonsense: true }, same)).status);
    expect(results.slice(0, 10).every((s) => s === 400)).toBe(true);
    expect(results[10]).toBe(429);
  });
});

describe('security helpers', () => {
  it('rate limit counts per key and window', async () => {
    const rule = { limit: 2, windowSeconds: 60 };
    expect(await hitRateLimit(sql, 'k1', rule, NOW)).toBe(true);
    expect(await hitRateLimit(sql, 'k1', rule, NOW)).toBe(true);
    expect(await hitRateLimit(sql, 'k1', rule, NOW)).toBe(false);
    expect(await hitRateLimit(sql, 'k2', rule, NOW)).toBe(true);
    expect(await hitRateLimit(sql, 'k1', rule, NOW + 61_000)).toBe(true);
  });

  it('reads the client IP from X-Forwarded-For only behind a trusted proxy, ignoring client-supplied entries', () => {
    // The visitor sent "X-Forwarded-For: 1.2.3.4"; the trusted proxy appended the real address 198.51.100.7.
    const req = new Request('http://x/', { headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.7' } });
    expect(clientIp(req, '10.0.0.1', true)).toBe('198.51.100.7');
    expect(clientIp(req, '10.0.0.1', false)).toBe('10.0.0.1');
    // Two trusted proxies: CDN → load balancer.
    const two = new Request('http://x/', { headers: { 'x-forwarded-for': '1.2.3.4, 198.51.100.7, 10.1.1.1' } });
    expect(clientIp(two, '10.0.0.1', true, 2)).toBe('198.51.100.7');
    // Garbage in the header falls back to the socket address.
    const junk = new Request('http://x/', { headers: { 'x-forwarded-for': '<script>' } });
    expect(clientIp(junk, '10.0.0.1', true)).toBe('10.0.0.1');
  });

  it('classifies phone types', () => {
    expect(isLandline(parsePhone('038 123 456')!)).toBe(true);
    expect(isLandline(parsePhone('044 123 456')!)).toBe(false);
    expect(isLandline(parsePhone('+4930 1234567')!)).toBe(true); // Berlin landline
    expect(isLandline(parsePhone('+41 79 123 45 67')!)).toBe(false);
  });
});
