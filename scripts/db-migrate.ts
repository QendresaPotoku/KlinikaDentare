// Applies pending database migrations. Usage: npm run db:migrate
import { createSql } from '../src/server/db/client.ts';
import { migrate } from '../src/server/db/migrate.ts';
import { config } from '../src/server/config.ts';

const sql = createSql(config.databaseUrl, { max: 1 });
try {
  const { applied, skipped } = await migrate(sql);
  for (const name of applied) console.log(`applied  ${name}`);
  console.log(applied.length ? `${applied.length} migration(s) applied.` : `Up to date (${skipped.length} already applied).`);
} catch (err) {
  console.error('Migration failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
