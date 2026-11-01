import { fileURLToPath } from 'node:url';
import { createBuilder } from './.aspire/modules/aspire.mjs';

const builder = await createBuilder();

const root = fileURLToPath(new URL('../', import.meta.url));

// Intentionally one-shot: Supabase CLI owns the containers and local data.
const backend = await builder.addExecutable('supabase', process.execPath, root,
  ['scripts/start-local-backend.mjs']);

// A composite launcher validates Supabase settings before starting Vite. HTTP
// matches the local CLI stack; the deployed site's HTTPS/CSP is unchanged.
await builder.addExecutable('web', process.execPath, root,
  ['scripts/local-web.mjs', process.env.LOCAL_WEB_MODE ?? 'dev'])
  .waitForCompletion(backend)
  .withHttpEndpoint({ name: 'http', env: 'PORT', isProxied: false })
  .withHttpHealthCheck({ path: '/' });

await builder.build().run();
