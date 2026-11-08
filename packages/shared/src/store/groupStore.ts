import type {
  Group,
  Member,
  Expense,
  TokenPermission,
  MemberBalance,
  Settlement,
  CreateExpenseInput,
} from '../types';
import { calculateGroupBalances } from '../calculations';

/**
 * Interface for the API layer - must be implemented by each platform
 */
export interface GroupStoreApi {
  createGroup(name: string, currency: string): Promise<Group>;
  getGroup(groupId: string, token: string): Promise<Group | null>;
  getTokenPermission(groupId: string, token: string): Promise<TokenPermission | null>;
  updateGroup(groupId: string, token: string, updates: { name?: string; currency?: string }): Promise<Group>;
  deleteGroup(groupId: string, token: string): Promise<void>;
  getMembers(groupId: string, token: string): Promise<Member[]>;
  addMember(groupId: string, token: string, name: string): Promise<Member>;
  updateMember(memberId: string, token: string, name: string): Promise<Member>;
  deleteMember(memberId: string, token: string): Promise<void>;
  getExpenses(groupId: string, token: string): Promise<Expense[]>;
  createExpense(groupId: string, token: string, input: CreateExpenseInput): Promise<Expense>;
  updateExpense(groupId: string, expenseId: string, token: string, input: CreateExpenseInput, expectedRevision: number): Promise<Expense>;
  deleteExpense(expenseId: string, token: string): Promise<void>;
}

/**
 * Recent group entry stored locally
 */
export interface RecentGroup {
  id: string;
  name: string;
  token: string;
  permission: TokenPermission;
  lastAccessed: number;
  memberCount?: number;
  expenseCount?: number;
  totalExpenses?: number;
  currency?: string;
}

/**
 * Group store state
 */
export interface GroupState {
  // Current group data
  group: Group | null;
  members: Member[];
  expenses: Expense[];
  permission: TokenPermission | null;
  token: string | null;
  
  // Computed values (calculated client-side)
  memberBalances: MemberBalance[];
  settlements: Settlement[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Recently accessed groups (stored locally)
  recentGroups: RecentGroup[];
  
  // Actions
  loadGroup: (groupId: string, token: string) => Promise<boolean>;
  createGroup: (name: string, currency?: string) => Promise<Group>;
  updateGroup: (updates: { name?: string; currency?: string }) => Promise<void>;
  deleteGroup: () => Promise<void>;
  
  addMember: (name: string) => Promise<Member>;
  updateMember: (memberId: string, name: string) => Promise<void>;
  deleteMember: (memberId: string) => Promise<void>;
  
  addExpense: (input: CreateExpenseInput) => Promise<Expense>;
  updateExpense: (expenseId: string, input: CreateExpenseInput) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  
  clearGroup: () => void;
  removeFromRecent: (groupId: string) => void;
}

/**
 * Create the store state creator function
 * This is the core logic shared between web and mobile
 */
export function createGroupStoreState(
  api: GroupStoreApi,
  set: (partial: Partial<GroupState> | ((state: GroupState) => Partial<GroupState>)) => void,
  get: () => GroupState
): GroupState {
  let generation = 0;
  let requestedGroupId: string | null = null;
  const emptyActiveState = () => ({
    group: null, members: [], expenses: [], permission: null, token: null,
    memberBalances: [], settlements: [], loading: false, error: null,
  });
  const requireWriter = () => {
    const state = get();
    if (!state.group || !state.token) throw new Error('No group loaded');
    if (state.loading || state.permission !== 'write') throw new Error('Write access required');
    const currentGeneration = generation;
    return { ...state, group: state.group, token: state.token,
      isCurrent: () => currentGeneration === generation };
  };
  const updateRecentGroupStats = (groupId: string, overrides: {
    members?: Member[];
    expenses?: Expense[];
    name?: string;
    currency?: string;
  }) => {
    const state = get();
    const members = overrides.members ?? state.members;
    const expenses = overrides.expenses ?? state.expenses;
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);

    const recentGroups = state.recentGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            name: overrides.name ?? group.name,
            currency: overrides.currency ?? group.currency,
            memberCount: members.length,
            expenseCount: expenses.length,
            totalExpenses,
          }
        : group
    );

    set({ recentGroups });
  };

  return {
    group: null,
    members: [],
    expenses: [],
    permission: null,
    token: null,
    memberBalances: [],
    settlements: [],
    loading: false,
    error: null,
    recentGroups: [],

    loadGroup: async (groupId: string, token: string) => {
      const currentGeneration = ++generation;
      requestedGroupId = groupId;
      set({ ...emptyActiveState(), loading: true });
      
      try {
        // Get permission level first
        const permission = await api.getTokenPermission(groupId, token);
        if (currentGeneration !== generation) return false;
        if (!permission) {
          set({ loading: false, error: 'Invalid token or group not found' });
          return false;
        }
        
        // Load group data
        const [group, members, expenses] = await Promise.all([
          api.getGroup(groupId, token),
          api.getMembers(groupId, token),
          api.getExpenses(groupId, token),
        ]);
        if (currentGeneration !== generation) return false;
        
        if (!group) {
          set({ loading: false, error: 'Group not found' });
          return false;
        }
        
        // Calculate balances client-side
        const { memberBalances, settlements } = calculateGroupBalances(expenses);
        
        // Add to recent groups
        const recentGroups = get().recentGroups.filter(g => g.id !== groupId);
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.totalAmount, 0);
        recentGroups.unshift({
          id: groupId,
          name: group.name,
          token,
          permission,
          lastAccessed: Date.now(),
          memberCount: members.length,
          expenseCount: expenses.length,
          totalExpenses,
          currency: group.currency,
        });
        // Keep only last 10
        if (recentGroups.length > 10) {
          recentGroups.pop();
        }
        
        set({
          group,
          members,
          expenses,
          permission,
          token,
          memberBalances,
          settlements,
          loading: false,
          recentGroups,
        });
        
        return true;
      } catch (error) {
        if (currentGeneration !== generation) return false;
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to load group' 
        });
        return false;
      }
    },

    createGroup: async (name: string, currency: string = 'EUR') => {
      const currentGeneration = ++generation;
      requestedGroupId = null;
      set({ ...emptyActiveState(), loading: true });
      
      try {
        const group = await api.createGroup(name, currency);
        
        // Add to recent groups with write permission
        const recentGroups = get().recentGroups.filter(recent => recent.id !== group.id);
        recentGroups.unshift({
          id: group.id,
          name: group.name,
          token: group.writeToken,
          permission: 'write',
          lastAccessed: Date.now(),
          memberCount: 0,
          expenseCount: 0,
          totalExpenses: 0,
          currency: group.currency,
        });
        // Even if navigation changed, retain the newly created capability.
        if (currentGeneration !== generation) {
          set({ recentGroups });
          return group;
        }
        requestedGroupId = group.id;
        
        set({
          group,
          members: [],
          expenses: [],
          permission: 'write',
          token: group.writeToken,
          memberBalances: [],
          settlements: [],
          loading: false,
          recentGroups,
        });
        
        return group;
      } catch (error) {
        if (currentGeneration !== generation) throw error;
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to create group' 
        });
        throw error;
      }
    },

    updateGroup: async (updates) => {
      const { group, token, isCurrent } = requireWriter();
      
      const updated = await api.updateGroup(group.id, token, updates);
      if (!isCurrent()) return;
      set({ group: updated });
      
      // Update recent groups
      updateRecentGroupStats(group.id, { name: updated.name, currency: updated.currency });
    },

    deleteGroup: async () => {
      const { group, token, isCurrent } = requireWriter();

      await api.deleteGroup(group.id, token);
      if (!isCurrent()) return;
      get().removeFromRecent(group.id);
    },

    addMember: async (name: string) => {
      const { group, token, isCurrent } = requireWriter();
      
      const member = await api.addMember(group.id, token, name);
      if (!isCurrent()) return member;
      const updatedMembers = [...get().members, member];
      set({ members: updatedMembers });
      updateRecentGroupStats(group.id, { members: updatedMembers });
      return member;
    },

    updateMember: async (memberId: string, name: string) => {
      const { token, isCurrent } = requireWriter();
      
      const updated = await api.updateMember(memberId, token, name);
      if (!isCurrent()) return;
      set({
        members: get().members.map(m => m.id === memberId ? updated : m),
      });
    },

    deleteMember: async (memberId: string) => {
      const { token, group, isCurrent } = requireWriter();
      
      await api.deleteMember(memberId, token);
      if (!isCurrent()) return;
      const updatedMembers = get().members.filter(m => m.id !== memberId);
      set({
        members: updatedMembers,
      });
      updateRecentGroupStats(group.id, { members: updatedMembers });
    },

    addExpense: async (input) => {
      const { group, token, isCurrent } = requireWriter();
      
      const expense = await api.createExpense(group.id, token, input);
      if (!isCurrent()) return expense;
      const newExpenses = [expense, ...get().expenses];
      const { memberBalances, settlements } = calculateGroupBalances(newExpenses);
      
      set({
        expenses: newExpenses,
        memberBalances,
        settlements,
      });

      updateRecentGroupStats(group.id, { expenses: newExpenses });
      
      return expense;
    },

    updateExpense: async (expenseId, input) => {
      const { token, group, isCurrent } = requireWriter();
      const currentExpense = get().expenses.find(expense => expense.id === expenseId);
      if (!currentExpense) throw new Error('Expense not found');

      const updated = await api.updateExpense(group.id, expenseId, token, input, currentExpense.revision);
      if (!isCurrent()) return;
      const newExpenses = get().expenses.map(e => e.id === expenseId ? updated : e);
      const { memberBalances, settlements } = calculateGroupBalances(newExpenses);
      
      set({
        expenses: newExpenses,
        memberBalances,
        settlements,
      });

      updateRecentGroupStats(group.id, { expenses: newExpenses });
    },

    deleteExpense: async (expenseId) => {
      const { token, group, isCurrent } = requireWriter();
      
      await api.deleteExpense(expenseId, token);
      if (!isCurrent()) return;
      const newExpenses = get().expenses.filter(e => e.id !== expenseId);
      const { memberBalances, settlements } = calculateGroupBalances(newExpenses);
      
      set({
        expenses: newExpenses,
        memberBalances,
        settlements,
      });

      updateRecentGroupStats(group.id, { expenses: newExpenses });
    },

    clearGroup: () => {
      generation++;
      requestedGroupId = null;
      set(emptyActiveState());
    },

    removeFromRecent: (groupId: string) => {
      if (requestedGroupId === groupId || get().group?.id === groupId) get().clearGroup();
      set({
        recentGroups: get().recentGroups.filter(g => g.id !== groupId),
      });
    },
  };
}

/**
 * Extract only the recentGroups for persistence
 */
export function partializeGroupState(state: GroupState): { recentGroups: RecentGroup[] } {
  return {
    recentGroups: state.recentGroups,
  };
}
