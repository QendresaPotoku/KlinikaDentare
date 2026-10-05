import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Sql } from '../../src/server/db/client.ts';
import { seedDemoData } from '../../src/server/db/demo-seed.ts';
import { createTestDb, resetData } from '../helpers/db.ts';

let sql: Sql;

beforeAll(async () => {
  sql = await createTestDb();
});

afterAll(async () => {
  await sql?.end();
});

beforeEach(() => resetData(sql));

describe('demo seed', () => {
  it('adds doctors, online services with assignments and weekly hours, without switching booking on', async () => {
    const r = await seedDemoData(sql);
    expect(r).toEqual({ doctorsCreated: 2, servicesCreated: 6, schedulesCreated: 21 });
    const [{ count: unassigned }] = await sql<{ count: number }[]>`
      SELECT count(*)::int AS count FROM services s
      WHERE s.online_visible AND NOT EXISTS (SELECT 1 FROM doctor_services ds WHERE ds.service_id = s.id)`;
    expect(unassigned).toBe(0);
    const [settings] = await sql`SELECT online_enabled FROM settings`;
    expect(settings.onlineEnabled).toBe(false);
  });

  it('never touches existing services or hours', async () => {
    await seedDemoData(sql);
    expect(await seedDemoData(sql)).toEqual({ doctorsCreated: 0, servicesCreated: 0, schedulesCreated: 0 });
    const [{ count }] = await sql<{ count: number }[]>`SELECT count(*)::int AS count FROM services`;
    expect(count).toBe(6);
  });
});
