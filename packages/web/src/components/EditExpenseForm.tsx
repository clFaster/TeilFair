import { useTranslation } from 'react-i18next';
import type { Expense } from '@teilfair/shared';
import { useGroupStore } from '../store/groupStore';
import { ExpenseForm } from './ExpenseForm';

interface EditExpenseFormProps {
  expense: Expense;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditExpenseForm({ expense, onSuccess, onCancel }: Readonly<EditExpenseFormProps>) {
  const { t } = useTranslation();
  const updateExpense = useGroupStore((state) => state.updateExpense);

  return (
    <ExpenseForm
      // Re-initialise the fields when a different expense is edited
      key={expense.id}
      expense={expense}
      submitLabel={t('expense.saveChanges')}
      submittingLabel={t('expense.saving')}
      failureKey="expense.errors.updateFailed"
      onSubmit={async (input) => {
        await updateExpense(expense.id, input);
        onSuccess?.();
      }}
      onCancel={onCancel}
    />
  );
}
