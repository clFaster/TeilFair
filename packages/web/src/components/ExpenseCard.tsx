import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock, faEdit, faTrash, faUser, faEye } from '@fortawesome/free-solid-svg-icons';

interface ExpenseCardProps {
  animationDelay: number;
  formattedAmount: string;
  dateTimeLabel: string;
  description: string;
  paidByText: string;
  splitInfo: string;
  editLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  viewLabel?: string;
  canEdit: boolean;
  isDeleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView?: () => void;
}

export function ExpenseCard({
  animationDelay,
  formattedAmount,
  dateTimeLabel,
  description,
  paidByText,
  splitInfo,
  editLabel,
  deleteLabel,
  deletingLabel,
  viewLabel,
  canEdit,
  isDeleting,
  onEdit,
  onDelete,
  onView,
}: Readonly<ExpenseCardProps>) {
  const showViewAction = Boolean(onView && viewLabel);
  const showEditActions = canEdit;
  const showActionGroup = showViewAction || showEditActions;

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
          </div>
        </div>

      <div className="expense-actions">
        <div className="expense-details-split">{splitInfo}</div>
        {showActionGroup && (
          <div className="expense-action-group">
            {showViewAction && (
              <button
                className="btn btn-sm btn-ghost expense-action-button"
                onClick={onView}
                title={viewLabel}
                aria-label={viewLabel}
              >
                <FontAwesomeIcon icon={faEye} />
                <span className="sr-only">{viewLabel}</span>
              </button>
            )}
            {showEditActions && (
              <>
                <button
                  className="btn btn-sm btn-ghost expense-action-button"
                  onClick={onEdit}
                  disabled={isDeleting}
                  title={editLabel}
                  aria-label={editLabel}
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span className="sr-only">{editLabel}</span>
                </button>
                <button
                  className="btn btn-sm btn-ghost expense-action-button"
                  onClick={onDelete}
                  disabled={isDeleting}
                  title={deleteLabel}
                  aria-label={isDeleting ? deletingLabel : deleteLabel}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span className="sr-only">{isDeleting ? deletingLabel : deleteLabel}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
