import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faReceipt } from '@fortawesome/free-solid-svg-icons';
import type { Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { ExpenseCard } from './ExpenseCard';
import { ConfirmDialog } from './ConfirmDialog';
import { EmptyState } from './EmptyState';
import { memberTone } from './avatarTone';

interface ExpensesListProps {
  canEdit: boolean;
  onEditExpense?: (expense: Expense) => void;
  onViewExpense?: (expense: Expense) => void;
  /** Call to action of the empty state (writers only). */
  onAddExpense?: () => void;
  /** Highlights the expense currently shown in the details panel. */
  selectedExpenseId?: string;
}

interface ExpenseDay {
  key: string;
  date: Date;
  total: number;
  expenses: Expense[];
}

const DAY_MS = 1000 * 60 * 60 * 24;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

/** Newest first, bucketed by local calendar day. */
function groupByDay(expenses: Expense[]): ExpenseDay[] {
  const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const days: ExpenseDay[] = [];

  for (const expense of sorted) {
    const date = new Date(expense.date);
    const key = dayKey(date);
    const current = days[days.length - 1];
    if (current?.key === key) {
      current.expenses.push(expense);
      current.total += expense.totalAmount;
    } else {
      days.push({ key, date: startOfDay(date), total: expense.totalAmount, expenses: [expense] });
    }
  }

  return days;
}

export function ExpensesList({
  canEdit,
  onEditExpense,
  onViewExpense,
  onAddExpense,
  selectedExpenseId,
}: Readonly<ExpensesListProps>) {
  const { t } = useTranslation();
  const { expenses, members, group, deleteExpense } = useGroupStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || t('common.unknown');
  };

  const formatDay = (date: Date) => {
    const today = startOfDay(new Date());
    const days = Math.round((today.getTime() - date.getTime()) / DAY_MS);

    if (days === 0) return t('common.today');
    if (days === 1) return t('common.yesterday');

    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      ...(date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString(undefined, {
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
    setDeletingId(expenseId);
    try {
      await deleteExpense(expenseId);
    } finally {
      setDeletingId(null);
    }
  };

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={faReceipt}
        titleAs="h3"
        title={t('expense.emptyTitle')}
        description={canEdit ? t('expense.emptyDescriptionWithWrite') : t('expense.emptyDescriptionReadOnly')}
        action={canEdit && onAddExpense ? (
          <button type="button" className="btn btn-primary" onClick={onAddExpense}>
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            {t('expense.addExpense')}
          </button>
        ) : undefined}
      />
    );
  }

  return (
    <div className="expense-list">
      {groupByDay(expenses).map((day) => {
        const headingId = `expense-day-${day.key}`;

        return (
          <section key={day.key} className="expense-day" aria-labelledby={headingId}>
            <header className="expense-day-header">
              <h3 id={headingId} className="expense-day-title">{formatDay(day.date)}</h3>
              <span className="expense-day-total">
                <span className="sr-only">{t('common.total')}: </span>
                {formatCurrency(day.total)}
              </span>
            </header>

            <ul className="expense-day-items">
              {day.expenses.map((expense) => {
                const payerIds = expense.payers.map(p => p.memberId);
                const payerNames = payerIds.map(getMemberName).join(' & ');
                const firstPayerId = payerIds[0] ?? '';

                let splitInfo = t('expense.splitBetween', { count: expense.splits.length });
                if (expense.splits.length === members.length) {
                  splitInfo = t('expense.splitEqually');
                } else if (expense.splits.length === 1) {
                  splitInfo = t('expense.splitOnly', { name: getMemberName(expense.splits[0].memberId) });
                }

                return (
                  <li key={expense.id}>
                    <ExpenseCard
                      formattedAmount={formatCurrency(expense.totalAmount)}
                      timeLabel={formatTime(expense.date)}
                      dateTime={new Date(expense.date).toISOString()}
                      description={expense.description || t('expense.defaultDescription')}
                      paidByText={t('expense.paidBy', { names: payerNames })}
                      payerName={firstPayerId ? getMemberName(firstPayerId) : '?'}
                      payerTone={memberTone(members, firstPayerId)}
                      extraPayers={Math.max(0, payerIds.length - 1)}
                      splitInfo={splitInfo}
                      editLabel={t('common.edit')}
                      deleteLabel={t('common.delete')}
                      deletingLabel={t('expense.deleting')}
                      viewLabel={t('expense.viewDetails')}
                      canEdit={canEdit}
                      isDeleting={deletingId === expense.id}
                      isSelected={selectedExpenseId === expense.id}
                      onEdit={() => onEditExpense?.(expense)}
                      onDelete={() => setPendingDeleteId(expense.id)}
                      onView={onViewExpense ? () => onViewExpense(expense) : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {pendingDeleteId && (
        <ConfirmDialog
          title={t('expense.confirmDeleteTitle')}
          message={t('expense.confirmDelete')}
          danger
          confirmLabel={t('common.delete')}
          onConfirm={() => handleDelete(pendingDeleteId)}
          onClose={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}
