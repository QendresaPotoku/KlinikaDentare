import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Sql } from './client.ts';

export const MIGRATIONS_DIR = resolve(process.cwd(), 'db', 'migrations');

// Arbitrary constant: serialises concurrent migration runs (e.g. two deploys starting at once).
const LOCK_ID = 7_316_204;

export interface MigrationResult {
  applied: string[];
  skipped: string[];
}

/**
 * Applies db/migrations/*.sql in filename order. Each file runs in its own transaction and is
 * recorded in schema_migrations with a checksum. Editing a file that was already applied is an
 * error: write a new migration instead.
 */
export async function migrate(sql: Sql, dir = MIGRATIONS_DIR): Promise<MigrationResult> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const result: MigrationResult = { applied: [], skipped: [] };

  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      checksum   text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  for (const name of files) {
    const content = await readFile(join(dir, name), 'utf8');
    const checksum = createHash('sha256').update(content).digest('hex');

    await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(${LOCK_ID})`;
      const [existing] = await tx<{ checksum: string }[]>`
        SELECT checksum FROM schema_migrations WHERE name = ${name}
      `;
      if (existing) {
        if (existing.checksum !== checksum) {
          throw new Error(`Migration ${name} was changed after it was applied. Add a new migration instead.`);
        }
        result.skipped.push(name);
        return;
      }
      await tx.unsafe(content);
      await tx`INSERT INTO schema_migrations (name, checksum) VALUES (${name}, ${checksum})`;
      result.applied.push(name);
    });
  }

  return result;
}
