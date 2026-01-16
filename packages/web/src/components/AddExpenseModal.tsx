import { AddExpenseForm } from './AddExpenseForm';

interface AddExpenseModalProps {
  onClose: () => void;
}

export function AddExpenseModal({ onClose }: AddExpenseModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-expense" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Expense</h2>
          <button className="btn btn-icon btn-ghost" onClick={onClose}>×</button>
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
