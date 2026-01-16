import { useGroupStore } from '../store/groupStore';

interface ExpensesListProps {
  canEdit: boolean;
}

export function ExpensesList({ canEdit }: ExpensesListProps) {
  const { expenses, members, group, deleteExpense } = useGroupStore();

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    await deleteExpense(expenseId);
  };

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <p>No expenses yet</p>
        <p className="text-sm">Add an expense to start tracking</p>
      </div>
    );
  }

  return (
    <div>
      {expenses.map((expense) => {
        const payerNames = expense.payers
          .map(p => `${getMemberName(p.memberId)} (${formatCurrency(p.amount)})`)
          .join(', ');
        
        const splitInfo = expense.splits.length === members.length
          ? 'Split equally'
          : `Split between ${expense.splits.length} people`;

        return (
          <div key={expense.id} className="expense-card">
            <div className="expense-header">
              <div>
                <div className="font-bold">{expense.description}</div>
                <div className="expense-date">{formatDate(expense.date)}</div>
              </div>
              <div className="expense-amount">{formatCurrency(expense.totalAmount)}</div>
            </div>
            <div className="expense-details">
              <div>Paid by: {payerNames}</div>
              <div>{splitInfo}</div>
            </div>
            {canEdit && (
              <div className="mt-2">
                <button 
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(expense.id)}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
