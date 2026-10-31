import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import Reporter from '../packages/web/scripts/system-test-reporter.ts';

function runReporter(callback) {
  const directory = mkdtempSync(join(tmpdir(), 'teilfair-reporter-test-'));
  const previous = process.cwd();
  const originalLog = console.log;
  const logs = [];
  try {
    process.chdir(directory);
    console.log = (...args) => logs.push(args.join(' '));
    callback(new Reporter());
    const json = readFileSync(join(directory, 'test-results/results.json'), 'utf8');
    return { report: JSON.parse(json), output: json + logs.join('\n') };
  } finally {
    console.log = originalLog;
    process.chdir(previous);
    rmSync(directory, { recursive: true, force: true });
  }
}

test('system reports omit live URLs, errors, headers, steps, and captured output', () => {
  const secret = 'SENSITIVE-CAPABILITY-DO-NOT-EXPORT';
  const result = runReporter(reporter => {
    reporter.onTestEnd({ id: '1', title: 'Static test title' }, {
      status: 'failed', retry: 0,
      error: { message: `Navigation failed: /g/group?t=${secret}` },
      steps: [{ title: `goto #t=${secret}` }],
      stdout: [secret], attachments: [{ body: secret }],
      headers: { 'x-group-token': secret },
    });
    reporter.onEnd({ status: 'failed', duration: 123 });
  });
  assert.equal(result.output.includes(secret), false);
  assert.equal(result.report.stats.unexpected, 1);
  assert.equal(result.report.suites[0].specs[0].title, 'Static test title');
});

test('a runner failure with no test result is still reported as failure', () => {
  const { report } = runReporter(reporter => reporter.onEnd({ status: 'failed', duration: 0 }));
  assert.equal(report.stats.unexpected, 1);
});

test('only the final result is counted for a retried test', () => {
  const { report } = runReporter(reporter => {
    const test = { id: '1', title: 'Retry test' };
    reporter.onTestEnd(test, { status: 'failed', retry: 0 });
    reporter.onTestEnd(test, { status: 'passed', retry: 1 });
    reporter.onEnd({ status: 'passed', duration: 123 });
  });
  assert.equal(report.stats.unexpected, 0);
  assert.equal(report.stats.flaky, 1);
});
