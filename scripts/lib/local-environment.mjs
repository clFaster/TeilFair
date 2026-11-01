import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { root, supabase } from './commands.mjs';

export function localEndpoints() {
  const config = readFileSync(join(root, 'supabase/config.toml'), 'utf8');
  const port = section => {
    const body = config.match(new RegExp(`\\[${section}\\]([\\s\\S]*?)(?=\\n\\[|$)`))?.[1];
    const value = Number(body?.match(/^\s*port\s*=\s*(\d+)\s*$/m)?.[1]);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error(`Missing or invalid local Supabase ${section} port.`);
    }
    return value;
  };
  return {
    api: `http://127.0.0.1:${port('api')}`,
    studio: `http://127.0.0.1:${port('studio')}`,
    database: `tcp://127.0.0.1:${port('db')}`,
  };
}

export function assertLocalUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)
      || !url.port || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('Local testing requires an explicit loopback HTTP URL with a port.');
  }
  return url.origin;
}

export function localEnvironment() {
  // Read only local status; never fall back to .env files or hosted credentials.
  const status = JSON.parse(supabase(['status', '--workdir', root, '--output', 'json'], { stdio: 'pipe' }));
  const url = assertLocalUrl(status.API_URL);
  const apiPort = new URL(localEndpoints().api).port;
  if (new URL(url).port !== apiPort || !status.ANON_KEY) {
    throw new Error('Local Supabase status does not match the configured API port or has no public key.');
  }
  return {
    VITE_SUPABASE_URL: url,
    VITE_SUPABASE_ANON_KEY: status.ANON_KEY,
    LOCAL_SUPABASE_URL: url,
    LOCAL_SUPABASE_ANON_KEY: status.ANON_KEY,
  };
}

export async function checkLocalBackend(env = localEnvironment()) {
  const url = assertLocalUrl(env.LOCAL_SUPABASE_URL);
  const response = await fetch(`${url}/rest/v1/rpc/get_group`, {
    method: 'POST',
    headers: { apikey: env.LOCAL_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.LOCAL_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requested_group_id: '00000000-0000-4000-8000-000000000000' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok || JSON.stringify(await response.json()) !== '[]') {
    throw new Error(`Local capability RPC readiness check failed (${response.status}).`);
  }
}
