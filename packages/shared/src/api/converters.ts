import type { Group, Member, Expense } from '../types';
import type {
  GroupRow,
  MemberRow,
  ExpenseRow,
  ExpensePayerRow,
  ExpenseSplitRow,
} from './types';

/**
 * Convert a database group row to domain Group object
 */
export function groupFromRow(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency,
    readToken: row.read_token,
    writeToken: row.write_token,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert a database member row to domain Member object
 */
export function memberFromRow(row: MemberRow): Member {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert database expense row with payers and splits to domain Expense object
 */
export function expenseFromRow(
  row: ExpenseRow,
  payers: ExpensePayerRow[],
  splits: ExpenseSplitRow[]
): Expense {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    totalAmount: Number(row.total_amount),
    date: new Date(row.expense_date),
    createdAt: new Date(row.created_at),
    payers: payers.map((p) => ({
      id: p.id,
      expenseId: p.expense_id,
      memberId: p.member_id,
      amount: Number(p.amount),
    })),
    splits: splits.map((s) => ({
      id: s.id,
      expenseId: s.expense_id,
      memberId: s.member_id,
      share: Number(s.share),
      shareType: s.share_type,
    })),
  };
}
