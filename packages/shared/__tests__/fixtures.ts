import type { CreateExpenseInput, Expense, Group, Member } from '../src/types';

export const group: Group = {
  id: 'group-1', name: 'Vienna trip', currency: 'EUR',
  readToken: 'read-token', writeToken: 'write-token',
  createdAt: new Date('2026-10-01T10:00:00Z'),
};

export const members: Member[] = ['alice', 'bob', 'carol'].map(id => ({
  id, groupId: group.id, name: id, createdAt: group.createdAt,
}));

export function expense(
  id = 'dinner',
  totalAmount = 90,
  payers: Array<[string, number]> = [['alice', totalAmount]],
  splits: Array<[string, number, 'ratio' | 'fixed' | 'percentage']> = [
    ['alice', 1, 'ratio'], ['bob', 1, 'ratio'], ['carol', 1, 'ratio'],
  ],
): Expense {
  return {
    id, groupId: group.id, description: id, totalAmount,
    date: new Date('2026-10-03T19:30:00Z'), createdAt: group.createdAt,
    payers: payers.map(([memberId, amount], index) => ({ id: `${id}-p${index}`, expenseId: id, memberId, amount })),
    splits: splits.map(([memberId, share, shareType], index) => ({ id: `${id}-s${index}`, expenseId: id, memberId, share, shareType })),
  };
}

export function expenseInput(value: Expense): CreateExpenseInput {
  return {
    description: value.description, totalAmount: value.totalAmount,
    date: value.date, payers: value.payers, splits: value.splits,
  };
}
