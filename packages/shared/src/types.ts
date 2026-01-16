// Core domain types for TeilFair

export interface Group {
  id: string;
  name: string;
  currency: string;
  readToken: string;
  writeToken: string;
  createdAt: Date;
}

export interface Member {
  id: string;
  groupId: string;
  name: string;
  createdAt: Date;
}

export type ShareType = 'ratio' | 'fixed' | 'percentage';

export interface ExpensePayer {
  id: string;
  expenseId: string;
  memberId: string;
  amount: number; // How much this person paid
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  memberId: string;
  share: number; // The share value (ratio weight, fixed amount, or percentage)
  shareType: ShareType;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  totalAmount: number;
  date: Date;
  createdAt: Date;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
}

// For creating new expenses (without IDs)
export interface CreateExpenseInput {
  description: string;
  totalAmount: number;
  date: Date;
  payers: Array<{
    memberId: string;
    amount: number;
  }>;
  splits: Array<{
    memberId: string;
    share: number;
    shareType: ShareType;
  }>;
}

// Balance between two members
export interface Balance {
  fromMemberId: string;
  toMemberId: string;
  amount: number; // Positive means fromMember owes toMember
}

// Summary of what each member owes or is owed
export interface MemberBalance {
  memberId: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // Positive = is owed money, Negative = owes money
}

// Simplified settlement suggestion
export interface Settlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

// Capability token types
export type TokenPermission = 'read' | 'write';

export interface CapabilityToken {
  groupId: string;
  token: string;
  permission: TokenPermission;
}

// API response types
export interface GroupWithMembers extends Group {
  members: Member[];
}

export interface GroupFull extends GroupWithMembers {
  expenses: Expense[];
}
