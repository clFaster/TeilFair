import type {
  Group,
  Member,
  Expense,
  CreateExpenseInput,
  TokenPermission,
  GroupRow,
  MemberRow,
  ExpenseRow,
  ExpensePayerRow,
  ExpenseSplitRow,
} from '@teilfair/shared';
import {
  generateToken,
  generateUUID,
  groupFromRow,
  memberFromRow,
  expenseFromRow,
} from '@teilfair/shared';
import { supabase, createGroupClient } from './supabase';

/**
 * Create a new group
 */
export async function createGroup(name: string, currency: string = 'EUR'): Promise<Group> {
  const readToken = generateToken();
  const writeToken = generateToken();

  const { data, error } = await supabase
    .from('groups')
    .insert({
      name,
      currency,
      read_token: readToken,
      write_token: writeToken,
    })
    .select()
    .single();

  if (error) throw error;
  return groupFromRow(data as GroupRow);
}

/**
 * Get a group by ID with token
 */
export async function getGroup(groupId: string, token: string): Promise<Group | null> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return groupFromRow(data as GroupRow);
}

/**
 * Determine the permission level of a token for a group
 */
export async function getTokenPermission(
  groupId: string,
  token: string
): Promise<TokenPermission | null> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .from('groups')
    .select('read_token, write_token')
    .eq('id', groupId)
    .single();

  if (error || !data) return null;
  
  if (token === data.write_token) return 'write';
  if (token === data.read_token) return 'read';
  return null;
}

/**
 * Update group details
 */
export async function updateGroup(
  groupId: string,
  token: string,
  updates: { name?: string; currency?: string }
): Promise<Group> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return groupFromRow(data as GroupRow);
}

/**
 * Get all members of a group
 */
export async function getMembers(groupId: string, token: string): Promise<Member[]> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .from('members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at');

  if (error) throw error;
  return (data as MemberRow[]).map(memberFromRow);
}

/**
 * Add a member to a group
 */
export async function addMember(
  groupId: string,
  token: string,
  name: string
): Promise<Member> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .from('members')
    .insert({ group_id: groupId, name })
    .select()
    .single();

  if (error) throw error;
  return memberFromRow(data as MemberRow);
}

/**
 * Update a member
 */
export async function updateMember(
  memberId: string,
  token: string,
  name: string
): Promise<Member> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .from('members')
    .update({ name })
    .eq('id', memberId)
    .select()
    .single();

  if (error) throw error;
  return memberFromRow(data as MemberRow);
}

/**
 * Delete a member
 */
export async function deleteMember(memberId: string, token: string): Promise<void> {
  const client = createGroupClient(token);
  
  const { error } = await client
    .from('members')
    .delete()
    .eq('id', memberId);

  if (error) throw error;
}

/**
 * Get all expenses for a group
 */
export async function getExpenses(groupId: string, token: string): Promise<Expense[]> {
  const client = createGroupClient(token);
  
  // Get expenses
  const { data: expenses, error: expensesError } = await client
    .from('expenses')
    .select('*')
    .eq('group_id', groupId)
    .order('expense_date', { ascending: false });

  if (expensesError) throw expensesError;
  if (!expenses.length) return [];

  const expenseIds = expenses.map((e) => e.id);

  // Get payers and splits in parallel
  const [payersResult, splitsResult] = await Promise.all([
    client.from('expense_payers').select('*').in('expense_id', expenseIds),
    client.from('expense_splits').select('*').in('expense_id', expenseIds),
  ]);

  if (payersResult.error) throw payersResult.error;
  if (splitsResult.error) throw splitsResult.error;

  const payersByExpense = new Map<string, ExpensePayerRow[]>();
  const splitsByExpense = new Map<string, ExpenseSplitRow[]>();

  for (const payer of payersResult.data as ExpensePayerRow[]) {
    const list = payersByExpense.get(payer.expense_id) || [];
    list.push(payer);
    payersByExpense.set(payer.expense_id, list);
  }

  for (const split of splitsResult.data as ExpenseSplitRow[]) {
    const list = splitsByExpense.get(split.expense_id) || [];
    list.push(split);
    splitsByExpense.set(split.expense_id, list);
  }

  return (expenses as ExpenseRow[]).map((e) =>
    expenseFromRow(
      e,
      payersByExpense.get(e.id) || [],
      splitsByExpense.get(e.id) || []
    )
  );
}

/**
 * Create a new expense
 */
export async function createExpense(
  groupId: string,
  token: string,
  input: CreateExpenseInput
): Promise<Expense> {
  const client = createGroupClient(token);
  const expenseId = generateUUID();

  // Insert expense
  const { data: expense, error: expenseError } = await client
    .from('expenses')
    .insert({
      id: expenseId,
      group_id: groupId,
      description: input.description,
      total_amount: input.totalAmount,
      expense_date: input.date.toISOString(),
    })
    .select()
    .single();

  if (expenseError) throw expenseError;

  // Insert payers
  const payersToInsert = input.payers.map((p) => ({
    expense_id: expenseId,
    member_id: p.memberId,
    amount: p.amount,
  }));

  const { data: payers, error: payersError } = await client
    .from('expense_payers')
    .insert(payersToInsert)
    .select();

  if (payersError) throw payersError;

  // Insert splits
  const splitsToInsert = input.splits.map((s) => ({
    expense_id: expenseId,
    member_id: s.memberId,
    share: s.share,
    share_type: s.shareType,
  }));

  const { data: splits, error: splitsError } = await client
    .from('expense_splits')
    .insert(splitsToInsert)
    .select();

  if (splitsError) throw splitsError;

  return expenseFromRow(
    expense as ExpenseRow,
    payers as ExpensePayerRow[],
    splits as ExpenseSplitRow[]
  );
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string, token: string): Promise<void> {
  const client = createGroupClient(token);
  
  const { error } = await client
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) throw error;
}

/**
 * Update an expense
 */
export async function updateExpense(
  expenseId: string,
  token: string,
  input: CreateExpenseInput
): Promise<Expense> {
  const client = createGroupClient(token);

  // Update expense details
  const { data: expense, error: expenseError } = await client
    .from('expenses')
    .update({
      description: input.description,
      total_amount: input.totalAmount,
      expense_date: input.date.toISOString(),
    })
    .eq('id', expenseId)
    .select()
    .single();

  if (expenseError) throw expenseError;

  // Delete existing payers and splits
  await Promise.all([
    client.from('expense_payers').delete().eq('expense_id', expenseId),
    client.from('expense_splits').delete().eq('expense_id', expenseId),
  ]);

  // Insert new payers
  const payersToInsert = input.payers.map((p) => ({
    expense_id: expenseId,
    member_id: p.memberId,
    amount: p.amount,
  }));

  const { data: payers, error: payersError } = await client
    .from('expense_payers')
    .insert(payersToInsert)
    .select();

  if (payersError) throw payersError;

  // Insert new splits
  const splitsToInsert = input.splits.map((s) => ({
    expense_id: expenseId,
    member_id: s.memberId,
    share: s.share,
    share_type: s.shareType,
  }));

  const { data: splits, error: splitsError } = await client
    .from('expense_splits')
    .insert(splitsToInsert)
    .select();

  if (splitsError) throw splitsError;

  return expenseFromRow(
    expense as ExpenseRow,
    payers as ExpensePayerRow[],
    splits as ExpenseSplitRow[]
  );
}
