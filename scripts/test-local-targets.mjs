import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { assertLocalUrl } from './lib/local-environment.mjs';
import { productionTarget } from './lib/production-target.mjs';

test('local tests accept explicit loopback endpoints', () => {
  assert.equal(assertLocalUrl('http://127.0.0.1:55321/'), 'http://127.0.0.1:55321');
  assert.equal(assertLocalUrl('http://localhost:4175'), 'http://localhost:4175');
});

test('scheduled tests require an explicit hosted HTTPS origin', () => {
  assert.equal(productionTarget(' https://teilfair.example/ '), 'https://teilfair.example');
  for (const url of [undefined, '', 'http://production.example', 'https://localhost:4175',
    'https://127.0.0.1:4175', 'https://[::1]:4175', 'https://test.localhost',
    'https://user:password@production.example', 'https://production.example/g/id#t=token']) {
    assert.throws(() => productionTarget(url));
  }
});

test('local tests reject hosted, ambiguous, and credential-bearing endpoints', () => {
  for (const url of ['https://example.supabase.co', 'http://localhost', 'http://127.0.0.1.evil:55321',
    'http://user:password@localhost:55321', 'http://localhost:55321/path',
    'http://localhost:55321?target=prod', 'http://localhost:55321#token', 'not a URL']) {
    assert.throws(() => assertLocalUrl(url), undefined, url);
  }
});
