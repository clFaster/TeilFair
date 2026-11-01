import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { aspire, describe } from './lib/aspire.mjs';
import { command, root, supabase } from './lib/commands.mjs';
import { assertLocalUrl } from './lib/local-environment.mjs';

try {
  aspire(['start'], { env: { ...process.env, LOCAL_WEB_MODE: 'build-preview' } });
  aspire(['wait', 'web', '--timeout', '180']);
  aspire(['wait', 'supabase-studio', '--timeout', '60']);
  const resources = describe().resources;
  const backend = resources.find(resource => resource.displayName === 'supabase-init');
  if (backend?.state !== 'Finished' || backend.exitCode !== 0) {
    throw new Error('Supabase initialization did not complete successfully.');
  }
  for (const name of ['supabase-db', 'supabase-api', 'supabase-studio']) {
    if (resources.find(resource => resource.displayName === name)?.healthStatus !== 'Healthy') {
      throw new Error(`Local resource ${name} is not healthy.`);
    }
  }
  const web = resources.find(resource => resource.displayName === 'web');
  if (web?.healthStatus !== 'Healthy') throw new Error('Local web resource is not healthy.');
  const url = assertLocalUrl(web.urls.find(endpoint => endpoint.name === 'http')?.url ?? '');
  command(process.execPath, [join(root, 'packages/web/node_modules/@playwright/test/cli.js'),
    'test', '--config', 'playwright.local.config.ts', ...process.argv.slice(2)], {
    cwd: join(root, 'packages/web'), env: { ...process.env, LOCAL_TEST_BASE_URL: url },
  });
} catch (error) {
  const directory = join(root, '.local/test-diagnostics');
  mkdirSync(directory, { recursive: true });
  for (const [name, args] of [
    ['resources.json', ['describe', '--format', 'Json']],
    ['web.log', ['logs', 'web']],
    ['supabase.log', ['logs', 'supabase-init']],
  ]) {
    try { writeFileSync(join(directory, name), aspire(args, { stdio: 'pipe' })); }
    catch (diagnosticError) { writeFileSync(join(directory, name), diagnosticError.message); }
  }
  throw error;
} finally {
  try { aspire(['stop']); } finally { supabase(['stop']); }
}
