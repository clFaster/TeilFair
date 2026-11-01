import { join } from 'node:path';
import { aspire, describe } from './lib/aspire.mjs';
import { command, root, supabase } from './lib/commands.mjs';
import { assertLocalUrl } from './lib/local-environment.mjs';

try {
  aspire(['start'], { env: { ...process.env, LOCAL_WEB_MODE: 'build-preview' } });
  aspire(['wait', 'web', '--timeout', '180']);
  const resources = describe().resources;
  const backend = resources.find(resource => resource.displayName === 'supabase');
  if (backend?.state !== 'Finished' || backend.exitCode !== 0) {
    throw new Error('Supabase initialization did not complete successfully.');
  }
  const web = resources.find(resource => resource.displayName === 'web');
  if (web?.healthStatus !== 'Healthy') throw new Error('Local web resource is not healthy.');
  const url = assertLocalUrl(web.urls.find(endpoint => endpoint.name === 'http')?.url ?? '');
  command(process.execPath, [join(root, 'packages/web/node_modules/@playwright/test/cli.js'),
    'test', '--config', 'playwright.local.config.ts', ...process.argv.slice(2)], {
    cwd: join(root, 'packages/web'), env: { ...process.env, LOCAL_TEST_BASE_URL: url },
  });
} finally {
  try { aspire(['stop']); } finally { supabase(['stop']); }
}
