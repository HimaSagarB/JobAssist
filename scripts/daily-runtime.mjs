import { openSync, closeSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';

export function isDailyServer(health) {
  return health?.app === 'JobAssist' && health?.dailyLauncher === true;
}

/** Startup lock only; repeated daily commands may reuse the ready services. */
export function acquireStartupLock(path) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const descriptor = openSync(path, 'wx', 0o600);
      writeFileSync(descriptor, String(process.pid));
      closeSync(descriptor);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        // Do not remove a lock another process acquired after ours.
        try { if (readFileSync(path, 'utf8') === String(process.pid)) unlinkSync(path); } catch { /* Already removed. */ }
      };
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      let pid;
      try { pid = Number(readFileSync(path, 'utf8')); } catch { continue; }
      if (!Number.isInteger(pid) || pid <= 0) throw new Error('An incomplete daily startup lock exists. Check data/daily-start.lock before trying again.');
      try { process.kill(pid, 0); } catch (probe) {
        if (probe.code === 'ESRCH') { try { unlinkSync(path); } catch {} continue; }
      }
      throw new Error('Another JobAssist daily command is starting. Wait for it to open the review queue.');
    }
  }
  throw new Error('Could not acquire the daily startup lock. Try again.');
}
