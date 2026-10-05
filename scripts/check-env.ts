// Checks the environment before the server starts (run by `npm start`). Exit code 1 = do not start.
// Usage: npm run check:env   (set NODE_ENV=production to apply the production rules)
import { checkEnvironment } from '../src/server/env-check.ts';

try {
  process.loadEnvFile('.env');
} catch {
  /* hosts provide the environment directly */
}

const report = checkEnvironment();
for (const w of report.warnings) console.warn(`[config] warning: ${w}`);
if (report.errors.length) {
  for (const e of report.errors) console.error(`[config] error: ${e}`);
  console.error(`[config] ${report.errors.length} problem(s) found. The server was not started.`);
  process.exit(1);
}
console.log(`[config] OK (${report.production ? 'production' : 'development'} rules).`);
