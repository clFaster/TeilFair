// Database row types (snake_case) - match Supabase schema
export interface GroupRow {
  id: string;
  name: string;
  currency: string;
  read_token: string;
  write_token: string;
  created_at: string;
}

export interface MemberRow {
  id: string;
  group_id: string;
  name: string;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  group_id: string;
  description: string;
  total_amount: number;
  expense_date: string;
  created_at: string;
}

export interface ExpensePayerRow {
  id: string;
  expense_id: string;
  member_id: string;
  amount: number;
}

export interface ExpenseSplitRow {
  id: string;
  expense_id: string;
  member_id: string;
  share: number;
  share_type: 'ratio' | 'fixed' | 'percentage';
}
