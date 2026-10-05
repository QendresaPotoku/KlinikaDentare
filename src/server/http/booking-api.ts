import { z } from 'astro/zod';
import type { Sql } from '../db/client.ts';
import { getOnlineDates, getOnlineSlots } from '../booking/availability.ts';
import { createOnlineBooking } from '../booking/appointments.ts';
import { BookingError, type BookingErrorCode } from '../booking/errors.ts';
import { loadSettings } from '../booking/repository.ts';
import { formatPhone, isCountryCode, parsePhone, phoneCountries } from '../booking/phone.ts';
import { isSmsEligible } from '../notifications/sms.ts';
import { checkFormToken, issueFormToken } from '../security/form-token.ts';
import { hitRateLimit, MAX_UPCOMING_ONLINE_BOOKINGS_PER_PHONE, RATE_LIMITS } from '../security/rate-limit.ts';
import { addDays, isValidLocalDate, todayLocal, type LocalDate } from '../time.ts';

/**
 * Public booking API logic, independent of Astro so it can be tested directly. Every response is
 * JSON and never contains other patients' data or the reasons a time is busy.
 * Error responses: { error: <code>, fields?: [...] }. The browser maps codes to localized text.
 */

export type Lang = 'sq' | 'en' | 'de';

export interface ApiResult {
  status: number;
  body: unknown;
}

export interface RequestContext {
  now: number;
  ip: string;
  secret: string;
}

const ok = (body: unknown, status = 200): ApiResult => ({ status, body });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}): ApiResult => ({
  status,
  body: { error, ...extra },
});

const STATUS: Partial<Record<BookingErrorCode, number>> = {
  invalid_input: 400,
  invalid_phone: 400,
  phone_landline: 400,
  email_required: 400,
  online_disabled: 409,
  service_unavailable: 409,
  doctor_unavailable: 409,
  doctor_not_offering_service: 409,
  slot_unavailable: 409,
  idempotency_conflict: 409,
};

export function parseLang(value: unknown): Lang {
  return value === 'en' || value === 'de' ? value : 'sq';
}

const serviceName = (s: { nameSq: string; nameEn: string | null; nameDe: string | null }, lang: Lang) =>
  (lang === 'en' ? s.nameEn : lang === 'de' ? s.nameDe : null) ?? s.nameSq;

async function rateLimited(sql: Sql, ctx: RequestContext): Promise<boolean> {
  return !(await hitRateLimit(sql, `availability:${ctx.ip}`, RATE_LIMITS.availability, ctx.now));
}

// ---------------------------------------------------------------- GET /api/booking/options/

/**
 * What the booking form needs to start: bookable services with their eligible doctors, or a
 * contact-the-clinic message when online booking is off or nothing is configured yet.
 */
export async function bookingOptions(sql: Sql, lang: Lang, ctx: RequestContext): Promise<ApiResult> {
  if (await rateLimited(sql, ctx)) return fail(429, 'rate_limited');
  const settings = await loadSettings(sql);
  const closed = { enabled: false, message: settings.disabledMessage[lang] };
  if (!settings.onlineEnabled) return ok(closed);

  const rows = await sql<
    { id: string; nameSq: string; nameEn: string | null; nameDe: string | null; durationMin: number; doctors: { id: string; name: string }[] }[]
  >`
    SELECT s.id, s.name_sq, s.name_en, s.name_de, s.duration_min,
           json_agg(json_build_object('id', d.id, 'name', d.name) ORDER BY d.sort_order, d.name) AS doctors
    FROM services s
    JOIN doctor_services ds ON ds.service_id = s.id
    JOIN doctors d ON d.id = ds.doctor_id AND d.active AND d.accepts_online
    WHERE s.active AND s.online_visible
    GROUP BY s.id
    ORDER BY s.sort_order, s.name_sq
  `;
  // Services without any eligible doctor never reach the form (the JOIN drops them).
  if (rows.length === 0) return ok({ ...closed, reason: 'not_configured' });

  const today = todayLocal(ctx.now);
  return ok({
    enabled: true,
    services: rows.map((r) => ({ id: r.id, name: serviceName(r, lang), durationMin: r.durationMin, doctors: r.doctors })),
    emailRequired: settings.emailRequired,
    window: { from: today, to: addDays(today, settings.bookingWindowDays) },
    countries: phoneCountries(),
    defaultCountry: 'XK',
    formToken: issueFormToken(ctx.secret, ctx.now),
  });
}

// ---------------------------------------------------------------- GET /api/booking/dates/ and /slots/

const idsSchema = z.object({ serviceId: z.uuid(), doctorId: z.uuid() });
const MAX_RANGE_DAYS = 400;

export async function bookingDates(sql: Sql, params: URLSearchParams, ctx: RequestContext): Promise<ApiResult> {
  const ids = idsSchema.safeParse(Object.fromEntries(params));
  const from = params.get('from');
  const to = params.get('to');
  if (!ids.success || !isValidLocalDate(from) || !isValidLocalDate(to) || from > to) return fail(400, 'invalid_input');
  if (to > addDays(from, MAX_RANGE_DAYS)) return fail(400, 'invalid_input');
  if (await rateLimited(sql, ctx)) return fail(429, 'rate_limited');

  const result = await getOnlineDates(sql, { ...ids.data, from: from as LocalDate, to: to as LocalDate, now: ctx.now });
  if (!result.ok) return fail(result.reason === 'invalid_date' ? 400 : 409, result.reason);
  return ok({ dates: result.dates });
}

export async function bookingSlots(sql: Sql, params: URLSearchParams, ctx: RequestContext): Promise<ApiResult> {
  const ids = idsSchema.safeParse(Object.fromEntries(params));
  const date = params.get('date');
  if (!ids.success || !isValidLocalDate(date)) return fail(400, 'invalid_input');
  if (await rateLimited(sql, ctx)) return fail(429, 'rate_limited');

  const result = await getOnlineSlots(sql, { ...ids.data, date, now: ctx.now });
  if (!result.ok) return fail(result.reason === 'invalid_date' ? 400 : 409, result.reason);
  return ok({ slots: result.slots });
}

// ---------------------------------------------------------------- POST /api/booking/

const submitEnvelope = z.object({
  formToken: z.string().max(200),
  /** Honeypot: hidden from people, filled in by naive bots. Must be empty. */
  website: z.string().max(200).optional(),
  consent: z.literal(true, { error: 'consent required' }),
});

export async function submitBooking(sql: Sql, body: unknown, ctx: RequestContext): Promise<ApiResult> {
  if (!(await hitRateLimit(sql, `booking:${ctx.ip}`, RATE_LIMITS.bookingPerIp, ctx.now))) return fail(429, 'rate_limited');
  if (typeof body !== 'object' || body === null) return fail(400, 'invalid_input');

  const envelope = submitEnvelope.safeParse(body);
  if (!envelope.success) {
    const fields = envelope.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    return fail(400, 'invalid_input', { fields });
  }
  if (envelope.data.website) return fail(400, 'rejected');
  const token = checkFormToken(envelope.data.formToken, ctx.secret, ctx.now);
  if (token !== 'ok') return fail(400, token === 'too_fast' ? 'too_fast' : 'form_expired');

  const input = body as Record<string, unknown>;
  const lang = parseLang(input.lang);

  // Spam guard: a phone number may hold only a few upcoming online bookings at once.
  if (typeof input.patientPhone === 'string') {
    const country = typeof input.phoneCountry === 'string' && isCountryCode(input.phoneCountry) ? input.phoneCountry : 'XK';
    const phone = parsePhone(input.patientPhone, country);
    if (phone) {
      const [{ count }] = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count FROM appointments
        WHERE patient_phone = ${phone.e164} AND source = 'online' AND status = 'scheduled'
          AND starts_at > ${new Date(ctx.now)}
          AND (idempotency_key IS DISTINCT FROM ${typeof input.idempotencyKey === 'string' ? input.idempotencyKey : null})
      `;
      if (count >= MAX_UPCOMING_ONLINE_BOOKINGS_PER_PHONE) return fail(429, 'too_many_bookings');
    }
  }

  try {
    const result = await createOnlineBooking(
      sql,
      {
        doctorId: input.doctorId,
        serviceId: input.serviceId,
        startsAt: input.startsAt,
        lang,
        idempotencyKey: input.idempotencyKey,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        phoneCountry: input.phoneCountry,
        patientEmail: input.patientEmail,
        patientNote: input.patientNote,
      },
      { now: ctx.now },
    );
    const a = result.appointment;
    const [service] = await sql<{ nameSq: string; nameEn: string | null; nameDe: string | null }[]>`
      SELECT name_sq, name_en, name_de FROM services WHERE id = ${a.serviceId}
    `;
    return ok(
      {
        duplicate: result.duplicate,
        appointment: {
          doctorName: a.doctorName,
          serviceName: service ? serviceName(service, lang) : a.serviceName,
          startsAt: a.startsAt.toISOString(),
          endsAt: a.endsAt.toISOString(),
          patientEmail: a.patientEmail,
          patientPhone: formatPhone(a.patientPhone),
        },
        // A confirmation SMS was queued (sent shortly after; delivery is not confirmed here).
        smsQueued: isSmsEligible(a.patientPhone),
      },
      result.duplicate ? 200 : 201,
    );
  } catch (err) {
    if (err instanceof BookingError) {
      const extra = err.code === 'invalid_input' && Array.isArray(err.details) ? { fields: err.details } : {};
      return fail(STATUS[err.code] ?? 400, err.code, extra);
    }
    throw err;
  }
}
