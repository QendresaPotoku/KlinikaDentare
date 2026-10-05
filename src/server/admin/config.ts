import type { Db, Sql } from '../db/client.ts';
import { findAttention, type AttentionItem } from './attention.ts';
import { addDays, datesBetween, isValidLocalDate, wallClockToInstant } from '../time.ts';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../auth/password.ts';
import { createHash } from 'node:crypto';

/**
 * Clinic configuration (dentists, schedules, services, time off, special dates, settings, staff).
 *
 * Every save that can affect existing appointments follows the same steps, inside one transaction:
 *   1. lock the edited row and compare its version (someone else may have saved meanwhile),
 *   2. list the appointments that already need attention,
 *   3. apply the change,
 *   4. list again; appointments that are new on the list are the conflicts of this change,
 *   5. if any conflict was not acknowledged by the user, roll everything back and report them.
 * Appointments themselves are never modified here.
 */

export type ConfigErrorCode = 'invalid' | 'stale' | 'conflicts' | 'not_found' | 'in_use' | 'last_active' | 'self' | 'email_taken' | 'exists';

export class ConfigError extends Error {
  readonly code: ConfigErrorCode;
  readonly fields: Record<string, string>;
  readonly conflicts: AttentionItem[];
  constructor(code: ConfigErrorCode, options: { fields?: Record<string, string>; conflicts?: AttentionItem[] } = {}) {
    super(code);
    this.name = 'ConfigError';
    this.code = code;
    this.fields = options.fields ?? {};
    this.conflicts = options.conflicts ?? [];
  }
}

export interface SaveOptions {
  now?: number;
  /** Appointment ids the user saw in the conflict warning and accepted. */
  acknowledged?: string[];
}

const invalid = (fields: Record<string, string>) => new ConfigError('invalid', { fields });

/** Version token = updated_at in ms. A missing token skips the check (new records). */
function checkVersion(row: { updatedAt: Date } | undefined, version: number | undefined) {
  if (!row) throw new ConfigError('not_found');
  if (version !== undefined && row.updatedAt.getTime() !== version) throw new ConfigError('stale');
}

const issueKey = (i: AttentionItem) => `${i.id}:${i.reasons.map((r) => r.code).sort().join(',')}`;

async function withConflictCheck(
  tx: Db,
  scope: { doctorIds?: string[]; serviceIds?: string[] },
  options: SaveOptions,
  apply: () => Promise<void>,
): Promise<AttentionItem[]> {
  const now = options.now ?? Date.now();
  const before = new Set((await findAttention(tx, { now, ...scope })).map(issueKey));
  await apply();
  const after = await findAttention(tx, { now, ...scope });
  const fresh = after.filter((i) => !before.has(issueKey(i)));
  const accepted = new Set(options.acknowledged ?? []);
  if (fresh.some((i) => !accepted.has(i.id))) throw new ConfigError('conflicts', { conflicts: fresh });
  return fresh;
}

// ---------------------------------------------------------------- helpers

export interface PeriodInput {
  start: string;
  end: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const toMinute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Validates "HH:MM" periods: end after start, no overlaps. Returns sorted minute periods. */
export function parsePeriods(periods: PeriodInput[], label: string): { startMinute: number; endMinute: number }[] {
  const out: { startMinute: number; endMinute: number }[] = [];
  for (const p of periods) {
    if (!TIME_RE.test(p.start ?? '') || !TIME_RE.test(p.end ?? '')) throw invalid({ periods: `${label}: shkruani orët si 08:00.` });
    const startMinute = toMinute(p.start);
    const endMinute = toMinute(p.end);
    if (endMinute <= startMinute) throw invalid({ periods: `${label}: ora e mbarimit (${p.end}) duhet të jetë pas orës së fillimit (${p.start}).` });
    out.push({ startMinute, endMinute });
  }
  out.sort((a, b) => a.startMinute - b.startMinute);
  for (let i = 1; i < out.length; i++) {
    if (out[i].startMinute < out[i - 1].endMinute) throw invalid({ periods: `${label}: oraret mbivendosen. Kontrolloni periudhat.` });
  }
  return out;
}

const cleanName = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ').slice(0, max) : '');
const optionalText = (v: unknown, max = 500) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  return s || null;
};
const ids = (v: unknown): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)))] : [];

async function touchDoctor(tx: Db, doctorId: string) {
  await tx`UPDATE doctors SET updated_at = now() WHERE id = ${doctorId}`;
}

// ---------------------------------------------------------------- dentists

export async function createDoctor(sql: Sql, input: { name: unknown }): Promise<string> {
  const name = cleanName(input.name);
  if (name.length < 2) throw invalid({ name: 'Shkruani emrin e dentistit.' });
  const [row] = await sql<{ id: string }[]>`
    INSERT INTO doctors (name, sort_order) VALUES (${name}, (SELECT coalesce(max(sort_order), 0) + 1 FROM doctors))
    RETURNING id`;
  return row.id;
}

export async function updateDoctor(
  sql: Sql,
  input: { doctorId: string; version?: number; name: unknown; active: boolean; acceptsOnline: boolean; serviceIds: unknown },
  options: SaveOptions = {},
): Promise<{ conflicts: AttentionItem[] }> {
  const name = cleanName(input.name);
  if (name.length < 2) throw invalid({ name: 'Shkruani emrin e dentistit.' });
  const serviceIds = ids(input.serviceIds);
  return sql.begin(async (tx) => {
    const [row] = await tx<{ updatedAt: Date }[]>`SELECT updated_at FROM doctors WHERE id = ${input.doctorId} FOR UPDATE`;
    checkVersion(row, input.version);
    const conflicts = await withConflictCheck(tx, { doctorIds: [input.doctorId] }, options, async () => {
      await tx`UPDATE doctors SET name = ${name}, active = ${input.active}, accepts_online = ${input.acceptsOnline}, updated_at = now()
               WHERE id = ${input.doctorId}`;
      await tx`DELETE FROM doctor_services WHERE doctor_id = ${input.doctorId} AND NOT (service_id = ANY(${serviceIds}::uuid[]))`;
      if (serviceIds.length) {
        await tx`INSERT INTO doctor_services (doctor_id, service_id)
                 SELECT ${input.doctorId}, id FROM services WHERE id = ANY(${serviceIds}::uuid[])
                 ON CONFLICT DO NOTHING`;
      }
    });
    return { conflicts };
  });
}

/** Only dentists without any appointment history can be deleted; others are deactivated instead. */
export async function deleteDoctor(sql: Sql, doctorId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [{ count }] = await tx<{ count: number }[]>`SELECT count(*)::int AS count FROM appointments WHERE doctor_id = ${doctorId}`;
    if (count > 0) throw new ConfigError('in_use');
    const res = await tx`DELETE FROM doctors WHERE id = ${doctorId}`;
    if (res.count === 0) throw new ConfigError('not_found');
  });
}

export async function saveWeeklySchedule(
  sql: Sql,
  input: { doctorId: string; version?: number; days: { weekday: number; periods: PeriodInput[] }[] },
  options: SaveOptions = {},
): Promise<{ conflicts: AttentionItem[] }> {
  const dayNames = ['', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë', 'E diel'];
  const rows: { weekday: number; startMinute: number; endMinute: number }[] = [];
  for (const d of input.days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 1 || d.weekday > 7) throw invalid({ periods: 'Dita nuk është e vlefshme.' });
    for (const p of parsePeriods(d.periods ?? [], dayNames[d.weekday])) rows.push({ weekday: d.weekday, ...p });
  }
  return sql.begin(async (tx) => {
    const [row] = await tx<{ updatedAt: Date }[]>`SELECT updated_at FROM doctors WHERE id = ${input.doctorId} FOR UPDATE`;
    checkVersion(row, input.version);
    const conflicts = await withConflictCheck(tx, { doctorIds: [input.doctorId] }, options, async () => {
      await tx`DELETE FROM weekly_schedules WHERE doctor_id = ${input.doctorId}`;
      for (const r of rows) {
        await tx`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
                 VALUES (${input.doctorId}, ${r.weekday}, ${r.startMinute}, ${r.endMinute})`;
      }
      await touchDoctor(tx, input.doctorId);
    });
    return { conflicts };
  });
}

// ---------------------------------------------------------------- services

export interface ServiceInput {
  serviceId?: string;
  version?: number;
  nameSq: unknown;
  nameEn: unknown;
  nameDe: unknown;
  durationMin: unknown;
  active: boolean;
  onlineVisible: boolean;
  doctorIds: unknown;
}

function validateService(input: ServiceInput) {
  const fields: Record<string, string> = {};
  const nameSq = cleanName(input.nameSq);
  const nameEn = cleanName(input.nameEn) || null;
  const nameDe = cleanName(input.nameDe) || null;
  const duration = Number(input.durationMin);
  if (nameSq.length < 2) fields.nameSq = 'Shkruani emrin në shqip.';
  if (!Number.isInteger(duration) || duration < 5 || duration > 720 || duration % 5 !== 0) {
    fields.durationMin = 'Kohëzgjatja duhet të jetë nga 5 deri në 720 minuta, me hapa prej 5 minutash.';
  }
  if (Object.keys(fields).length) throw invalid(fields);
  return { nameSq, nameEn, nameDe, durationMin: duration, doctorIds: ids(input.doctorIds) };
}

/** Creates or updates a service. Duration changes apply to new appointments only. */
export async function saveService(sql: Sql, input: ServiceInput, options: SaveOptions = {}): Promise<{ id: string; conflicts: AttentionItem[] }> {
  const v = validateService(input);
  return sql.begin(async (tx) => {
    let id = input.serviceId;
    if (id) {
      const [row] = await tx<{ updatedAt: Date }[]>`SELECT updated_at FROM services WHERE id = ${id} FOR UPDATE`;
      checkVersion(row, input.version);
    }
    const conflicts = await withConflictCheck(tx, id ? { serviceIds: [id] } : { serviceIds: [] }, options, async () => {
      const values = {
        nameSq: v.nameSq,
        nameEn: v.nameEn,
        nameDe: v.nameDe,
        durationMin: v.durationMin,
        active: input.active,
        onlineVisible: input.onlineVisible,
      };
      if (id) {
        await tx`UPDATE services SET ${tx(values)} WHERE id = ${id}`;
      } else {
        const [row] = await tx<{ id: string }[]>`
          INSERT INTO services ${tx({ ...values, sortOrder: 0 })} RETURNING id`;
        id = row.id;
        await tx`UPDATE services SET sort_order = (SELECT coalesce(max(sort_order), 0) + 1 FROM services) WHERE id = ${id}`;
      }
      await tx`DELETE FROM doctor_services WHERE service_id = ${id} AND NOT (doctor_id = ANY(${v.doctorIds}::uuid[]))`;
      if (v.doctorIds.length) {
        await tx`INSERT INTO doctor_services (doctor_id, service_id)
                 SELECT id, ${id} FROM doctors WHERE id = ANY(${v.doctorIds}::uuid[]) ON CONFLICT DO NOTHING`;
      }
    });
    return { id: id!, conflicts };
  });
}

export async function deleteService(sql: Sql, serviceId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [{ count }] = await tx<{ count: number }[]>`SELECT count(*)::int AS count FROM appointments WHERE service_id = ${serviceId}`;
    if (count > 0) throw new ConfigError('in_use');
    const res = await tx`DELETE FROM services WHERE id = ${serviceId}`;
    if (res.count === 0) throw new ConfigError('not_found');
  });
}

// ---------------------------------------------------------------- time off

export const TIME_OFF_REASONS = ['vacation', 'sick', 'training', 'personal', 'other'] as const;

export interface TimeOffInput {
  id?: string;
  version?: number;
  doctorId: string;
  reason: string;
  note?: unknown;
  /** 'days': fromDate..toDate full days (inclusive). 'hours': date fromTime–toTime. */
  mode: 'days' | 'hours';
  fromDate?: string;
  toDate?: string;
  date?: string;
  fromTime?: string;
  toTime?: string;
}

function timeOffRange(input: TimeOffInput): { startsAt: Date; endsAt: Date; allDay: boolean } {
  if (input.mode === 'days') {
    const from = input.fromDate;
    const to = input.toDate || input.fromDate;
    if (!isValidLocalDate(from) || !isValidLocalDate(to)) throw invalid({ dates: 'Zgjidhni datën e fillimit dhe të mbarimit.' });
    if (to < from) throw invalid({ dates: 'Data e mbarimit duhet të jetë e njëjtë ose pas datës së fillimit.' });
    if (datesBetween(from, to).length > 366) throw invalid({ dates: 'Periudha mund të jetë deri në një vit.' });
    return { startsAt: new Date(wallClockToInstant(from, 0)), endsAt: new Date(wallClockToInstant(addDays(to, 1), 0)), allDay: true };
  }
  if (!isValidLocalDate(input.date)) throw invalid({ dates: 'Zgjidhni datën.' });
  const [p] = parsePeriods([{ start: input.fromTime ?? '', end: input.toTime ?? '' }], 'Orari');
  return {
    startsAt: new Date(wallClockToInstant(input.date, p.startMinute)),
    endsAt: new Date(wallClockToInstant(input.date, p.endMinute)),
    allDay: false,
  };
}

export async function saveTimeOff(sql: Sql, input: TimeOffInput, options: SaveOptions = {}): Promise<{ id: string; conflicts: AttentionItem[] }> {
  if (!(TIME_OFF_REASONS as readonly string[]).includes(input.reason)) throw invalid({ reason: 'Zgjidhni arsyen.' });
  if (!/^[0-9a-f-]{36}$/i.test(input.doctorId ?? '')) throw invalid({ doctorId: 'Zgjidhni dentistin.' });
  const range = timeOffRange(input);
  const note = optionalText(input.note);
  return sql.begin(async (tx) => {
    const [doctor] = await tx`SELECT id FROM doctors WHERE id = ${input.doctorId}`;
    if (!doctor) throw invalid({ doctorId: 'Zgjidhni dentistin.' });
    let id = input.id;
    let previousDoctor: string | null = null;
    if (id) {
      const [row] = await tx<{ updatedAt: Date; doctorId: string }[]>`SELECT updated_at, doctor_id FROM time_off WHERE id = ${id} FOR UPDATE`;
      checkVersion(row, input.version);
      previousDoctor = row.doctorId;
    }
    const doctorIds = [...new Set([input.doctorId, ...(previousDoctor ? [previousDoctor] : [])])];
    const conflicts = await withConflictCheck(tx, { doctorIds }, options, async () => {
      const values = { doctorId: input.doctorId, reason: input.reason, note, startsAt: range.startsAt, endsAt: range.endsAt, allDay: range.allDay };
      if (id) await tx`UPDATE time_off SET ${tx(values)} WHERE id = ${id}`;
      else id = (await tx<{ id: string }[]>`INSERT INTO time_off ${tx(values)} RETURNING id`)[0].id;
    });
    return { id: id!, conflicts };
  });
}

export async function deleteTimeOff(sql: Sql, id: string): Promise<void> {
  const res = await sql`DELETE FROM time_off WHERE id = ${id}`;
  if (res.count === 0) throw new ConfigError('not_found');
}

// ---------------------------------------------------------------- special dates (closures, special hours)

export interface DateOverrideInput {
  id?: string;
  version?: number;
  /** null = whole clinic */
  doctorId: string | null;
  date: string;
  /** Optional last date for multi-day closures (new entries only). */
  toDate?: string;
  kind: 'closed' | 'custom_hours';
  periods: PeriodInput[];
  note?: unknown;
}

export async function saveDateOverride(
  sql: Sql,
  input: DateOverrideInput,
  options: SaveOptions = {},
): Promise<{ ids: string[]; conflicts: AttentionItem[] }> {
  if (input.kind !== 'closed' && input.kind !== 'custom_hours') throw invalid({ kind: 'Zgjidhni llojin.' });
  if (!isValidLocalDate(input.date)) throw invalid({ dates: 'Zgjidhni datën.' });
  const last = input.id ? input.date : input.toDate || input.date;
  if (!isValidLocalDate(last) || last < input.date) throw invalid({ dates: 'Data e mbarimit duhet të jetë e njëjtë ose pas datës së fillimit.' });
  const dates = datesBetween(input.date, last);
  if (dates.length > 60) throw invalid({ dates: 'Mund të shtohen deri në 60 ditë njëherësh.' });
  if (input.kind === 'custom_hours' && dates.length > 1) throw invalid({ dates: 'Orari i veçantë vendoset për një datë të vetme.' });
  const periods = input.kind === 'custom_hours' ? parsePeriods(input.periods ?? [], 'Orari') : [];
  if (input.kind === 'custom_hours' && periods.length === 0) throw invalid({ periods: 'Shtoni të paktën një periudhë pune.' });
  const note = optionalText(input.note);
  const doctorId = input.doctorId && /^[0-9a-f-]{36}$/i.test(input.doctorId) ? input.doctorId : null;

  return sql.begin(async (tx) => {
    if (input.id) {
      const [row] = await tx<{ updatedAt: Date }[]>`SELECT updated_at FROM date_overrides WHERE id = ${input.id} FOR UPDATE`;
      checkVersion(row, input.version);
    }
    const existing = await tx<{ date: string; id: string }[]>`
      SELECT date::text AS date, id FROM date_overrides
      WHERE date = ANY(${dates}::date[]) AND doctor_id IS NOT DISTINCT FROM ${doctorId}::uuid
        AND (${input.id ?? null}::uuid IS NULL OR id <> ${input.id ?? null}::uuid)`;
    if (existing.length) throw new ConfigError('exists', { fields: { dates: existing.map((e) => e.date).join(', ') } });

    const savedIds: string[] = [];
    const scope = doctorId ? { doctorIds: [doctorId] } : {};
    const conflicts = await withConflictCheck(tx, scope, options, async () => {
      for (const date of dates) {
        let id = input.id;
        if (id) await tx`UPDATE date_overrides SET date = ${date}, doctor_id = ${doctorId}, kind = ${input.kind}, note = ${note} WHERE id = ${id}`;
        else id = (await tx<{ id: string }[]>`INSERT INTO date_overrides (date, doctor_id, kind, note) VALUES (${date}, ${doctorId}, ${input.kind}, ${note}) RETURNING id`)[0].id;
        await tx`DELETE FROM date_override_periods WHERE override_id = ${id}`;
        for (const p of periods) {
          await tx`INSERT INTO date_override_periods (override_id, start_minute, end_minute) VALUES (${id}, ${p.startMinute}, ${p.endMinute})`;
        }
        savedIds.push(id);
      }
    });
    return { ids: savedIds, conflicts };
  });
}

export async function deleteDateOverride(sql: Sql, id: string, options: SaveOptions = {}): Promise<{ conflicts: AttentionItem[] }> {
  // Removing special hours can itself create conflicts (e.g. an exceptional working day is removed).
  return sql.begin(async (tx) => {
    const [row] = await tx<{ doctorId: string | null }[]>`SELECT doctor_id FROM date_overrides WHERE id = ${id} FOR UPDATE`;
    if (!row) throw new ConfigError('not_found');
    const conflicts = await withConflictCheck(tx, row.doctorId ? { doctorIds: [row.doctorId] } : {}, options, async () => {
      await tx`DELETE FROM date_overrides WHERE id = ${id}`;
    });
    return { conflicts };
  });
}

// ---------------------------------------------------------------- booking settings

export interface SettingsInput {
  version?: number;
  onlineEnabled: boolean;
  disabledMessageSq: unknown;
  disabledMessageEn: unknown;
  disabledMessageDe: unknown;
  bookingWindowDays: unknown;
  minNoticeMinutes: unknown;
  cancelDeadlineHours: unknown;
  slotStepMinutes: unknown;
  emailRequired: boolean;
  clinicNotifyEmail: unknown;
}

export async function saveSettings(sql: Sql, input: SettingsInput, actorId: string | null): Promise<void> {
  const fields: Record<string, string> = {};
  const msg = (v: unknown, key: string) => {
    const s = typeof v === 'string' ? v.trim().slice(0, 600) : '';
    if (s.length < 5) fields[key] = 'Shkruani mesazhin (min. 5 shkronja).';
    return s;
  };
  const int = (v: unknown, key: string, min: number, max: number, message: string) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) fields[key] = message;
    return n;
  };
  const values = {
    onlineEnabled: input.onlineEnabled,
    disabledMessageSq: msg(input.disabledMessageSq, 'disabledMessageSq'),
    disabledMessageEn: msg(input.disabledMessageEn, 'disabledMessageEn'),
    disabledMessageDe: msg(input.disabledMessageDe, 'disabledMessageDe'),
    bookingWindowDays: int(input.bookingWindowDays, 'bookingWindowDays', 1, 365, 'Zgjidhni nga 1 deri në 365 ditë.'),
    minNoticeMinutes: int(input.minNoticeMinutes, 'minNoticeMinutes', 0, 20160, 'Vlerë e pavlefshme.'),
    cancelDeadlineHours: int(input.cancelDeadlineHours, 'cancelDeadlineHours', 0, 336, 'Vlerë e pavlefshme.'),
    slotStepMinutes: int(input.slotStepMinutes, 'slotStepMinutes', 5, 60, 'Vlerë e pavlefshme.'),
    emailRequired: input.emailRequired,
    clinicNotifyEmail: optionalText(input.clinicNotifyEmail, 254)?.toLowerCase() ?? null,
    updatedBy: actorId,
  };
  if (![5, 10, 15, 20, 30, 60].includes(values.slotStepMinutes)) fields.slotStepMinutes = 'Vlerë e pavlefshme.';
  if (values.clinicNotifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.clinicNotifyEmail)) fields.clinicNotifyEmail = 'Email-i nuk është i saktë.';
  if (Object.keys(fields).length) throw invalid(fields);
  await sql.begin(async (tx) => {
    const [row] = await tx<{ updatedAt: Date }[]>`SELECT updated_at FROM settings WHERE id = 1 FOR UPDATE`;
    checkVersion(row, input.version);
    await tx`UPDATE settings SET ${tx(values)} WHERE id = 1`;
  });
}

// ---------------------------------------------------------------- staff accounts

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createStaffUser(sql: Sql, input: { name: unknown; email: unknown; password: unknown }): Promise<string> {
  const name = cleanName(input.name);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = 'Shkruani emrin.';
  if (!EMAIL_RE.test(email) || email.length > 254) fields.email = 'Shkruani një email të saktë.';
  if (password.length < MIN_PASSWORD_LENGTH) fields.password = `Fjalëkalimi duhet të ketë të paktën ${MIN_PASSWORD_LENGTH} karaktere.`;
  if (Object.keys(fields).length) throw invalid(fields);
  const hash = await hashPassword(password);
  try {
    const [row] = await sql<{ id: string }[]>`INSERT INTO admin_users (email, name, password_hash) VALUES (${email}, ${name}, ${hash}) RETURNING id`;
    return row.id;
  } catch (err) {
    if ((err as { code?: string }).code === '23505') throw new ConfigError('email_taken', { fields: { email: 'Ky email përdoret tashmë nga një llogari tjetër.' } });
    throw err;
  }
}

/**
 * Edits a staff account. Rules: nobody deactivates their own account (prevents lock-out), and the
 * clinic always keeps at least one active account. Deactivation ends that person's sessions at once.
 */
export async function updateStaffUser(
  sql: Sql,
  input: { userId: string; version?: number; name: unknown; email: unknown; active: boolean },
  actorId: string,
): Promise<void> {
  const name = cleanName(input.name);
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const fields: Record<string, string> = {};
  if (name.length < 2) fields.name = 'Shkruani emrin.';
  if (!EMAIL_RE.test(email) || email.length > 254) fields.email = 'Shkruani një email të saktë.';
  if (Object.keys(fields).length) throw invalid(fields);
  await sql.begin(async (tx) => {
    // Serialise account changes so two people cannot deactivate "the other last account" at once.
    await tx`SELECT pg_advisory_xact_lock(7316205)`;
    const [row] = await tx<{ updatedAt: Date; active: boolean }[]>`SELECT updated_at, active FROM admin_users WHERE id = ${input.userId} FOR UPDATE`;
    checkVersion(row, input.version);
    if (!input.active && row.active) {
      if (input.userId === actorId) throw new ConfigError('self');
      const [{ count }] = await tx<{ count: number }[]>`SELECT count(*)::int AS count FROM admin_users WHERE active AND id <> ${input.userId}`;
      if (count === 0) throw new ConfigError('last_active');
    }
    try {
      await tx`UPDATE admin_users SET name = ${name}, email = ${email}, active = ${input.active} WHERE id = ${input.userId}`;
    } catch (err) {
      if ((err as { code?: string }).code === '23505') throw new ConfigError('email_taken', { fields: { email: 'Ky email përdoret tashmë nga një llogari tjetër.' } });
      throw err;
    }
    if (!input.active) await tx`DELETE FROM sessions WHERE user_id = ${input.userId}`;
  });
}

/**
 * Sets a new password and signs the account out everywhere. When staff change their own password,
 * the session they are using stays valid (pass its token), every other session ends.
 */
export async function resetStaffPassword(
  sql: Sql,
  input: { userId: string; password: unknown; repeat: unknown },
  keepSessionToken?: string,
): Promise<void> {
  const password = typeof input.password === 'string' ? input.password : '';
  if (password.length < MIN_PASSWORD_LENGTH) throw invalid({ password: `Fjalëkalimi duhet të ketë të paktën ${MIN_PASSWORD_LENGTH} karaktere.` });
  if (password !== input.repeat) throw invalid({ repeat: 'Fjalëkalimet nuk përputhen.' });
  const hash = await hashPassword(password);
  const keep = keepSessionToken ? createHash('sha256').update(keepSessionToken).digest('hex') : null;
  await sql.begin(async (tx) => {
    const res = await tx`UPDATE admin_users SET password_hash = ${hash} WHERE id = ${input.userId}`;
    if (res.count === 0) throw new ConfigError('not_found');
    await tx`DELETE FROM sessions WHERE user_id = ${input.userId} AND (${keep}::text IS NULL OR token_hash <> ${keep}::text)`;
  });
}
