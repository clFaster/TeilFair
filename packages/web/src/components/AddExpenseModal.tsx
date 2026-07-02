import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faReceipt } from '@fortawesome/free-solid-svg-icons';
import { AddExpenseForm } from './AddExpenseForm';

interface AddExpenseModalProps {
  onClose: () => void;
}

export function AddExpenseModal({ onClose }: AddExpenseModalProps) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-expense" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faReceipt} style={{ marginRight: '10px', opacity: 0.7 }} />
            {t('expense.addExpense')}
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <AddExpenseForm 
            onSuccess={onClose} 
            onCancel={onClose}
            showHeader={false}
            showCancelButton={true}
          />
        </div>
      </div>
    </div>
  );
}
