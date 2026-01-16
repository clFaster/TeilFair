import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrash, faClock, faUser } from '@fortawesome/free-solid-svg-icons';
import type { Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { EditExpenseModal } from './EditExpenseModal';

interface ExpensesListProps {
  canEdit: boolean;
  onEditExpense?: (expense: Expense) => void;
  useExternalEdit?: boolean;
}

export function ExpensesList({ canEdit, onEditExpense, useExternalEdit = false }: ExpensesListProps) {
  const { expenses, members, group, deleteExpense } = useGroupStore();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    
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
    setDeletingId(expenseId);
    try {
      await deleteExpense(expenseId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (expense: Expense) => {
    if (useExternalEdit && onEditExpense) {
      onEditExpense(expense);
    } else {
      setEditingExpense(expense);
    }
  };

  if (expenses.length === 0) {
    return (
      <div className="empty-state">
        <div style={{ 
          width: '64px', 
          height: '64px', 
          borderRadius: '50%', 
          background: 'var(--color-surface)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          margin: '0 auto 16px',
          fontSize: '24px',
          color: 'var(--color-text-muted)'
        }}>
          <FontAwesomeIcon icon={faClock} />
        </div>
        <p>No expenses yet</p>
        <p className="text-sm">Add an expense to start tracking</p>
      </div>
    );
  }

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <div>
        {sortedExpenses.map((expense, index) => {
          const payerNames = expense.payers.length === 1
            ? getMemberName(expense.payers[0].memberId)
            : expense.payers.map(p => getMemberName(p.memberId)).join(' & ');
          
          const splitInfo = expense.splits.length === members.length
            ? 'Split equally'
            : `Split between ${expense.splits.length} people`;

          const isDeleting = deletingId === expense.id;

          return (
            <div 
              key={expense.id} 
              className="expense-card"
              style={{ 
                animationDelay: `${index * 0.05}s`,
                opacity: isDeleting ? 0.5 : 1
              }}
            >
              <div className="expense-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="expense-description">{expense.description || 'Expense'}</div>
                  <div className="expense-date">
                    <FontAwesomeIcon icon={faClock} style={{ marginRight: '4px', opacity: 0.6 }} />
                    {formatDate(expense.date)} at {formatTime(expense.date)}
                  </div>
                </div>
                <div className="expense-amount">{formatCurrency(expense.totalAmount)}</div>
              </div>
              
              <div className="expense-details">
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FontAwesomeIcon icon={faUser} style={{ opacity: 0.5, fontSize: '12px' }} />
                  <span>Paid by {payerNames}</span>
                  {expense.payers.length > 1 && (
                    <span className="text-muted" style={{ fontSize: '12px' }}>
                      ({expense.payers.map(p => `${getMemberName(p.memberId)}: ${formatCurrency(p.amount)}`).join(', ')})
                    </span>
                  )}
                </div>
                <div style={{ marginTop: '2px', opacity: 0.8 }}>{splitInfo}</div>
              </div>
              
              {canEdit && (
                <div className="flex gap-2 mt-3" style={{ paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleEditClick(expense)}
                    disabled={isDeleting}
                    style={{ minWidth: '80px' }}
                  >
                    <FontAwesomeIcon icon={faEdit} style={{ marginRight: '4px' }} />
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(expense.id)}
                    disabled={isDeleting}
                    style={{ minWidth: '80px' }}
                  >
                    <FontAwesomeIcon icon={faTrash} style={{ marginRight: '4px' }} />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {editingExpense && !useExternalEdit && (
        <EditExpenseModal
          expense={editingExpense}
          onClose={() => setEditingExpense(null)}
        />
      )}
    </>
  );
}
