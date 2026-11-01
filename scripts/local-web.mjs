import { join } from 'node:path';
import { command, root } from './lib/commands.mjs';
import { checkLocalBackend, localEnvironment } from './lib/local-environment.mjs';

const mode = process.argv[2] ?? 'dev';
if (!['dev', 'preview', 'build-preview'].includes(mode)) throw new Error(`Unknown local web mode: ${mode}`);
const local = localEnvironment();
await checkLocalBackend(local);
const env = { ...process.env, ...local, TEILFAIR_LOCAL_PREVIEW: '1' };
const web = join(root, 'packages/web');
const vite = join(web, 'node_modules/vite/bin/vite.js');
const tsc = join(root, 'node_modules/@typescript/native/bin/tsc');
const port = process.env.PORT ?? '4175';
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid local web port.');
const run = args => command(process.execPath, [vite, ...args], { cwd: web, env });

if (mode === 'build-preview') {
  command(process.execPath, [tsc, '-p', 'packages/shared/tsconfig.json']);
  command(process.execPath, [tsc, '-b'], { cwd: web, env });
  run(['build', '--outDir', 'dist-local']);
}
console.log(`Starting local web (${mode}) with Supabase at ${local.LOCAL_SUPABASE_URL}.`);
const args = mode === 'dev' ? [] : ['preview', '--outDir', 'dist-local'];
run([...args, '--host', '127.0.0.1', '--port', port, '--strictPort']);
