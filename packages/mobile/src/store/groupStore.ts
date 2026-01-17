import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { GroupState, GroupStoreApi } from '@teilfair/shared';
import { createGroupStoreState, partializeGroupState } from '@teilfair/shared';
import * as api from '../lib/api';

// Simple AsyncStorage wrapper that matches zustand's expected interface
const asyncStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(name, value);
    } catch {
      // Ignore storage errors
    }
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(name);
    } catch {
      // Ignore storage errors
    }
  },
};

// Create API adapter that matches the GroupStoreApi interface
const storeApi: GroupStoreApi = {
  createGroup: api.createGroup,
  getGroup: api.getGroup,
  getTokenPermission: api.getTokenPermission,
  updateGroup: api.updateGroup,
  getMembers: api.getMembers,
  addMember: api.addMember,
  updateMember: api.updateMember,
  deleteMember: api.deleteMember,
  getExpenses: api.getExpenses,
  createExpense: api.createExpense,
  updateExpense: api.updateExpense,
  deleteExpense: api.deleteExpense,
};

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => createGroupStoreState(storeApi, set, get),
    {
      name: 'teilfair-storage',
      storage: createJSONStorage(() => asyncStorageAdapter),
      partialize: partializeGroupState,
    }
  )
);
