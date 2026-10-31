import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { beforeEach, test } from 'node:test';

const metadata = new Map();
const secrets = new Map();
let rejectSecretWrites = false;
globalThis.__teilfairStorageTest = {
  metadata: {
    getItem: async key => metadata.get(key) ?? null,
    setItem: async (key, value) => { metadata.set(key, value); },
    removeItem: async key => { metadata.delete(key); },
  },
  secrets: {
    getItemAsync: async key => secrets.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (rejectSecretWrites) throw new Error('Keystore locked');
      secrets.set(key, value);
    },
    deleteItemAsync: async key => { secrets.delete(key); },
  },
};

// Run the real TypeScript adapter using Node's type stripping. Replace only the
// native storage bindings, so these tests need neither Expo nor a device.
registerHooks({
  resolve(specifier, context, next) {
    const mocks = {
      '@react-native-async-storage/async-storage': 'export default globalThis.__teilfairStorageTest.metadata;',
      'expo-secure-store': `const s = globalThis.__teilfairStorageTest.secrets;
        export const getItemAsync = s.getItemAsync, setItemAsync = s.setItemAsync, deleteItemAsync = s.deleteItemAsync;`,
    };
    if (mocks[specifier]) return { url: `data:text/javascript,${encodeURIComponent(mocks[specifier])}`, shortCircuit: true };
    return next(specifier, context);
  },
});
const { groupStorage } = await import('../packages/mobile/src/lib/groupStorage.ts');
const name = 'teilfair-storage';
const group = { id: '00000000-0000-4000-8000-000000000001', name: 'Trip', token: 'secret-token', permission: 'write', lastAccessed: 1 };
const state = groups => JSON.stringify({ state: { recentGroups: groups }, version: 0 });
beforeEach(() => { metadata.clear(); secrets.clear(); rejectSecretWrites = false; });

test('stores capabilities only in SecureStore and restores them for Zustand', async () => {
  await groupStorage.setItem(name, state([group]));
  assert.equal(metadata.get(name).includes('secret-token'), false);
  assert.equal(Object.hasOwn(JSON.parse(metadata.get(name)).state.recentGroups[0], 'token'), false);
  assert.deepEqual([...secrets.values()], ['secret-token']);
  assert.deepEqual(JSON.parse(await groupStorage.getItem(name)), JSON.parse(state([group])));
});

test('migrates existing plaintext capabilities without losing recent groups', async () => {
  metadata.set(name, state([group]));
  assert.equal(await groupStorage.getItem(name), state([group]));
  assert.equal(metadata.get(name).includes('secret-token'), false);
  assert.deepEqual([...secrets.values()], ['secret-token']);
});

test('failed keystore migration preserves the original until a retry succeeds', async () => {
  metadata.set(name, state([group]));
  rejectSecretWrites = true;
  await assert.rejects(groupStorage.getItem(name), /Keystore locked/);
  assert.equal(metadata.get(name), state([group]));
  rejectSecretWrites = false;
  await groupStorage.getItem(name);
  assert.equal(metadata.get(name).includes('secret-token'), false);
});

test('serializes saves and deletes capabilities for removed recent groups', async () => {
  const second = { ...group, id: '00000000-0000-4000-8000-000000000002', token: 'second-secret' };
  await Promise.all([
    groupStorage.setItem(name, state([group, second])),
    groupStorage.setItem(name, state([second])),
  ]);
  assert.equal(secrets.size, 1);
  assert.deepEqual(JSON.parse(await groupStorage.getItem(name)), JSON.parse(state([second])));
  await groupStorage.removeItem(name);
  assert.equal(metadata.size, 0);
  assert.equal(secrets.size, 0);
});

test('returns an empty store for missing metadata or a missing secure capability', async () => {
  assert.equal(await groupStorage.getItem(name), null);
  await groupStorage.setItem(name, state([group]));
  secrets.clear();
  assert.deepEqual(JSON.parse(await groupStorage.getItem(name)), JSON.parse(state([])));
  await groupStorage.removeItem('missing');
});
