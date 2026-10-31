import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';
import type { RecentGroup } from '@teilfair/shared';

type StoredState = { state: { recentGroups: RecentGroup[] }; version?: number };
const tokenKey = (id: string) => `teilfair-group-token-${id}`;

// Metadata can exceed SecureStore's per-item limit. Store each capability
// separately in the OS keystore, and only non-secret metadata in AsyncStorage.
async function save(name: string, value: string): Promise<void> {
  const data = JSON.parse(value) as StoredState;
  const previous = await AsyncStorage.getItem(name);
  const previousGroups = previous ? (JSON.parse(previous) as StoredState).state.recentGroups : [];
  for (const group of data.state.recentGroups) {
    await SecureStore.setItemAsync(tokenKey(group.id), group.token);
  }
  const recentGroups = data.state.recentGroups.map(({ token: _token, ...metadata }) => metadata);
  await AsyncStorage.setItem(name, JSON.stringify({ ...data, state: { recentGroups } }));
  for (const group of previousGroups) {
    if (!data.state.recentGroups.some(current => current.id === group.id)) {
      await SecureStore.deleteItemAsync(tokenKey(group.id));
    }
  }
}

// Serialize writes so an older asynchronous save cannot overwrite newer state.
let pending: Promise<unknown> = Promise.resolve();
function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation);
  pending = result.catch(() => undefined);
  return result;
}

export const groupStorage: StateStorage = {
  getItem: name => enqueue(async () => {
    const value = await AsyncStorage.getItem(name);
    if (!value) return null;
    const data = JSON.parse(value) as StoredState;
    // Upgrade the old plaintext format only after all keystore writes succeed.
    if (data.state.recentGroups.some(group => typeof group.token === 'string')) {
      await save(name, value);
      return value;
    }
    const recentGroups: RecentGroup[] = [];
    for (const group of data.state.recentGroups) {
      const token = await SecureStore.getItemAsync(tokenKey(group.id));
      if (token) recentGroups.push({ ...group, token });
    }
    return JSON.stringify({ ...data, state: { recentGroups } });
  }),
  setItem: (name, value) => enqueue(() => save(name, value)),
  removeItem: name => enqueue(async () => {
    const value = await AsyncStorage.getItem(name);
    if (value) {
      const data = JSON.parse(value) as StoredState;
      for (const group of data.state.recentGroups) {
        await SecureStore.deleteItemAsync(tokenKey(group.id));
      }
    }
    await AsyncStorage.removeItem(name);
  }),
};
