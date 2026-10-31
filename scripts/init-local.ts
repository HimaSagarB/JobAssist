import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../src/lib/auth/password-hash';
async function main() {
  if (existsSync('.env')) throw new Error('.env already exists; preserving configuration.');
  mkdirSync('data', { recursive: true, mode: 0o700 });
  const password = randomBytes(18).toString('base64url');
  const dbPassword = randomBytes(24).toString('hex');
  const hash = await hashPassword(password);
  writeFileSync('.env', `JOBASSIST_PASSWORD=${hash}\nJOBASSIST_SECRET=${randomBytes(32).toString('hex')}\nDATABASE_URL=postgresql://postgres:${dbPassword}@127.0.0.1:55432/jobassist\nLOCAL_DB_PASSWORD=${dbPassword}\nJOBASSIST_DATA_DIR=./data\nJOBASSIST_TELEMETRY=off\n`, { mode: 0o600 });
  writeFileSync('data/LOCAL-LOGIN.txt', `Address: http://localhost:3000\nPassword: ${password}\n`, { mode: 0o600 });
  console.log('Local configuration created. Sign-in details: data/LOCAL-LOGIN.txt');
}
main();
