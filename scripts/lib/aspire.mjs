import { join } from 'node:path';
import { createRequire } from 'node:module';
import { command, root } from './commands.mjs';

export const apphost = join(root, 'aspire-apphost/apphost.mts');
const require = createRequire(import.meta.url);
const cli = require.resolve('@microsoft/aspire-cli/bin/aspire.js');

export function aspire(args, options) {
  return command(process.execPath, [cli, ...args, '--apphost', apphost, '--non-interactive'], {
    ...options,
    env: {
      ...process.env, ...options?.env,
      // Aspire uses pnpm --ignore-workspace, which skips pnpm-workspace.yaml.
      // Scope the required build permission to this child process only.
      PNPM_CONFIG_ALLOW_BUILDS: '{"esbuild":true}',
      PNPM_CONFIG_FROZEN_LOCKFILE: 'true',
    },
  });
}

export function describe() {
  const output = aspire(['describe', '--format', 'Json'], { stdio: 'pipe' });
  // CLI progress text can precede the JSON payload even with --format Json.
  return JSON.parse(output.slice(output.indexOf('{')));
}
