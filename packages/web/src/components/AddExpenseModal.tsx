import { useTranslation } from 'react-i18next';
import { faReceipt } from '@fortawesome/free-solid-svg-icons';
import { AddExpenseForm } from './AddExpenseForm';
import { Modal } from './Modal';

interface AddExpenseModalProps {
  onClose: () => void;
}

export function AddExpenseModal({ onClose }: Readonly<AddExpenseModalProps>) {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('expense.addExpense')}
      icon={faReceipt}
      onClose={onClose}
      size="lg"
      className="modal-expense modal-form"
    >
      <AddExpenseForm onSuccess={onClose} onCancel={onClose} />
    </Modal>
  );
}
