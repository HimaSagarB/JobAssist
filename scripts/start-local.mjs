import { existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const standalone = resolve(root, '.next/standalone');
if (!existsSync(resolve(standalone, 'server.js'))) throw new Error('Build the app first: npm run build -- --webpack');
// Local launch can link built assets directly. Re-copying the same files on
// each start is unnecessary and can stall on cloud-synced macOS folders.
for (const [source, destination] of [
  [resolve(root, 'public'), resolve(standalone, 'public')],
  [resolve(root, '.next/static'), resolve(standalone, '.next/static')],
]) {
  let current;
  try { current = lstatSync(destination); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (current?.isSymbolicLink() && readlinkSync(destination) === source) continue;
  // Only generated asset destinations inside the standalone build are replaced.
  if (current) rmSync(destination, { recursive: true, force: true });
  symlinkSync(source, destination, process.platform === 'win32' ? 'junction' : 'dir');
}
const child = spawn(process.execPath, ['--env-file=' + resolve(root, '.env'), resolve(standalone, 'server.js')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: '3000', JOBASSIST_DATA_DIR: resolve(root, 'data') },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 0));
