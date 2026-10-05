// Creates a staff account for the admin panel, or resets the password of an existing one.
// Usage: npm run admin:create -- --email name@example.com --name "Full Name"
// The password is asked for interactively (not echoed). When input is piped, the first line is used.
import { parseArgs } from 'node:util';
import { createInterface } from 'node:readline';
import { createSql } from '../src/server/db/client.ts';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../src/server/auth/password.ts';
import { config } from '../src/server/config.ts';

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
    if (process.stdin.isTTY) {
      // Suppress echo of the typed characters.
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
        if (s.includes(question)) process.stdout.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (process.stdin.isTTY) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

const { values } = parseArgs({ options: { email: { type: 'string' }, name: { type: 'string' } } });
const email = values.email?.trim().toLowerCase();
const name = values.name?.trim();

if (!email || !email.includes('@') || !name) {
  console.error('Usage: npm run admin:create -- --email name@example.com --name "Full Name"');
  process.exit(1);
}

const password = await askHidden(`Password (min. ${MIN_PASSWORD_LENGTH} characters): `);
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}
if (process.stdin.isTTY && (await askHidden('Repeat password: ')) !== password) {
  console.error('Passwords do not match.');
  process.exit(1);
}

const sql = createSql(config.databaseUrl, { max: 1 });
try {
  const passwordHash = await hashPassword(password);
  const [user] = await sql<{ inserted: boolean }[]>`
    INSERT INTO admin_users (email, name, password_hash)
    VALUES (${email}, ${name}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, password_hash = EXCLUDED.password_hash, active = true
    RETURNING (xmax = 0) AS inserted
  `;
  // A password reset also signs the user out everywhere.
  if (!user.inserted) await sql`DELETE FROM sessions WHERE user_id = (SELECT id FROM admin_users WHERE email = ${email})`;
  console.log(user.inserted ? `Created admin account ${email}.` : `Updated admin account ${email} (password reset).`);
} catch (err) {
  console.error('Failed:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await sql.end();
}
