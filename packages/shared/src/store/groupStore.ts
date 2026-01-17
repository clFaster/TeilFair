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
  getMembers(groupId: string, token: string): Promise<Member[]>;
  addMember(groupId: string, token: string, name: string): Promise<Member>;
  updateMember(memberId: string, token: string, name: string): Promise<Member>;
  deleteMember(memberId: string, token: string): Promise<void>;
  getExpenses(groupId: string, token: string): Promise<Expense[]>;
  createExpense(groupId: string, token: string, input: CreateExpenseInput): Promise<Expense>;
  updateExpense(expenseId: string, token: string, input: CreateExpenseInput): Promise<Expense>;
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
      set({ loading: true, error: null });
      
      try {
        // Get permission level first
        const permission = await api.getTokenPermission(groupId, token);
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
        
        if (!group) {
          set({ loading: false, error: 'Group not found' });
          return false;
        }
        
        // Calculate balances client-side
        const { memberBalances, settlements } = calculateGroupBalances(expenses);
        
        // Add to recent groups
        const recentGroups = get().recentGroups.filter(g => g.id !== groupId);
        recentGroups.unshift({
          id: groupId,
          name: group.name,
          token,
          permission,
          lastAccessed: Date.now(),
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
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to load group' 
        });
        return false;
      }
    },

    createGroup: async (name: string, currency: string = 'EUR') => {
      set({ loading: true, error: null });
      
      try {
        const group = await api.createGroup(name, currency);
        
        // Add to recent groups with write permission
        const recentGroups = get().recentGroups;
        recentGroups.unshift({
          id: group.id,
          name: group.name,
          token: group.writeToken,
          permission: 'write',
          lastAccessed: Date.now(),
        });
        
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
        set({ 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to create group' 
        });
        throw error;
      }
    },

    updateGroup: async (updates) => {
      const { group, token } = get();
      if (!group || !token) throw new Error('No group loaded');
      
      const updated = await api.updateGroup(group.id, token, updates);
      set({ group: updated });
      
      // Update recent groups
      const recentGroups = get().recentGroups.map(g => 
        g.id === group.id ? { ...g, name: updated.name } : g
      );
      set({ recentGroups });
    },

    addMember: async (name: string) => {
      const { group, token } = get();
      if (!group || !token) throw new Error('No group loaded');
      
      const member = await api.addMember(group.id, token, name);
      set({ members: [...get().members, member] });
      return member;
    },

    updateMember: async (memberId: string, name: string) => {
      const { token, members } = get();
      if (!token) throw new Error('No group loaded');
      
      const updated = await api.updateMember(memberId, token, name);
      set({
        members: members.map(m => m.id === memberId ? updated : m),
      });
    },

    deleteMember: async (memberId: string) => {
      const { token, members } = get();
      if (!token) throw new Error('No group loaded');
      
      await api.deleteMember(memberId, token);
      set({
        members: members.filter(m => m.id !== memberId),
      });
    },

    addExpense: async (input) => {
      const { group, token, expenses } = get();
      if (!group || !token) throw new Error('No group loaded');
      
      const expense = await api.createExpense(group.id, token, input);
      const newExpenses = [expense, ...expenses];
      const { memberBalances, settlements } = calculateGroupBalances(newExpenses);
      
      set({
        expenses: newExpenses,
        memberBalances,
        settlements,
      });
      
      return expense;
    },

    updateExpense: async (expenseId, input) => {
      const { token, expenses } = get();
      if (!token) throw new Error('No group loaded');
      
      const updated = await api.updateExpense(expenseId, token, input);
      const newExpenses = expenses.map(e => e.id === expenseId ? updated : e);
      const { memberBalances, settlements } = calculateGroupBalances(newExpenses);
      
      set({
        expenses: newExpenses,
        memberBalances,
        settlements,
      });
    },

    deleteExpense: async (expenseId) => {
      const { token, expenses } = get();
      if (!token) throw new Error('No group loaded');
      
      await api.deleteExpense(expenseId, token);
      const newExpenses = expenses.filter(e => e.id !== expenseId);
      const { memberBalances, settlements } = calculateGroupBalances(newExpenses);
      
      set({
        expenses: newExpenses,
        memberBalances,
        settlements,
      });
    },

    clearGroup: () => {
      set({
        group: null,
        members: [],
        expenses: [],
        permission: null,
        token: null,
        memberBalances: [],
        settlements: [],
        error: null,
      });
    },

    removeFromRecent: (groupId: string) => {
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
