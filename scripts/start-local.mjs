import { cpSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const standalone = resolve(root, '.next/standalone');
if (!existsSync(resolve(standalone, 'server.js'))) throw new Error('Build the app first: npm run build -- --webpack');
cpSync(resolve(root, 'public'), resolve(standalone, 'public'), { recursive: true });
cpSync(resolve(root, '.next/static'), resolve(standalone, '.next/static'), { recursive: true });
const child = spawn(process.execPath, ['--env-file=' + resolve(root, '.env'), resolve(standalone, 'server.js')], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, HOSTNAME: '127.0.0.1', PORT: '3000', JOBASSIST_DATA_DIR: resolve(root, 'data') },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 0));
