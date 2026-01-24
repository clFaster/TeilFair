import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import type { Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { ExpenseCard } from './ExpenseCard';

interface ExpensesListProps {
  canEdit: boolean;
  onEditExpense?: (expense: Expense) => void;
}

export function ExpensesList({ canEdit, onEditExpense }: Readonly<ExpensesListProps>) {
  const { t } = useTranslation();
  const { expenses, members, group, deleteExpense } = useGroupStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || t('common.unknown');
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return t('common.today');
    if (days === 1) return t('common.yesterday');
    if (days < 7) return t('common.daysAgo', { count: days });
    
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
    if (!confirm(t('expense.confirmDelete'))) return;
    setDeletingId(expenseId);
    try {
      await deleteExpense(expenseId);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (expense: Expense) => {
    if (onEditExpense) {
      onEditExpense(expense);
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
        <p>{t('expense.emptyTitle')}</p>
        <p className="text-sm">{t('expense.emptyDescription')}</p>
      </div>
    );
  }

  // Sort expenses by date (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
        {sortedExpenses.map((expense, index) => {
          const payerNames = expense.payers.length === 1
            ? getMemberName(expense.payers[0].memberId)
            : expense.payers.map(p => getMemberName(p.memberId)).join(' & ');
          
          const splitInfo = expense.splits.length === members.length
            ? t('expense.splitEqually')
            : t('expense.splitBetween', { count: expense.splits.length });

          const isDeleting = deletingId === expense.id;

          const payerDetails = expense.payers.length > 1
            ? expense.payers.map(p => `${getMemberName(p.memberId)}: ${formatCurrency(p.amount)}`).join(', ')
            : undefined;

          return (
            <ExpenseCard
              key={expense.id}
              animationDelay={index * 0.05}
              formattedAmount={formatCurrency(expense.totalAmount)}
              dateTimeLabel={`${formatDate(expense.date)} ${t('common.at')} ${formatTime(expense.date)}`}
              description={expense.description || t('expense.defaultDescription')}
              paidByText={t('expense.paidBy', { names: payerNames })}
              payerDetails={payerDetails}
              splitInfo={splitInfo}
              editLabel={t('common.edit')}
              deleteLabel={t('common.delete')}
              deletingLabel={t('expense.deleting')}
              canEdit={canEdit}
              isDeleting={isDeleting}
              onEdit={() => handleEditClick(expense)}
              onDelete={() => handleDelete(expense.id)}
            />
          );
        })}
      </div>
  );
}
