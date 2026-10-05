import type { Sql } from './client.ts';

export interface SeedResult {
  doctorsCreated: number;
}

/**
 * Initial data for a new installation: only the clinic's two doctors. Safe to run more than once:
 * it only runs while the doctors table is empty, so it never overwrites what the clinic configured.
 *
 * Deliberately NOT seeded, because the clinic has not confirmed them: services (names, durations,
 * which are bookable online) and working schedules. Without them there is no online availability,
 * and online booking itself also starts switched off (see settings in 0001_initial.sql).
 */
export async function seedInitialData(sql: Sql): Promise<SeedResult> {
  return sql.begin(async (tx) => {
    const [{ count }] = await tx<{ count: number }[]>`SELECT count(*)::int AS count FROM doctors`;
    if (count > 0) return { doctorsCreated: 0 };
    const doctors = await tx`
      INSERT INTO doctors (name, sort_order) VALUES ('Dr. Petriti', 1), ('Dr. Vlera', 2)
      RETURNING id
    `;
    return { doctorsCreated: doctors.length };
  });
}
