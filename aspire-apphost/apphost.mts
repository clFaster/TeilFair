import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';
import { createBuilder, HealthStatus, type HealthCheckResult } from './.aspire/modules/aspire.mjs';
import { localEndpoints } from '../scripts/lib/local-environment.mjs';

const builder = await createBuilder();

const root = fileURLToPath(new URL('../', import.meta.url));
const endpoints = localEndpoints();

// Intentionally one-shot: Supabase CLI owns the containers and local data.
const backend = await builder.addExecutable('supabase-init', process.execPath, root,
  ['scripts/start-local-backend.mjs']);

// Supabase CLI owns these services. External resources show their live health
// and connection links without starting duplicate containers.
const databaseUrl = new URL(endpoints.database);
await builder.addHealthCheck('supabase-db-tcp', () => new Promise<HealthCheckResult>(resolve => {
  const socket = createConnection({ host: databaseUrl.hostname, port: Number(databaseUrl.port) });
  const finish = (status: HealthStatus, description: string) => {
    socket.destroy();
    resolve({ status, description });
  };
  socket.setTimeout(3_000);
  socket.once('connect', () => finish(HealthStatus.Healthy, 'PostgreSQL TCP connection available.'));
  socket.once('timeout', () => finish(HealthStatus.Unhealthy, 'PostgreSQL connection timed out.'));
  socket.once('error', () => finish(HealthStatus.Unhealthy, 'Cannot connect to local PostgreSQL.'));
}));

const database = await builder.addExternalService('supabase-db', endpoints.database)
  .withHealthCheck('supabase-db-tcp');
const api = await builder.addExternalService('supabase-api', endpoints.api)
  .withHttpHealthCheck({ path: '/rest/v1/rpc/get_token' });
await builder.addExternalService('supabase-studio', endpoints.studio)
  .withHttpHealthCheck({ path: '/' });

// A composite launcher validates Supabase settings before starting Vite. HTTP
// matches the local CLI stack; the deployed site's HTTPS/CSP is unchanged.
await builder.addExecutable('web', process.execPath, root,
  ['scripts/local-web.mjs', process.env.LOCAL_WEB_MODE ?? 'dev'])
  .waitForCompletion(backend)
  .waitFor(database)
  .waitFor(api)
  .withHttpEndpoint({ name: 'http', env: 'PORT', isProxied: false })
  .withHttpHealthCheck({ path: '/' });

await builder.build().run();
