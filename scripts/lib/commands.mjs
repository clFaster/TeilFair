import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(import.meta.url);
const supabaseEntry = require.resolve('supabase/dist/supabase.js');

export function command(executable, args, options = {}) {
  const result = spawnSync(executable, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${executable} exited with ${result.status}: ${result.stderr ?? ''}`);
  }
  return result.stdout;
}

export function supabase(args, options) {
  return command(process.execPath, [supabaseEntry, ...args], options);
}
