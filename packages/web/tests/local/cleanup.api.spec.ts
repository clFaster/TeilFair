import { test, expect } from '@playwright/test';
import { LocalBackend } from './fixtures';

test('cleanup attempts every group and reports all deletion failures', async ({ request }) => {
  const failures = [new Error('First deletion failed'), new Error('Last deletion failed')];
  const attempts: string[] = [];
  class FailingBackend extends LocalBackend {
    override async rows<T>(method: string, path: string): Promise<T[]> {
      attempts.push(`${method} ${path}`);
      if (attempts.length === 1) throw failures[0];
      if (attempts.length === 3) throw failures[1];
      return [];
    }
  }
  const backend = new FailingBackend(request);
  for (const id of ['first', 'second', 'third']) {
    backend.track({ id, name: id, readToken: 'unused', writeToken: 'unused' });
  }

  await expect(backend.dispose()).rejects.toMatchObject({ name: 'AggregateError', errors: failures });
  expect(attempts).toEqual([
    'DELETE groups?id=eq.first&select=id',
    'DELETE groups?id=eq.second&select=id',
    'DELETE groups?id=eq.third&select=id',
  ]);
});
