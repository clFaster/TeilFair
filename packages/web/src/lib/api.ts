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
import { createGroupClient } from './supabase';

/**
 * Create a new group
 */
export async function createGroup(name: string, currency: string = 'EUR'): Promise<Group> {
  const readToken = generateToken();
  const writeToken = generateToken();

  const { data, error } = await createGroupClient(writeToken)
    .from('groups')
    .insert({
      name,
      currency,
      read_token: readToken,
      write_token: writeToken,
    })
    .select('id, name, currency, created_at')
    .single();

  if (error) throw error;
  return groupFromRow({ ...data, read_token: readToken, write_token: writeToken } as GroupRow);
}

/**
 * Get a group by ID with token
 */
export async function getGroup(groupId: string, token: string): Promise<Group | null> {
  const client = createGroupClient(token);
  
  const { data, error } = await client
    .rpc('get_group', { requested_group_id: groupId })
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
  const group = await getGroup(groupId, token);
  if (!group) return null;
  if (token === group.writeToken) return 'write';
  if (token === group.readToken) return 'read';
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
  
  const { error } = await client
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select('id, name, currency, created_at')
    .single();

  if (error) throw error;
  const group = await getGroup(groupId, token);
  if (!group) throw new Error('Group not found or access denied');
  return group;
}

/**
 * Delete all expenses and the group itself
 */
export async function deleteGroup(groupId: string, token: string): Promise<void> {
  const client = createGroupClient(token);

  const { error: expensesError } = await client
    .from('expenses')
    .delete()
    .eq('group_id', groupId);

  if (expensesError) throw expensesError;

  const { data, error } = await client
    .from('groups')
    .delete()
    .eq('id', groupId)
    .select('id');

  if (error) throw error;
  if (!data?.length) throw new Error('Group not found or access denied');
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

interface ExpenseWriteResult {
  expense: ExpenseRow;
  payers: ExpensePayerRow[];
  splits: ExpenseSplitRow[];
}

async function saveExpense(
  groupId: string,
  token: string,
  expenseId: string,
  input: CreateExpenseInput,
  expectedRevision: number
): Promise<Expense> {
  const { data, error } = await createGroupClient(token).rpc('save_expense', {
    requested_group_id: groupId,
    requested_expense_id: expenseId,
    payload: {
      description: input.description,
      total_amount: input.totalAmount,
      expense_date: input.date.toISOString(),
      payers: input.payers.map(({ memberId, amount }) => ({ member_id: memberId, amount })),
      splits: input.splits.map(({ memberId, share, shareType }) => ({
        member_id: memberId,
        share,
        share_type: shareType,
      })),
    },
    expected_revision: expectedRevision,
  });

  if (error) throw error;
  if (!data) throw new Error('Expense save returned no data');
  const result = data as unknown as ExpenseWriteResult;
  return expenseFromRow(result.expense, result.payers, result.splits);
}

/**
 * Create a new expense
 */
export async function createExpense(
  groupId: string,
  token: string,
  input: CreateExpenseInput
): Promise<Expense> {
  return saveExpense(groupId, token, generateUUID(), input, 0);
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
  groupId: string,
  expenseId: string,
  token: string,
  input: CreateExpenseInput,
  expectedRevision: number
): Promise<Expense> {
  return saveExpense(groupId, token, expenseId, input, expectedRevision);
}
