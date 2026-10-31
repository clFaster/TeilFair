import { useTranslation } from 'react-i18next';
import { faPenToSquare } from '@fortawesome/free-solid-svg-icons';
import type { Expense } from '@teilfair/shared';
import { EditExpenseForm } from './EditExpenseForm';
import { Modal } from './Modal';

interface EditExpenseModalProps {
  expense: Expense;
  onClose: () => void;
}

export function EditExpenseModal({ expense, onClose }: Readonly<EditExpenseModalProps>) {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('expense.editExpense')}
      icon={faPenToSquare}
      onClose={onClose}
      size="lg"
      className="modal-expense modal-form"
    >
      <EditExpenseForm expense={expense} onSuccess={onClose} onCancel={onClose} />
    </Modal>
  );
}
