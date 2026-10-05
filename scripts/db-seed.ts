// Inserts the clinic's two doctors into an EMPTY database (nothing else: no services, schedules,
// appointments or staff accounts). Usage: npm run db:seed
// In production it runs only when confirmed explicitly: npm run db:seed -- --confirm
import { createSql } from '../src/server/db/client.ts';
import { seedInitialData } from '../src/server/db/seed.ts';
import { config } from '../src/server/config.ts';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--confirm')) {
  console.error('Production database: run "npm run db:seed -- --confirm" if you really want to add the two doctors.');
  process.exit(1);
}

const sql = createSql(config.databaseUrl, { max: 1 });
try {
  const { doctorsCreated } = await seedInitialData(sql);
  console.log(`Doctors created: ${doctorsCreated}.`);
  console.log('No services or working schedules were created: configure them in the admin panel before enabling online booking.');
} catch (err) {
  console.error('Seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
