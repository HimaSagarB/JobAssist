import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createConnection } from 'node:net';
import { parse } from 'dotenv';
import pg from 'pg';
import { acquireStartupLock, isDailyServer } from './daily-runtime.mjs';

const root = resolve(import.meta.dirname, '..');
process.chdir(root);
const children = new Set();
let stopping = false;
let releaseLock = () => {};
const pause = ms => new Promise(done => setTimeout(done, ms));

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  releaseLock();
  for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM');
  // Allow PostgreSQL and the web server to stop cleanly. Never stop reused services.
  await Promise.all([...children].map(child => child.exitCode !== null || child.signalCode !== null || !child.pid ? undefined : new Promise(done => child.once('exit', done))));
  process.exitCode = code;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => void stop());

function start(script) {
  const child = spawn(process.execPath, [script], { cwd: root, stdio: 'inherit', detached: true });
  children.add(child);
  child.on('error', () => { console.error('Could not start a local JobAssist service.'); void stop(1); });
  child.on('exit', code => {
    if (!stopping) { console.error(`A JobAssist service stopped (exit ${code ?? 'signal'}).`); void stop(1); }
  });
  return child;
}
function occupied(port, host) {
  return new Promise(done => {
    const socket = createConnection({ port, host });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); done(true); });
    socket.once('error', () => done(false));
    socket.once('timeout', () => { socket.destroy(); done(false); });
  });
}
async function health() {
  try { const response = await fetch('http://127.0.0.1:3000/api/health', { signal: AbortSignal.timeout(3000) }); return { ok: response.ok, body: await response.json() }; } catch { return null; }
}
async function waitFor(check, timeout, description) {
  const deadline = Date.now() + timeout;
  while (!stopping && Date.now() < deadline) { if (await check()) return; await pause(500); }
  if (!stopping) throw new Error(`${description} did not become ready. Check the service output above.`);
}

async function main() {
  if (!existsSync('.env')) throw new Error('First-time setup is required. Run npm run local:init, then follow LOCAL-SETUP.md.');
  if (!existsSync('.next/standalone/server.js')) throw new Error('Build JobAssist first: npm run local:prepare, then npm run build -- --webpack.');
  const configuration = parse(readFileSync('.env'));
  const connectionString = configuration.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is missing from .env.');
  const url = new URL(connectionString);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname) || Number(url.port || 5432) !== 55432) {
    throw new Error('The daily laptop launcher expects its local database on localhost:55432. Use the separate server commands for another database setup.');
  }
  mkdirSync('data', { recursive: true });
  releaseLock = acquireStartupLock(resolve(root, 'data/daily-start.lock'));
  const databaseReady = async () => {
    const client = new pg.Client({ connectionString, connectionTimeoutMillis: 1000 });
    try { await client.connect(); await client.query('SELECT 1'); return true; } catch { return false; } finally { await client.end().catch(() => {}); }
  };
  if (await databaseReady()) console.log('Using your running JobAssist database.');
  else {
    if (await occupied(55432, '127.0.0.1')) throw new Error('Port 55432 is in use, but the configured database could not authenticate. Check .env; no other service was stopped.');
    console.log('Starting your local database…'); start(resolve(root, 'tools/local-db/start.mjs'));
    await waitFor(databaseReady, 30000, 'The database');
  }
  if (stopping) return;
  const current = await health();
  if (current?.ok && isDailyServer(current.body)) console.log('Using your running JobAssist app.');
  else {
    if (await occupied(3000, '127.0.0.1')) throw new Error('Port 3000 is already in use by an older or different app. Stop that app, rebuild JobAssist if needed, then rerun npm run daily. No process was stopped automatically.');
    console.log('Starting JobAssist…'); start(resolve(root, 'scripts/start-local.mjs'));
    await waitFor(async () => { const answer = await health(); return answer?.ok && isDailyServer(answer.body); }, 60000, 'JobAssist');
  }
  if (stopping) return;
  releaseLock();
  const address = 'http://localhost:3000/daily';
  console.log(`\nDaily search and review: ${address}\nSign in normally if asked. Missing setup will be shown in the app.\nThe page starts at most one search per calendar day in your browser's timezone.\nDrafts follow your settings; application sending requires your confirmation.`);
  if (!process.argv.includes('--no-open')) {
    if (process.platform === 'darwin') {
      const browser = spawn('/usr/bin/open', [address], { stdio: 'ignore' });
      browser.on('error', () => console.log(`Open ${address} in your browser.`));
      browser.on('exit', code => { if (code) console.log(`Open ${address} in your browser.`); });
    } else console.log(`Open ${address} in your browser.`);
  }
  if (children.size) console.log('\nKeep this terminal open while searches and drafts finish. Ctrl+C stops only services this command started.');
  else console.log('\nBoth services were already running; their existing terminals remain in control.');
}
main().catch(async error => { console.error(error.message); await stop(1); });
