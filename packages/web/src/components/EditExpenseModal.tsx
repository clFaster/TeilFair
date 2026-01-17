import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit } from '@fortawesome/free-solid-svg-icons';
import { EditExpenseForm } from './EditExpenseForm';
import type { Expense } from '@teilfair/shared';

interface EditExpenseModalProps {
  expense: Expense;
  onClose: () => void;
}

export function EditExpenseModal({ expense, onClose }: EditExpenseModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-expense" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faEdit} style={{ marginRight: '10px', opacity: 0.7 }} />
            Edit Expense
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <EditExpenseForm 
            expense={expense}
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
