import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GroupState, GroupStoreApi } from '@teilfair/shared';
import { createGroupStoreState, partializeGroupState } from '@teilfair/shared';
import * as api from '../lib/api';

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
      partialize: partializeGroupState,
    }
  )
);
