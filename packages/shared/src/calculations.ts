import type { Expense, MemberBalance, Settlement, ExpenseSplit } from './types';

/**
 * Calculate the actual amount each member owes for an expense based on their splits
 */
export function calculateSplitAmounts(
  totalAmount: number,
  splits: ExpenseSplit[]
): Map<string, number> {
  const amounts = new Map<string, number>();

  // Group splits by type
  const fixedSplits = splits.filter(s => s.shareType === 'fixed');
  const percentageSplits = splits.filter(s => s.shareType === 'percentage');
  const ratioSplits = splits.filter(s => s.shareType === 'ratio');

  // Calculate fixed amounts first
  let remainingAmount = totalAmount;
  for (const split of fixedSplits) {
    amounts.set(split.memberId, split.share);
    remainingAmount -= split.share;
  }

  // Calculate percentage amounts
  for (const split of percentageSplits) {
    const amount = (totalAmount * split.share) / 100;
    amounts.set(split.memberId, (amounts.get(split.memberId) || 0) + amount);
    remainingAmount -= amount;
  }

  // Distribute remaining amount by ratio
  if (ratioSplits.length > 0) {
    const totalRatio = ratioSplits.reduce((sum, s) => sum + s.share, 0);
    for (const split of ratioSplits) {
      const amount = (remainingAmount * split.share) / totalRatio;
      amounts.set(split.memberId, (amounts.get(split.memberId) || 0) + amount);
    }
  }

  return amounts;
}

/**
 * Calculate the balance for each member across all expenses
 * Positive netBalance = member is owed money
 * Negative netBalance = member owes money
 */
export function calculateMemberBalances(expenses: Expense[]): MemberBalance[] {
  const balances = new Map<string, MemberBalance>();

  const getOrCreateBalance = (memberId: string): MemberBalance => {
    if (!balances.has(memberId)) {
      balances.set(memberId, {
        memberId,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
      });
    }
    return balances.get(memberId)!;
  };

  for (const expense of expenses) {
    // Add what each person paid
    for (const payer of expense.payers) {
      const balance = getOrCreateBalance(payer.memberId);
      balance.totalPaid += payer.amount;
    }

    // Calculate what each person owes
    const splitAmounts = calculateSplitAmounts(expense.totalAmount, expense.splits);
    for (const [memberId, amount] of splitAmounts) {
      const balance = getOrCreateBalance(memberId);
      balance.totalOwed += amount;
    }
  }

  // Calculate net balance for each member
  for (const balance of balances.values()) {
    balance.netBalance = balance.totalPaid - balance.totalOwed;
  }

  return Array.from(balances.values());
}

/**
 * Calculate detailed balances between each pair of members
 * Returns a map where key is "fromId:toId" and value is the amount fromId owes toId
 */
export function calculatePairwiseBalances(expenses: Expense[]): Map<string, number> {
  const pairBalances = new Map<string, number>();

  const addBalance = (fromId: string, toId: string, amount: number) => {
    if (fromId === toId || amount === 0) return;
    
    // Always use consistent key ordering to avoid duplicates
    const [first, second] = fromId < toId ? [fromId, toId] : [toId, fromId];
    const key = `${first}:${second}`;
    const existingAmount = pairBalances.get(key) || 0;
    
    // If fromId is first, positive means first owes second
    // If fromId is second, we need to negate
    const adjustedAmount = fromId === first ? amount : -amount;
    pairBalances.set(key, existingAmount + adjustedAmount);
  };

  for (const expense of expenses) {
    const splitAmounts = calculateSplitAmounts(expense.totalAmount, expense.splits);
    
    // For each payer, they are owed by each person who has a split
    for (const payer of expense.payers) {
      const payerShare = splitAmounts.get(payer.memberId) || 0;
      const payerContribution = payer.amount - payerShare; // What they paid beyond their share
      
      if (payerContribution <= 0) continue;

      // Distribute what this payer is owed across all other members proportionally
      const otherMembersDebt = new Map<string, number>();
      let totalOtherDebt = 0;

      for (const [memberId, owedAmount] of splitAmounts) {
        if (memberId === payer.memberId) continue;
        const memberPaid = expense.payers.find(p => p.memberId === memberId)?.amount || 0;
        const debt = owedAmount - memberPaid;
        if (debt > 0) {
          otherMembersDebt.set(memberId, debt);
          totalOtherDebt += debt;
        }
      }

      // Each debtor owes the payer proportionally
      for (const [debtorId, debt] of otherMembersDebt) {
        const proportion = debt / totalOtherDebt;
        const owedToPayer = payerContribution * proportion;
        addBalance(debtorId, payer.memberId, owedToPayer);
      }
    }
  }

  return pairBalances;
}

/**
 * Simplify debts using the "min-cash-flow" algorithm
 * This minimizes the number of transactions needed to settle all debts
 */
export function calculateSettlements(memberBalances: MemberBalance[]): Settlement[] {
  const settlements: Settlement[] = [];
  
  // Create mutable copies of net balances
  const balances = memberBalances
    .filter(b => Math.abs(b.netBalance) > 0.01) // Filter out zero balances
    .map(b => ({ memberId: b.memberId, balance: b.netBalance }));

  // Sort: debtors (negative) first, then creditors (positive)
  balances.sort((a, b) => a.balance - b.balance);

  let debtorIndex = 0;
  let creditorIndex = balances.length - 1;

  while (debtorIndex < creditorIndex) {
    const debtor = balances[debtorIndex];
    const creditor = balances[creditorIndex];

    if (debtor.balance >= -0.01) {
      debtorIndex++;
      continue;
    }
    if (creditor.balance <= 0.01) {
      creditorIndex--;
      continue;
    }

    const amount = Math.min(-debtor.balance, creditor.balance);
    
    if (amount > 0.01) {
      settlements.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amount: Math.round(amount * 100) / 100, // Round to 2 decimal places
      });
    }

    debtor.balance += amount;
    creditor.balance -= amount;

    if (Math.abs(debtor.balance) < 0.01) debtorIndex++;
    if (Math.abs(creditor.balance) < 0.01) creditorIndex--;
  }

  return settlements;
}

/**
 * Main function to calculate all balances and suggested settlements for a group
 */
export function calculateGroupBalances(expenses: Expense[]): {
  memberBalances: MemberBalance[];
  settlements: Settlement[];
} {
  const memberBalances = calculateMemberBalances(expenses);
  const settlements = calculateSettlements(memberBalances);
  
  return { memberBalances, settlements };
}

/**
 * Validate that an expense's payers sum to the total amount
 */
export function validateExpensePayers(
  totalAmount: number,
  payers: Array<{ amount: number }>
): boolean {
  const payerTotal = payers.reduce((sum, p) => sum + p.amount, 0);
  return Math.abs(payerTotal - totalAmount) < 0.01;
}

/**
 * Validate that splits are valid (percentages sum to 100, etc.)
 */
export function validateExpenseSplits(
  splits: Array<{ share: number; shareType: 'ratio' | 'fixed' | 'percentage' }>,
  totalAmount: number
): { valid: boolean; error?: string } {
  const percentageSplits = splits.filter(s => s.shareType === 'percentage');
  const fixedSplits = splits.filter(s => s.shareType === 'fixed');
  const ratioSplits = splits.filter(s => s.shareType === 'ratio');

  // Check percentages sum to <= 100
  const totalPercentage = percentageSplits.reduce((sum, s) => sum + s.share, 0);
  if (totalPercentage > 100) {
    return { valid: false, error: 'Percentage splits cannot exceed 100%' };
  }

  // Check fixed amounts don't exceed total
  const totalFixed = fixedSplits.reduce((sum, s) => sum + s.share, 0);
  if (totalFixed > totalAmount) {
    return { valid: false, error: 'Fixed splits cannot exceed total amount' };
  }

  // If no ratio splits, percentages + fixed must cover everything
  if (ratioSplits.length === 0) {
    const covered = totalFixed + (totalAmount * totalPercentage / 100);
    if (Math.abs(covered - totalAmount) > 0.01) {
      return { valid: false, error: 'Splits must cover the entire amount when no ratio splits are used' };
    }
  }

  return { valid: true };
}
