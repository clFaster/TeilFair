import { mkdirSync, writeFileSync } from 'node:fs';
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

/** Only counts and static test titles may leave the runner, never steps/errors. */
export default class SystemTestReporter implements Reporter {
  private tests = new Map<string, { title: string; status: string; retried: boolean }>();

  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.set(test.id, { title: test.title, status: result.status, retried: result.retry > 0 });
  }

  onEnd(result: FullResult) {
    const tests = [...this.tests.values()];
    const failed = tests.filter(test => !['passed', 'skipped'].includes(test.status));
    const runnerFailed = result.status !== 'passed' && failed.length === 0;
    if (runnerFailed) failed.push({ title: 'Test runner failed', status: 'failed', retried: false });
    const report = {
      stats: {
        expected: tests.filter(test => test.status === 'passed' && !test.retried).length,
        unexpected: failed.length,
        flaky: tests.filter(test => test.status === 'passed' && test.retried).length,
        skipped: tests.filter(test => test.status === 'skipped').length,
        duration: result.duration,
      },
      suites: [{ specs: failed.map(test => ({
        title: test.title, tests: [{ status: 'unexpected', results: [{ status: test.status }] }],
      })) }],
    };
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/results.json', JSON.stringify(report));
    console.log(`System tests ${result.status}: ${tests.length} tests, ${failed.length} failures.`);
    for (const test of failed) console.log(`Failed: ${test.title}`);
  }
}
