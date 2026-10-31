import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { acquireStartupLock, isDailyServer } from './daily-runtime.mjs';

test('reuses only a server identifying the daily launcher capability', () => {
  assert.equal(isDailyServer({ app: 'JobAssist', dailyLauncher: true }), true);
  for (const value of [null, {}, { app: 'Other', dailyLauncher: true }, { app: 'JobAssist' }]) assert.equal(isDailyServer(value), false);
});
test('startup lock rejects a second launch and releases idempotently', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jobassist-daily-test-'));
  try {
    const file = join(directory, 'lock');
    const release = acquireStartupLock(file);
    assert.throws(() => acquireStartupLock(file), /Another JobAssist/);
    assert.equal(readFileSync(file, 'utf8'), String(process.pid));
    release(); release(); acquireStartupLock(file)();
  } finally { rmSync(directory, { recursive: true }); }
});
test('a lock with an invalid PID is not silently discarded', () => {
  const directory = mkdtempSync(join(tmpdir(), 'jobassist-daily-test-'));
  try { const file = join(directory, 'lock'); writeFileSync(file, ''); assert.throws(() => acquireStartupLock(file), /incomplete/); }
  finally { rmSync(directory, { recursive: true }); }
});
