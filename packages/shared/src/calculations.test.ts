import { describe, it, expect } from 'vitest';
import {
  calculateSplitAmounts,
  calculateMemberBalances,
  calculateSettlements,
  calculateGroupBalances,
  validateExpensePayers,
  validateExpenseSplits,
} from './calculations';
import type { Expense, ExpenseSplit } from './types';

describe('calculateSplitAmounts', () => {
  it('should split equally by ratio', () => {
    const splits: ExpenseSplit[] = [
      { id: '1', expenseId: 'e1', memberId: 'a', share: 1, shareType: 'ratio' },
      { id: '2', expenseId: 'e1', memberId: 'b', share: 1, shareType: 'ratio' },
      { id: '3', expenseId: 'e1', memberId: 'c', share: 1, shareType: 'ratio' },
    ];

    const amounts = calculateSplitAmounts(90, splits);

    expect(amounts.get('a')).toBe(30);
    expect(amounts.get('b')).toBe(30);
    expect(amounts.get('c')).toBe(30);
  });

  it('should handle weighted ratios', () => {
    const splits: ExpenseSplit[] = [
      { id: '1', expenseId: 'e1', memberId: 'a', share: 2, shareType: 'ratio' },
      { id: '2', expenseId: 'e1', memberId: 'b', share: 1, shareType: 'ratio' },
    ];

    const amounts = calculateSplitAmounts(90, splits);

    expect(amounts.get('a')).toBe(60);
    expect(amounts.get('b')).toBe(30);
  });

  it('should handle fixed amounts', () => {
    const splits: ExpenseSplit[] = [
      { id: '1', expenseId: 'e1', memberId: 'a', share: 50, shareType: 'fixed' },
      { id: '2', expenseId: 'e1', memberId: 'b', share: 40, shareType: 'fixed' },
    ];

    const amounts = calculateSplitAmounts(90, splits);

    expect(amounts.get('a')).toBe(50);
    expect(amounts.get('b')).toBe(40);
  });

  it('should handle percentage splits', () => {
    const splits: ExpenseSplit[] = [
      { id: '1', expenseId: 'e1', memberId: 'a', share: 60, shareType: 'percentage' },
      { id: '2', expenseId: 'e1', memberId: 'b', share: 40, shareType: 'percentage' },
    ];

    const amounts = calculateSplitAmounts(100, splits);

    expect(amounts.get('a')).toBe(60);
    expect(amounts.get('b')).toBe(40);
  });

  it('should handle mixed split types', () => {
    const splits: ExpenseSplit[] = [
      { id: '1', expenseId: 'e1', memberId: 'a', share: 20, shareType: 'fixed' },
      { id: '2', expenseId: 'e1', memberId: 'b', share: 1, shareType: 'ratio' },
      { id: '3', expenseId: 'e1', memberId: 'c', share: 1, shareType: 'ratio' },
    ];

    const amounts = calculateSplitAmounts(100, splits);

    expect(amounts.get('a')).toBe(20);
    expect(amounts.get('b')).toBe(40);
    expect(amounts.get('c')).toBe(40);
  });
});

describe('calculateMemberBalances', () => {
  it('should calculate correct balances for simple expense', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        totalAmount: 90,
        date: new Date(),
        createdAt: new Date(),
        payers: [{ id: 'p1', expenseId: 'e1', memberId: 'alice', amount: 90 }],
        splits: [
          { id: 's1', expenseId: 'e1', memberId: 'alice', share: 1, shareType: 'ratio' },
          { id: 's2', expenseId: 'e1', memberId: 'bob', share: 1, shareType: 'ratio' },
          { id: 's3', expenseId: 'e1', memberId: 'carol', share: 1, shareType: 'ratio' },
        ],
      },
    ];

    const balances = calculateMemberBalances(expenses);

    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;
    const carol = balances.find(b => b.memberId === 'carol')!;

    expect(alice.totalPaid).toBe(90);
    expect(alice.totalOwed).toBe(30);
    expect(alice.netBalance).toBe(60); // Is owed 60

    expect(bob.totalPaid).toBe(0);
    expect(bob.totalOwed).toBe(30);
    expect(bob.netBalance).toBe(-30); // Owes 30

    expect(carol.totalPaid).toBe(0);
    expect(carol.totalOwed).toBe(30);
    expect(carol.netBalance).toBe(-30); // Owes 30
  });

  it('should handle multiple payers', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        totalAmount: 100,
        date: new Date(),
        createdAt: new Date(),
        payers: [
          { id: 'p1', expenseId: 'e1', memberId: 'alice', amount: 60 },
          { id: 'p2', expenseId: 'e1', memberId: 'bob', amount: 40 },
        ],
        splits: [
          { id: 's1', expenseId: 'e1', memberId: 'alice', share: 1, shareType: 'ratio' },
          { id: 's2', expenseId: 'e1', memberId: 'bob', share: 1, shareType: 'ratio' },
        ],
      },
    ];

    const balances = calculateMemberBalances(expenses);

    const alice = balances.find(b => b.memberId === 'alice')!;
    const bob = balances.find(b => b.memberId === 'bob')!;

    expect(alice.netBalance).toBe(10); // Paid 60, owes 50, net +10
    expect(bob.netBalance).toBe(-10); // Paid 40, owes 50, net -10
  });
});

describe('calculateSettlements', () => {
  it('should calculate minimal settlements', () => {
    const balances = [
      { memberId: 'alice', totalPaid: 90, totalOwed: 30, netBalance: 60 },
      { memberId: 'bob', totalPaid: 0, totalOwed: 30, netBalance: -30 },
      { memberId: 'carol', totalPaid: 0, totalOwed: 30, netBalance: -30 },
    ];

    const settlements = calculateSettlements(balances);

    expect(settlements).toHaveLength(2);
    
    const total = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(total).toBe(60);

    // All settlements should be to alice
    expect(settlements.every(s => s.toMemberId === 'alice')).toBe(true);
  });

  it('should handle complex multi-way settlements', () => {
    const balances = [
      { memberId: 'a', totalPaid: 100, totalOwed: 25, netBalance: 75 },
      { memberId: 'b', totalPaid: 50, totalOwed: 25, netBalance: 25 },
      { memberId: 'c', totalPaid: 0, totalOwed: 50, netBalance: -50 },
      { memberId: 'd', totalPaid: 0, totalOwed: 50, netBalance: -50 },
    ];

    const settlements = calculateSettlements(balances);

    // Verify total money flow
    const totalFromDebtors = balances
      .filter(b => b.netBalance < 0)
      .reduce((sum, b) => sum + Math.abs(b.netBalance), 0);
    
    const totalToCreditors = balances
      .filter(b => b.netBalance > 0)
      .reduce((sum, b) => sum + b.netBalance, 0);

    expect(totalFromDebtors).toBe(totalToCreditors);

    const settlementTotal = settlements.reduce((sum, s) => sum + s.amount, 0);
    expect(settlementTotal).toBe(100);
  });
});

describe('calculateGroupBalances', () => {
  it('should calculate complete group balances', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        groupId: 'g1',
        description: 'Dinner',
        totalAmount: 120,
        date: new Date(),
        createdAt: new Date(),
        payers: [{ id: 'p1', expenseId: 'e1', memberId: 'alice', amount: 120 }],
        splits: [
          { id: 's1', expenseId: 'e1', memberId: 'alice', share: 1, shareType: 'ratio' },
          { id: 's2', expenseId: 'e1', memberId: 'bob', share: 1, shareType: 'ratio' },
          { id: 's3', expenseId: 'e1', memberId: 'carol', share: 1, shareType: 'ratio' },
        ],
      },
      {
        id: 'e2',
        groupId: 'g1',
        description: 'Taxi',
        totalAmount: 30,
        date: new Date(),
        createdAt: new Date(),
        payers: [{ id: 'p2', expenseId: 'e2', memberId: 'bob', amount: 30 }],
        splits: [
          { id: 's4', expenseId: 'e2', memberId: 'alice', share: 1, shareType: 'ratio' },
          { id: 's5', expenseId: 'e2', memberId: 'bob', share: 1, shareType: 'ratio' },
          { id: 's6', expenseId: 'e2', memberId: 'carol', share: 1, shareType: 'ratio' },
        ],
      },
    ];

    const { memberBalances, settlements } = calculateGroupBalances(expenses);

    const alice = memberBalances.find(b => b.memberId === 'alice')!;
    const bob = memberBalances.find(b => b.memberId === 'bob')!;
    const carol = memberBalances.find(b => b.memberId === 'carol')!;

    // Alice: paid 120, owes 40+10=50, net +70
    expect(alice.netBalance).toBe(70);

    // Bob: paid 30, owes 40+10=50, net -20
    expect(bob.netBalance).toBe(-20);

    // Carol: paid 0, owes 40+10=50, net -50
    expect(carol.netBalance).toBe(-50);

    // Settlements should balance out
    expect(settlements.length).toBeGreaterThan(0);
  });
});

describe('validateExpensePayers', () => {
  it('should validate correct payer amounts', () => {
    expect(validateExpensePayers(100, [{ amount: 100 }])).toBe(true);
    expect(validateExpensePayers(100, [{ amount: 60 }, { amount: 40 }])).toBe(true);
  });

  it('should reject incorrect payer amounts', () => {
    expect(validateExpensePayers(100, [{ amount: 90 }])).toBe(false);
    expect(validateExpensePayers(100, [{ amount: 60 }, { amount: 60 }])).toBe(false);
  });
});

describe('validateExpenseSplits', () => {
  it('should validate correct splits', () => {
    const result = validateExpenseSplits(
      [
        { share: 1, shareType: 'ratio' },
        { share: 1, shareType: 'ratio' },
      ],
      100
    );
    expect(result.valid).toBe(true);
  });

  it('should reject percentage splits exceeding 100%', () => {
    const result = validateExpenseSplits(
      [
        { share: 60, shareType: 'percentage' },
        { share: 50, shareType: 'percentage' },
      ],
      100
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('100%');
  });

  it('should reject fixed splits exceeding total', () => {
    const result = validateExpenseSplits(
      [
        { share: 60, shareType: 'fixed' },
        { share: 50, shareType: 'fixed' },
      ],
      100
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('total amount');
  });
});
