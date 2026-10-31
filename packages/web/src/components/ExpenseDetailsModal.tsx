import { useTranslation } from 'react-i18next';
import { faEye } from '@fortawesome/free-solid-svg-icons';
import { calculateSplitAmounts, type Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { Modal } from './Modal';

interface ExpenseDetailsModalProps {
  expense: Expense;
  onClose: () => void;
}

interface ExpenseDetailsContentProps {
  expense: Expense;
}

export function ExpenseDetailsContent({ expense }: ExpenseDetailsContentProps) {
  const { t } = useTranslation();
  const { members, group } = useGroupStore();

  const getMemberName = (memberId: string) => {
    return members.find(member => member.id === memberId)?.name || t('common.unknown');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const payerDetails = expense.payers.map(payer => ({
    memberId: payer.memberId,
    name: getMemberName(payer.memberId),
    amount: formatCurrency(payer.amount),
  }));

  const memberOrder = new Map(members.map((member, index) => [member.id, index]));
  const splitAmounts = calculateSplitAmounts(expense.totalAmount, expense.splits);
  const splitDetails = Array.from(splitAmounts.entries())
    .sort((a, b) => (memberOrder.get(a[0]) ?? 999) - (memberOrder.get(b[0]) ?? 999))
    .map(([memberId, amount]) => ({
      memberId,
      name: getMemberName(memberId),
      amount: formatCurrency(amount),
    }));

  return (
    <div className="expense-detail-list">
      <div className="expense-detail-row">
        <div className="expense-detail-label">{t('expense.descriptionLabel')}</div>
        <div className="expense-detail-value">
          {expense.description || t('expense.defaultDescription')}
        </div>
      </div>

      <div className="expense-detail-row">
        <div className="expense-detail-label">{t('expense.amountLabel', { currency: group?.currency || 'EUR' })}</div>
        <div className="expense-detail-value expense-detail-amount">
          {formatCurrency(expense.totalAmount)}
        </div>
      </div>

      <div className="expense-detail-row">
        <div className="expense-detail-label">{t('expense.dateTimeLabel')}</div>
        <div className="expense-detail-value">{formatDateTime(new Date(expense.date))}</div>
      </div>

      <div className="expense-detail-row">
        <div className="expense-detail-label">{t('expense.whoPaidLabel')}</div>
        <div className="expense-detail-stack">
          {payerDetails.map(payer => (
            <div key={payer.memberId} className="expense-detail-entry">
              <span>{payer.name}</span>
              <span className="expense-detail-amount">{payer.amount}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="expense-detail-row">
        <div className="expense-detail-label">{t('expense.splitBetweenLabel')}</div>
        <div className="expense-detail-stack">
          {splitDetails.map(split => (
            <div key={split.memberId} className="expense-detail-entry">
              <span>{split.name}</span>
              <span className="expense-detail-amount">{split.amount}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExpenseDetailsModal({ expense, onClose }: Readonly<ExpenseDetailsModalProps>) {
  const { t } = useTranslation();

  return (
    <Modal
      title={t('expense.viewExpense')}
      icon={faEye}
      onClose={onClose}
      size="md"
      className="modal-expense"
      footer={(
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('common.close')}
        </button>
      )}
    >
      <ExpenseDetailsContent expense={expense} />
    </Modal>
  );
}
