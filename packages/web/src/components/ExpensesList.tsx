import { useState } from 'react';
import type { Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { EditExpenseModal } from './EditExpenseModal';

interface ExpensesListProps {
  canEdit: boolean;
}

export function ExpensesList({ canEdit }: ExpensesListProps) {
  const { expenses, members, group, deleteExpense } = useGroupStore();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
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
    <>
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
                  <div className="expense-description">{expense.description}</div>
                  <div className="expense-date">
                    {formatDate(expense.date)} at {formatTime(expense.date)}
                  </div>
                </div>
                <div className="expense-amount">{formatCurrency(expense.totalAmount)}</div>
              </div>
              <div className="expense-details">
                <div>Paid by: {payerNames}</div>
                <div>{splitInfo}</div>
              </div>
              {canEdit && (
                <div className="flex gap-2 mt-2">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditingExpense(expense)}
                  >
                    Edit
                  </button>
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
      
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </>
  );
}
