import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { ExpenseForm } from './ExpenseForm';

interface AddExpenseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddExpenseForm({ onSuccess, onCancel }: Readonly<AddExpenseFormProps>) {
  const { t } = useTranslation();
  const addExpense = useGroupStore((state) => state.addExpense);

  return (
    <ExpenseForm
      submitLabel={t('expense.addExpense')}
      submittingLabel={t('expense.adding')}
      submitIcon={<FontAwesomeIcon icon={faPlus} aria-hidden="true" />}
      failureKey="expense.errors.addFailed"
      onSubmit={async (input) => {
        await addExpense(input);
        onSuccess?.();
      }}
      onCancel={onCancel}
    />
  );
}
