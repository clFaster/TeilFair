import { useGroupStore } from '../store/groupStore';

export function BalancesSummary() {
  const { memberBalances, settlements, members, group } = useGroupStore();

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const getBalanceClass = (balance: number) => {
    if (balance > 0.01) return 'balance-positive';
    if (balance < -0.01) return 'balance-negative';
    return 'balance-zero';
  };

  if (memberBalances.length === 0) {
    return (
      <div className="empty-state">
        <p>No balances yet</p>
        <p className="text-sm">Add expenses to see who owes whom</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold mb-2">Individual Balances</h3>
      <ul className="list mb-4">
        {memberBalances.map((balance) => (
          <li key={balance.memberId} className="list-item">
            <span>{getMemberName(balance.memberId)}</span>
            <span className={getBalanceClass(balance.netBalance)}>
              {balance.netBalance > 0.01 && '+'}
              {formatCurrency(balance.netBalance)}
            </span>
          </li>
        ))}
      </ul>

      {settlements.length > 0 && (
        <>
          <h3 className="font-bold mb-2">Suggested Settlements</h3>
          <p className="text-sm text-muted mb-2">
            These payments will settle all debts with minimum transactions
          </p>
          {settlements.map((settlement, index) => (
            <div key={index} className="settlement-card">
              <span className="font-bold">{getMemberName(settlement.fromMemberId)}</span>
              <span className="settlement-arrow">→</span>
              <span className="font-bold">{getMemberName(settlement.toMemberId)}</span>
              <span className="settlement-amount">{formatCurrency(settlement.amount)}</span>
            </div>
          ))}
        </>
      )}

      {settlements.length === 0 && memberBalances.every(b => Math.abs(b.netBalance) < 0.01) && (
        <div className="text-center text-success mt-4">
          <p className="font-bold">All settled up!</p>
          <p className="text-sm">No payments needed</p>
        </div>
      )}
    </div>
  );
}
