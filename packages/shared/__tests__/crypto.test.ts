import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createGroupUrls, generateToken, generateUUID, isValidToken, parseCapabilityUrl, secureCompare,
} from '../src/crypto';

afterEach(() => vi.unstubAllGlobals());

describe('capability tokens', () => {
  it('generates valid default tokens and honors a custom length', () => {
    expect(isValidToken(generateToken())).toBe(true);
    expect(generateToken(64)).toMatch(/^[A-Za-z0-9]{64}$/);
  });

  it('gets its entropy from the platform crypto API', () => {
    const getRandomValues = vi.fn((bytes: Uint8Array) => {
      bytes.set([0, 25, 26, 51, 52, 61]);
      return bytes;
    });
    vi.stubGlobal('crypto', { getRandomValues });
    expect(generateToken(6)).toBe('AZaz09');
    expect(getRandomValues).toHaveBeenCalledOnce();
    expect(getRandomValues.mock.calls[0][0]).toBeInstanceOf(Uint8Array);
  });

  it.each([
    ['A'.repeat(32), true], ['aZ09'.repeat(8), true], ['', false],
    ['a'.repeat(31), false], ['a'.repeat(33), false],
    [`${'a'.repeat(31)}-`, false], [`${'a'.repeat(31)} `, false], [`${'a'.repeat(31)}é`, false],
  ])('validates token format %j', (token, expected) => {
    expect(isValidToken(token)).toBe(expected);
  });
});

describe('UUID generation', () => {
  it('uses randomUUID when available', () => {
    const randomUUID = vi.fn(() => '01234567-89ab-4cde-8fab-0123456789ab');
    const getRandomValues = vi.fn();
    vi.stubGlobal('crypto', { randomUUID, getRandomValues });
    expect(generateUUID()).toBe('01234567-89ab-4cde-8fab-0123456789ab');
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
  });

  it.each([false, true])('sets version and variant bits in the fallback (randomUUID throws: %s)', throws => {
    vi.stubGlobal('crypto', {
      ...(throws ? { randomUUID: () => { throw new Error('Unavailable in this context'); } } : {}),
      getRandomValues: (bytes: Uint8Array) => bytes.fill(255),
    });
    expect(generateUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('pads fallback UUID bytes to two hexadecimal digits', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(0) });
    expect(generateUUID()).toBe('00000000-0000-4000-8000-000000000000');
  });
});

describe.each([
  { name: 'token', generate: () => generateToken(), failure: 'Failed to generate random token' },
  { name: 'UUID', generate: () => generateUUID(), failure: 'Failed to generate UUID' },
])('$name crypto failures', ({ generate, failure }) => {
  it.each([undefined, {}])('fails when secure randomness is unavailable: %j', crypto => {
    vi.stubGlobal('crypto', crypto);
    expect(generate).toThrow('No cryptographic random number generator available');
  });

  it.each([new Error('Entropy unavailable'), 'failure'])('reports entropy source failure', error => {
    vi.stubGlobal('crypto', { getRandomValues: () => { throw error; } });
    expect(generate).toThrow(`${failure}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  });
});

describe('secureCompare', () => {
  it.each([
    ['abc', 'abc', true], ['', '', true], ['abc', 'ab', false],
    ['abc', 'xbc', false], ['abc', 'abx', false], ['ABC', 'abc', false], ['é', 'e', false],
  ])('compares %j and %j', (a, b, expected) => {
    expect(secureCompare(a, b)).toBe(expected);
  });
});

describe('capability links', () => {
  const groupId = '01234567-89ab-4cde-8fab-0123456789ab';

  it('creates separate read/write URLs that round-trip through the parser', () => {
    const urls = createGroupUrls('https://teilfair.example', groupId, 'ReadToken', 'WriteToken');
    expect(urls).toEqual({
      readUrl: `https://teilfair.example/g/${groupId}?t=ReadToken`,
      writeUrl: `https://teilfair.example/g/${groupId}?t=WriteToken`,
    });
    expect(parseCapabilityUrl(urls.readUrl)).toEqual({ groupId, token: 'ReadToken' });
    expect(parseCapabilityUrl(urls.writeUrl)).toEqual({ groupId, token: 'WriteToken' });
  });

  it('reads tokens alongside unrelated query parameters and fragments', () => {
    expect(parseCapabilityUrl(`https://teilfair.example/g/${groupId}?lang=de&t=AbC012#balances`))
      .toEqual({ groupId, token: 'AbC012' });
  });

  it.each([
    'not a url', '/g/abc?t=token', 'https://teilfair.example/',
    'https://teilfair.example/g/abc', 'https://teilfair.example/g/abc?t=',
    'https://teilfair.example/members/abc?t=token',
  ])('rejects missing or malformed capability links: %s', url => {
    expect(parseCapabilityUrl(url)).toBeNull();
  });
});
