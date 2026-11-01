import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertLocalUrl } from './lib/local-environment.mjs';

test('local tests accept explicit loopback endpoints', () => {
  assert.equal(assertLocalUrl('http://127.0.0.1:55321/'), 'http://127.0.0.1:55321');
  assert.equal(assertLocalUrl('http://localhost:4175'), 'http://localhost:4175');
});

test('local tests reject hosted, ambiguous, and credential-bearing endpoints', () => {
  for (const url of ['https://example.supabase.co', 'http://localhost', 'http://127.0.0.1.evil:55321',
    'http://user:password@localhost:55321', 'http://localhost:55321/path',
    'http://localhost:55321?target=prod', 'http://localhost:55321#token', 'not a URL']) {
    assert.throws(() => assertLocalUrl(url), undefined, url);
  }
});
