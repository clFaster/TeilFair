import { describe, expect, it } from 'vitest';
import { expenseFromRow, groupFromRow, memberFromRow } from '../src/api/converters';
import type { ExpensePayerRow, ExpenseRow, ExpenseSplitRow } from '../src/api/types';

describe('database to domain conversion', () => {
  const created = '2026-10-01T10:00:00.000Z';

  it('preserves group identity, currency, capability tokens, and timestamp', () => {
    expect(groupFromRow({ id: 'g', name: 'Trip', currency: 'JPY', read_token: 'read', write_token: 'write', created_at: created }))
      .toEqual({ id: 'g', name: 'Trip', currency: 'JPY', readToken: 'read', writeToken: 'write', createdAt: new Date(created) });
  });

  it('preserves the member association and Unicode names', () => {
    expect(memberFromRow({ id: 'm', group_id: 'g', name: 'Éva', created_at: created }))
      .toEqual({ id: 'm', groupId: 'g', name: 'Éva', createdAt: new Date(created) });
  });

  it('normalizes monetary values and split precision and keeps expense time separate from creation time', () => {
    // PostgREST numeric values can be delivered as strings despite the row types.
    const row = { id: 'e', group_id: 'g', description: 'Dinner', total_amount: '12.50',
      expense_date: '2026-10-03T21:30:00+02:00', created_at: created } as unknown as ExpenseRow;
    const payers = [{ id: 'p', expense_id: 'e', member_id: 'alice', amount: '12.50' }] as unknown as ExpensePayerRow[];
    const splits = [
      { id: 's1', expense_id: 'e', member_id: 'alice', share: '1.2500', share_type: 'ratio' },
      { id: 's2', expense_id: 'e', member_id: 'bob', share: '20.0000', share_type: 'percentage' },
      { id: 's3', expense_id: 'e', member_id: 'carol', share: '2.50', share_type: 'fixed' },
    ] as unknown as ExpenseSplitRow[];
    const before = structuredClone({ row, payers, splits });
    expect(expenseFromRow(row, payers, splits)).toEqual({
      id: 'e', groupId: 'g', description: 'Dinner', totalAmount: 12.5,
      date: new Date('2026-10-03T19:30:00Z'), createdAt: new Date(created),
      payers: [{ id: 'p', expenseId: 'e', memberId: 'alice', amount: 12.5 }],
      splits: [
        { id: 's1', expenseId: 'e', memberId: 'alice', share: 1.25, shareType: 'ratio' },
        { id: 's2', expenseId: 'e', memberId: 'bob', share: 20, shareType: 'percentage' },
        { id: 's3', expenseId: 'e', memberId: 'carol', share: 2.5, shareType: 'fixed' },
      ],
    });
    expect({ row, payers, splits }).toEqual(before);
  });

  it('handles an expense with no associated payer or split rows', () => {
    expect(expenseFromRow({ id: 'e', group_id: 'g', description: 'Empty', total_amount: 0,
      expense_date: created, created_at: created }, [], [])).toMatchObject({ totalAmount: 0, payers: [], splits: [] });
  });
});
