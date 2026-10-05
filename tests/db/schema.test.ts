import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';
import { seedInitialData } from '../../src/server/db/seed.ts';
import { appointmentRow, createTestDb, insertDoctorAndService, pgErrorCode, resetData } from '../helpers/db.ts';

const EXCLUSION_VIOLATION = '23P01';
const CHECK_VIOLATION = '23514';
const FK_VIOLATION = '23503';

let sql: Sql;

beforeAll(async () => {
  sql = await createTestDb();
});

afterAll(async () => {
  await sql?.end();
});

const clearData = () => resetData(sql);

describe('migrations', () => {
  it('re-running applies nothing', async () => {
    const result = await migrate(sql);
    expect(result.applied).toEqual([]);
    expect(result.skipped).toContain('0001_initial.sql');
  });

  it('creates fail-safe default settings', async () => {
    const [settings] = await sql`SELECT * FROM settings`;
    expect(settings.onlineEnabled).toBe(false);
    expect(settings.emailRequired).toBe(false); // patients get SMS; email is optional
    expect(settings.bookingWindowDays).toBe(90);
    expect(settings.minNoticeMinutes).toBe(120);
    expect(settings.cancelDeadlineHours).toBe(24);
    expect(settings.disabledMessageSq).toBeTruthy();
    expect(settings.disabledMessageEn).toBeTruthy();
    expect(settings.disabledMessageDe).toBeTruthy();
  });

  it('allows only one settings row', async () => {
    expect(await pgErrorCode(sql`INSERT INTO settings (id, disabled_message_sq, disabled_message_en, disabled_message_de)
                                 VALUES (2, 'a', 'b', 'c')`)).toBe(CHECK_VIOLATION);
  });
});

describe('seed', () => {
  beforeEach(clearData);

  it('creates only the two doctors: no services, no schedules', async () => {
    const first = await seedInitialData(sql);
    expect(first).toEqual({ doctorsCreated: 2 });

    for (const table of ['services', 'doctor_services', 'weekly_schedules', 'date_overrides', 'time_off']) {
      const [{ count }] = await sql.unsafe(`SELECT count(*)::int AS count FROM ${table}`);
      expect(count, table).toBe(0);
    }
    const [settings] = await sql`SELECT online_enabled FROM settings`;
    expect(settings.onlineEnabled).toBe(false);
  });

  it('is idempotent and does not overwrite clinic data', async () => {
    await seedInitialData(sql);
    await sql`UPDATE doctors SET name = 'Renamed' WHERE name = 'Dr. Petriti'`;
    const second = await seedInitialData(sql);
    expect(second).toEqual({ doctorsCreated: 0 });
    const names = (await sql`SELECT name FROM doctors ORDER BY sort_order`).map((r) => r.name);
    expect(names).toEqual(['Renamed', 'Dr. Vlera']);
  });
});

describe('appointment overlap constraint', () => {
  let doctorId: string;
  let serviceId: string;

  beforeEach(async () => {
    await clearData();
    ({ doctorId, serviceId } = await insertDoctorAndService(sql));
  });

  const insert = (start: string, end: string, overrides: Record<string, unknown> = {}, doctor = doctorId) =>
    sql`INSERT INTO appointments ${sql(appointmentRow(doctor, serviceId, start, end, overrides))} RETURNING id`;

  it('rejects an overlapping appointment for the same doctor', async () => {
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z');
    expect(await pgErrorCode(insert('2026-11-02T09:15:00Z', '2026-11-02T09:45:00Z'))).toBe(EXCLUSION_VIOLATION);
  });

  it('rejects a longer appointment that covers an existing one', async () => {
    await insert('2026-11-02T10:00:00Z', '2026-11-02T10:30:00Z');
    expect(await pgErrorCode(insert('2026-11-02T09:30:00Z', '2026-11-02T11:30:00Z'))).toBe(EXCLUSION_VIOLATION);
  });

  it('allows back-to-back appointments', async () => {
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z');
    await expect(insert('2026-11-02T09:30:00Z', '2026-11-02T10:00:00Z')).resolves.toHaveLength(1);
  });

  it('allows the same time for different doctors', async () => {
    const [other] = await sql<{ id: string }[]>`INSERT INTO doctors (name) VALUES ('Dr. Other') RETURNING id`;
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z');
    await expect(insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z', {}, other.id)).resolves.toHaveLength(1);
  });

  it('treats completed and no-show appointments as occupying their time', async () => {
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z', { status: 'completed' });
    await insert('2026-11-02T10:00:00Z', '2026-11-02T10:30:00Z', { status: 'no_show' });
    expect(await pgErrorCode(insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z'))).toBe(EXCLUSION_VIOLATION);
    expect(await pgErrorCode(insert('2026-11-02T10:00:00Z', '2026-11-02T10:30:00Z'))).toBe(EXCLUSION_VIOLATION);
  });

  it('releases the time when an appointment is cancelled', async () => {
    const [first] = await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z');
    await sql`UPDATE appointments SET status = 'cancelled', cancelled_at = now(), cancelled_by_type = 'staff'
              WHERE id = ${first.id}`;
    await expect(insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z')).resolves.toHaveLength(1);
  });

  it('blocks reactivating a cancelled appointment into an occupied time', async () => {
    const [first] = await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z', {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledByType: 'patient',
    });
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z');
    expect(
      await pgErrorCode(sql`UPDATE appointments SET status = 'scheduled', cancelled_at = NULL WHERE id = ${first.id}`),
    ).toBe(EXCLUSION_VIOLATION);
  });

  it('blocks moving an appointment onto another one', async () => {
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z');
    const [second] = await insert('2026-11-02T11:00:00Z', '2026-11-02T11:30:00Z');
    expect(
      await pgErrorCode(sql`UPDATE appointments SET starts_at = '2026-11-02T09:10:00Z', ends_at = '2026-11-02T09:40:00Z'
                            WHERE id = ${second.id}`),
    ).toBe(EXCLUSION_VIOLATION);
  });

  it('lets exactly one of two simultaneous bookings for the same time succeed', async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 5 }, () => insert('2026-11-02T14:00:00Z', '2026-11-02T14:30:00Z')),
    );
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(1);
    const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === 'rejected');
    expect(rejected.every((a) => a.reason.code === EXCLUSION_VIOLATION)).toBe(true);
  });

  it('rejects an end before the start', async () => {
    expect(await pgErrorCode(insert('2026-11-02T10:00:00Z', '2026-11-02T09:00:00Z'))).toBe(CHECK_VIOLATION);
  });

  it('requires cancelled_at exactly when cancelled', async () => {
    expect(await pgErrorCode(insert('2026-11-02T10:00:00Z', '2026-11-02T10:30:00Z', { status: 'cancelled' }))).toBe(
      CHECK_VIOLATION,
    );
  });

  it('accepts only E.164 phone numbers', async () => {
    expect(await pgErrorCode(insert('2026-11-02T12:00:00Z', '2026-11-02T12:30:00Z', { patientPhone: '044 123 456' }))).toBe(
      CHECK_VIOLATION,
    );
    await expect(
      insert('2026-11-02T12:00:00Z', '2026-11-02T12:30:00Z', { patientPhone: '+4915112345678' }),
    ).resolves.toHaveLength(1);
  });

  it('enforces the duplicate-submit key', async () => {
    await insert('2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z', { idempotencyKey: 'abc' });
    expect(await pgErrorCode(insert('2026-11-03T09:00:00Z', '2026-11-03T09:30:00Z', { idempotencyKey: 'abc' }))).toBe(
      '23505',
    );
  });
});

describe('history protection', () => {
  beforeEach(clearData);

  it('cannot delete a doctor or service that has appointments', async () => {
    const { doctorId, serviceId } = await insertDoctorAndService(sql);
    await sql`INSERT INTO appointments ${sql(appointmentRow(doctorId, serviceId, '2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z'))}`;
    expect(await pgErrorCode(sql`DELETE FROM doctors WHERE id = ${doctorId}`)).toBe(FK_VIOLATION);
    expect(await pgErrorCode(sql`DELETE FROM services WHERE id = ${serviceId}`)).toBe(FK_VIOLATION);
  });

  it('cannot delete an appointment that has history events', async () => {
    const { doctorId, serviceId } = await insertDoctorAndService(sql);
    const [appt] = await sql<{ id: string }[]>`
      INSERT INTO appointments ${sql(appointmentRow(doctorId, serviceId, '2026-11-02T09:00:00Z', '2026-11-02T09:30:00Z'))}
      RETURNING id`;
    await sql`INSERT INTO appointment_events (appointment_id, type, actor_type) VALUES (${appt.id}, 'created', 'patient')`;
    expect(await pgErrorCode(sql`DELETE FROM appointments WHERE id = ${appt.id}`)).toBe(FK_VIOLATION);
  });
});

describe('schedules and overrides', () => {
  let doctorId: string;

  beforeEach(async () => {
    await clearData();
    ({ doctorId } = await insertDoctorAndService(sql));
  });

  it('supports split shifts but rejects overlapping periods on the same weekday', async () => {
    await sql`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
              VALUES (${doctorId}, 1, 480, 720), (${doctorId}, 1, 780, 1020)`; // 08:00–12:00, 13:00–17:00
    expect(
      await pgErrorCode(sql`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
                            VALUES (${doctorId}, 1, 700, 800)`),
    ).toBe(EXCLUSION_VIOLATION);
    // Same hours on another weekday are fine.
    await sql`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute) VALUES (${doctorId}, 2, 700, 800)`;
  });

  it('rejects invalid periods', async () => {
    expect(
      await pgErrorCode(sql`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
                            VALUES (${doctorId}, 1, 600, 600)`),
    ).toBe(CHECK_VIOLATION);
    expect(
      await pgErrorCode(sql`INSERT INTO weekly_schedules (doctor_id, weekday, start_minute, end_minute)
                            VALUES (${doctorId}, 8, 600, 660)`),
    ).toBe(CHECK_VIOLATION);
  });

  it('allows one override per date for the clinic and one per doctor', async () => {
    await sql`INSERT INTO date_overrides (date, doctor_id, kind) VALUES ('2026-12-31', NULL, 'custom_hours')`;
    await sql`INSERT INTO date_overrides (date, doctor_id, kind) VALUES ('2026-12-31', ${doctorId}, 'closed')`;
    expect(await pgErrorCode(sql`INSERT INTO date_overrides (date, doctor_id, kind) VALUES ('2026-12-31', NULL, 'closed')`)).toBe(
      '23505',
    );
  });
});
