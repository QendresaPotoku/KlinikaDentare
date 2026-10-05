// DEMO DATA for a LOCAL database only: example services, dentist assignments and weekly hours, so the
// booking flow can be tried. Usage: npm run db:seed:demo
// Refused in production and for any database that is not on this computer.
import { createSql } from '../src/server/db/client.ts';
import { seedDemoData } from '../src/server/db/demo-seed.ts';
import { config } from '../src/server/config.ts';

if (process.env.NODE_ENV === 'production') {
  console.error('Refused: demo data is never added to a production database.');
  process.exit(1);
}
let host = '';
try {
  host = new URL(config.databaseUrl).hostname;
} catch {
  // reported below
}
if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
  console.error('Refused: demo data is only added to a local database (DATABASE_URL must point to localhost).');
  process.exit(1);
}

const sql = createSql(config.databaseUrl, { max: 1 });
try {
  const r = await seedDemoData(sql);
  console.log(`Demo data: ${r.doctorsCreated} doctors, ${r.servicesCreated} services, ${r.schedulesCreated} weekly periods added.`);
  if (r.servicesCreated === 0) console.log('Services already existed: none added.');
  const [{ onlineEnabled }] = await sql<{ onlineEnabled: boolean }[]>`SELECT online_enabled FROM settings`;
  console.log(onlineEnabled ? 'Online booking is ON.' : 'Online booking is OFF: switch it on in /admin/settings/ to try it.');
} catch (err) {
  console.error('Demo seed failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
