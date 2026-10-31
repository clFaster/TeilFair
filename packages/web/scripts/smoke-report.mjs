#!/usr/bin/env node
/**
 * Runs the smoke suite and prints a compact summary: counts per project and
 * status, total time, and every failed test with the first lines of its error.
 * The failure list is also written to playwright-report/smoke-failures.txt.
 *
 * Usage (from packages/web):
 *   node scripts/smoke-report.mjs                      # both projects
 *   node scripts/smoke-report.mjs --project=chromium ui.spec.ts
 *   node scripts/smoke-report.mjs --last-failed        # re-run only what failed last time
 * Extra arguments are passed straight to `playwright test`. Retries are off unless
 * `--retries=N` is given (CI=1 would otherwise turn on 2 retries and hide flakes).
 * SMOKE_ERROR_LINES=40 prints longer error excerpts (default 12).
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = join(root, 'playwright-report');
const jsonFile = join(reportDir, 'smoke-results.json');
const failuresFile = join(reportDir, 'smoke-failures.txt');
mkdirSync(reportDir, { recursive: true });

const args = process.argv.slice(2);
if (!args.some((arg) => arg.startsWith('--retries'))) args.push('--retries=0');
const errorLines = Number(process.env.SMOKE_ERROR_LINES) || 12;
const started = Date.now();
const run = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', '--config', 'playwright.smoke.config.ts', '--reporter=dot,json', ...args],
  {
    cwd: root,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: jsonFile, PLAYWRIGHT_JSON_OUTPUT_NAME: jsonFile },
  }
);
const wallSeconds = ((Date.now() - started) / 1000).toFixed(1);

let report;
try {
  report = JSON.parse(readFileSync(jsonFile, 'utf8'));
} catch {
  console.error(`\nNo JSON report at ${jsonFile} (exit code ${run.status}).`);
  process.exit(run.status ?? 1);
}

const counts = {};
const failures = [];
const visit = (suite, titles) => {
  const path = suite.title && !suite.title.endsWith('.ts') ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const project = t.projectName || 'default';
      // Flaky: report the attempt that failed, not the passing retry.
      const last = t.results?.find((r) => r.status !== 'passed' && r.status !== 'skipped') ?? t.results?.[t.results.length - 1];
      const status = t.status === 'expected' ? 'passed' : t.status === 'flaky' ? 'flaky' : t.status === 'skipped' ? 'skipped' : 'failed';
      counts[project] ??= { passed: 0, failed: 0, flaky: 0, skipped: 0 };
      counts[project][status] += 1;
      if (status === 'failed' || status === 'flaky') {
        const message = (last?.error?.message ?? last?.errors?.[0]?.message ?? 'unknown error')
          .replace(/\u001b\[[0-9;]*m/g, '')
          .split('\n')
          .filter(Boolean)
          .slice(0, errorLines)
          .join('\n      ');
        failures.push(`[${project}] ${spec.file}:${spec.line} › ${[...path, spec.title].join(' › ')} (${status}, ${last?.duration ?? 0}ms)\n      ${message}`);
      }
    }
  }
  for (const child of suite.suites ?? []) visit(child, path);
};
for (const suite of report.suites ?? []) visit(suite, []);

console.log('\n=== Smoke summary ===');
for (const [project, c] of Object.entries(counts)) {
  console.log(`${project.padEnd(14)} passed ${c.passed}  failed ${c.failed}  flaky ${c.flaky}  skipped ${c.skipped}`);
}
const testSeconds = ((report.stats?.duration ?? 0) / 1000).toFixed(1);
console.log(`tests ${testSeconds}s, wall ${wallSeconds}s (incl. build + preview start)`);

writeFileSync(failuresFile, failures.join('\n\n') + (failures.length ? '\n' : ''));
if (failures.length) {
  console.log(`\n${failures.length} failed/flaky (also in playwright-report/smoke-failures.txt):\n`);
  console.log(failures.join('\n\n'));
  console.log('\nRe-run only these: node scripts/smoke-report.mjs --last-failed');
}
process.exit(run.status ?? 1);
