import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faEdit, faTrash, faUser } from '@fortawesome/free-solid-svg-icons';

interface ExpenseCardProps {
  animationDelay: number;
  formattedAmount: string;
  dateTimeLabel: string;
  description: string;
  paidByText: string;
  payerDetails?: string;
  splitInfo: string;
  editLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  canEdit: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export function ExpenseCard({
  animationDelay,
  formattedAmount,
  dateTimeLabel,
  description,
  paidByText,
  payerDetails,
  splitInfo,
  editLabel,
  deleteLabel,
  deletingLabel,
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
}: Readonly<ExpenseCardProps>) {
  return (
    <div
      className="expense-card"
      style={{
        animationDelay: `${animationDelay}s`,
        opacity: isDeleting ? 0.5 : 1,
      }}
    >
      <div className="expense-header">
        <div className="expense-main">
          <div className="expense-description">{description}</div>
          <div className="expense-date">
            <FontAwesomeIcon icon={faClock} style={{ marginRight: '4px', opacity: 0.6 }} />
            {dateTimeLabel}
          </div>
        </div>
        <div className="expense-amount">{formattedAmount}</div>
      </div>

      <div className="expense-details">
        <div className="expense-payer-row">
          <FontAwesomeIcon icon={faUser} style={{ opacity: 0.5, fontSize: '12px' }} />
          <span>{paidByText}</span>
          {payerDetails ? (
            <span className="text-muted expense-payer-details">({payerDetails})</span>
          ) : null}
        </div>
        <div className="expense-details-split">{splitInfo}</div>
      </div>

      {canEdit && (
        <div className="expense-actions">
          <button
            className="btn btn-sm btn-secondary expense-action-button"
            onClick={onEdit}
            disabled={isDeleting}
          >
            <FontAwesomeIcon icon={faEdit} style={{ marginRight: '4px' }} />
            {editLabel}
          </button>
          <button
            className="btn btn-sm btn-danger expense-action-button"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <FontAwesomeIcon icon={faTrash} style={{ marginRight: '4px' }} />
            {isDeleting ? deletingLabel : deleteLabel}
          </button>
        </div>
      )}
    </div>
  );
}
