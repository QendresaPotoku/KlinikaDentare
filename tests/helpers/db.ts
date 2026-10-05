import { requireEnv } from '../../src/server/config.ts';
import { createSql, type Sql } from '../../src/server/db/client.ts';
import { migrate } from '../../src/server/db/migrate.ts';

/**
 * Connects to TEST_DATABASE_URL, wipes it and applies all migrations. Refuses to run against
 * anything that does not look like a dedicated test database.
 */
export async function createTestDb(): Promise<Sql> {
  const url = requireEnv('TEST_DATABASE_URL');
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(`TEST_DATABASE_URL must point to a database whose name ends in "_test" (got "${dbName}").`);
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL === url) {
    throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');
  }

  const sql = createSql(url, { max: 5 });
  await resetDb(sql);
  await migrate(sql);
  return sql;
}

export async function resetDb(sql: Sql): Promise<void> {
  await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
}

/**
 * Empties all data tables and restores the settings row to the migration defaults.
 * (settings references admin_users, so a cascading truncate would remove it too.)
 */
export async function resetData(sql: Sql): Promise<void> {
  await sql`TRUNCATE appointment_events, notifications, appointments, doctor_services, weekly_schedules, time_off,
            date_override_periods, date_overrides, services, doctors, sessions, admin_users, rate_limits, settings`;
  await sql`
    INSERT INTO settings (id, disabled_message_sq, disabled_message_en, disabled_message_de)
    VALUES (1, 'Rezervimi online nuk është i disponueshëm.', 'Online booking is unavailable.', 'Online-Buchung ist nicht verfügbar.')
  `;
}

/** Minimal doctor + service for tests. */
export async function insertDoctorAndService(sql: Sql, name = 'Dr. Test') {
  const [doctor] = await sql<{ id: string }[]>`INSERT INTO doctors (name) VALUES (${name}) RETURNING id`;
  const [service] = await sql<{ id: string }[]>`
    INSERT INTO services (name_sq, duration_min) VALUES ('Konsultë', 30) RETURNING id
  `;
  return { doctorId: doctor.id, serviceId: service.id };
}

export function appointmentRow(
  doctorId: string,
  serviceId: string,
  startsAt: string,
  endsAt: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    doctorId,
    serviceId,
    serviceNameSnapshot: 'Konsultë',
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
    source: 'online',
    patientName: 'Test Patient',
    patientPhone: '+38344123456',
    patientEmail: 'patient@example.com',
    lang: 'sq',
    ...overrides,
  };
}

/** Postgres error code of a rejected promise (e.g. 23P01 = exclusion violation). */
export async function pgErrorCode(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (err) {
    return (err as { code?: string }).code;
  }
}
