import { describe, expect, it } from 'vitest';
import {
  calculateGroupBalances, calculateMemberBalances, calculatePairwiseBalances,
  calculateSettlements, calculateSplitAmounts, validateExpensePayers, validateExpenseSplits,
} from '../src/calculations';
import { expense } from './fixtures';

describe('split accounting', () => {
  it('allocates fixed amounts and percentages of the original total before weighted remainders', () => {
    const input = expense('mixed', 200, [['alice', 200]], [
      ['alice', 20, 'fixed'], ['bob', 25, 'percentage'],
      ['carol', 2, 'ratio'], ['dave', 3, 'ratio'],
    ]);
    const before = structuredClone(input.splits);
    expect(calculateSplitAmounts(200, input.splits)).toEqual(new Map([
      ['alice', 20], ['bob', 50], ['carol', 52], ['dave', 78],
    ]));
    expect(input.splits).toEqual(before);
  });

  it('accumulates a member participating in multiple split types', () => {
    const input = expense('mixed', 100, [['alice', 100]], [
      ['alice', 10, 'fixed'], ['alice', 20, 'percentage'],
      ['alice', 1, 'ratio'], ['bob', 1, 'ratio'],
    ]);
    expect(calculateSplitAmounts(100, input.splits)).toEqual(new Map([['alice', 65], ['bob', 35]]));
  });

  it('keeps fractional shares precise until settlement', () => {
    const amounts = calculateSplitAmounts(10, expense().splits);
    expect([...amounts.values()].reduce((sum, amount) => sum + amount, 0)).toBeCloseTo(10, 10);
    for (const amount of amounts.values()) expect(amount).toBeCloseTo(10 / 3, 10);
  });

  it('handles an empty group', () => {
    expect(calculateSplitAmounts(0, [])).toEqual(new Map());
    expect(calculateMemberBalances([])).toEqual([]);
    expect(calculatePairwiseBalances([])).toEqual(new Map());
    expect(calculateGroupBalances([])).toEqual({ memberBalances: [], settlements: [] });
  });
});

describe('pairwise debt accounting', () => {
  it('uses consistent key ordering and cancels debts in opposite directions', () => {
    const first = expense('first', 90);
    expect(calculatePairwiseBalances([first])).toEqual(new Map([['alice:bob', -30], ['alice:carol', -30]]));
    const second = expense('second', 60, [['bob', 60]], [['alice', 1, 'ratio'], ['bob', 1, 'ratio']]);
    expect(calculatePairwiseBalances([first, second])).toEqual(new Map([['alice:bob', 0], ['alice:carol', -30]]));
  });

  it('distributes debt between multiple creditors and accounts for a debtor who partially paid', () => {
    const input = expense('shared', 120, [['alice', 60], ['bob', 50], ['carol', 10]], [
      ['alice', 1, 'ratio'], ['bob', 1, 'ratio'], ['carol', 1, 'ratio'], ['dave', 1, 'ratio'],
    ]);
    expect(calculatePairwiseBalances([input])).toEqual(new Map([
      ['alice:carol', -12], ['alice:dave', -18], ['bob:carol', -8], ['bob:dave', -12],
    ]));
  });

  it('does not create self-debts or debts for people who paid exactly their share', () => {
    const input = expense('shared', 60, [['alice', 30], ['bob', 30]], [
      ['alice', 1, 'ratio'], ['bob', 1, 'ratio'],
    ]);
    expect(calculatePairwiseBalances([input])).toEqual(new Map());
    expect(calculatePairwiseBalances([expense('solo', 60, [['alice', 60]], [['alice', 1, 'ratio']])])).toEqual(new Map());
  });

  it('includes someone who pays but does not participate in the split', () => {
    const input = expense('gift', 60, [['alice', 60]], [['bob', 1, 'ratio'], ['carol', 2, 'ratio']]);
    expect(calculateMemberBalances([input])).toEqual([
      { memberId: 'alice', totalPaid: 60, totalOwed: 0, netBalance: 60 },
      { memberId: 'bob', totalPaid: 0, totalOwed: 20, netBalance: -20 },
      { memberId: 'carol', totalPaid: 0, totalOwed: 40, netBalance: -40 },
    ]);
    expect(calculatePairwiseBalances([input])).toEqual(new Map([['alice:bob', -20], ['alice:carol', -40]]));
  });
});

describe('settlement verification', () => {
  it.each([
    [-0.01, 0.01], [-0.02, 0.01, 0.01], [-0.03, 0.01, 0.02], [-50, -50, 75, 25], [-10, 10],
  ])('settles each member to the cent (case %#)', (...amounts) => {
    const balances = amounts.map((netBalance, i) => ({ memberId: String(i), totalPaid: Math.max(0, netBalance), totalOwed: Math.max(0, -netBalance), netBalance }));
    const original = structuredClone(balances);
    const remaining = new Map(balances.map(b => [b.memberId, b.netBalance]));
    const settlements = calculateSettlements(balances);
    for (const transfer of settlements) {
      expect(transfer.amount).toBeGreaterThan(0);
      expect(transfer.fromMemberId).not.toBe(transfer.toMemberId);
      expect(transfer.amount * 100).toBeCloseTo(Math.round(transfer.amount * 100), 8);
      remaining.set(transfer.fromMemberId, remaining.get(transfer.fromMemberId)! + transfer.amount);
      remaining.set(transfer.toMemberId, remaining.get(transfer.toMemberId)! - transfer.amount);
    }
    for (const remainder of remaining.values()) expect(remainder).toBeCloseTo(0, 8);
    expect(balances).toEqual(original);
    expect(settlements.length).toBeLessThanOrEqual(balances.length - 1);
  });

  it('ignores sub-cent noise and rounds suggested transfers', () => {
    expect(calculateSettlements([
      { memberId: 'a', totalPaid: 0, totalOwed: 0, netBalance: -0.001 },
      { memberId: 'b', totalPaid: 0, totalOwed: 0, netBalance: 0.001 },
    ])).toEqual([]);
    expect(calculateGroupBalances([expense('thirds', 10)]).settlements).toEqual([
      { fromMemberId: 'bob', toMemberId: 'alice', amount: 3.33 },
      { fromMemberId: 'carol', toMemberId: 'alice', amount: 3.33 },
    ]);
  });

  it('conserves money across varied weighted expenses and pairwise debts', () => {
    // Deterministic inputs keep failures reproducible while exercising different payer and ratio combinations.
    const ids = ['alice', 'bob', 'carol', 'dave'];
    for (let scenario = 1; scenario <= 30; scenario++) {
      const expenses = Array.from({ length: 5 }, (_, index) => {
        const total = (scenario * 17 + index * 13) / 100;
        return expense(`e${index}`, total, [[ids[(scenario + index) % 4], total]],
          ids.map((id, member) => [id, 1 + (scenario + index + member) % 5, 'ratio']));
      });
      const before = structuredClone(expenses);
      const { memberBalances, settlements } = calculateGroupBalances(expenses);
      expect(memberBalances.reduce((sum, b) => sum + b.netBalance, 0)).toBeCloseTo(0, 10);
      const pairwise = new Map(ids.map(id => [id, 0]));
      for (const [key, amount] of calculatePairwiseBalances(expenses)) {
        const [from, to] = key.split(':');
        pairwise.set(from, pairwise.get(from)! - amount);
        pairwise.set(to, pairwise.get(to)! + amount);
      }
      for (const balance of memberBalances) {
        expect(pairwise.get(balance.memberId)).toBeCloseTo(balance.netBalance, 10);
        const outgoing = settlements.filter(s => s.fromMemberId === balance.memberId).reduce((sum, s) => sum + s.amount, 0);
        const incoming = settlements.filter(s => s.toMemberId === balance.memberId).reduce((sum, s) => sum + s.amount, 0);
        expect(Math.abs(balance.netBalance + outgoing - incoming)).toBeLessThanOrEqual(0.015);
      }
      expect(expenses).toEqual(before);
    }
  });
});

describe('expense validation boundaries', () => {
  it('accepts floating-point addition and rejects missing or mismatched payers', () => {
    expect(validateExpensePayers(0.3, [{ amount: 0.1 }, { amount: 0.2 }])).toBe(true);
    expect(validateExpensePayers(10, [])).toBe(false);
    expect(validateExpensePayers(10, [{ amount: 9.98 }])).toBe(false);
  });

  it.each(['fixed', 'percentage'] as const)('rejects incomplete %s splits without a remainder ratio', shareType => {
    expect(validateExpenseSplits([{ share: 50, shareType }], 100).valid).toBe(false);
  });

  it('accepts complete fixed/percentage coverage and a weighted remainder', () => {
    const splits = [{ share: 20, shareType: 'fixed' as const }, { share: 80, shareType: 'percentage' as const }];
    expect(validateExpenseSplits(splits, 100)).toEqual({ valid: true });
    expect(validateExpenseSplits([{ share: 20, shareType: 'fixed' }, { share: 1, shareType: 'ratio' }], 100)).toEqual({ valid: true });
    expect(validateExpenseSplits([], 100).valid).toBe(false);
  });

  it('rejects combined fixed and percentage allocations exceeding the total even with a ratio', () => {
    expect(validateExpenseSplits([
      { share: 80, shareType: 'fixed' }, { share: 50, shareType: 'percentage' }, { share: 1, shareType: 'ratio' },
    ], 100).valid).toBe(false);
  });

  it.each([NaN, Infinity, -1])('rejects an invalid share of %s', share => {
    expect(validateExpenseSplits([{ share, shareType: 'ratio' }], 100).valid).toBe(false);
  });

  it('rejects ratio splits whose total weight is zero', () => {
    expect(validateExpenseSplits([{ share: 0, shareType: 'ratio' }], 100).valid).toBe(false);
  });
});
