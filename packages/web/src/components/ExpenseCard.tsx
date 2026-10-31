import { useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faTrash, faEye, faUsers } from '@fortawesome/free-solid-svg-icons';
import { Avatar } from './Avatar';

interface ExpenseCardProps {
  formattedAmount: string;
  /** Short time shown on the card; the day lives in the list's date header. */
  timeLabel: string;
  /** ISO timestamp for the `<time>` element. */
  dateTime: string;
  description: string;
  paidByText: string;
  /** First payer, shown as the avatar. */
  payerName: string;
  payerTone: number;
  /** Number of payers beyond the first, shown as a "+n" badge. */
  extraPayers: number;
  splitInfo: string;
  editLabel: string;
  deleteLabel: string;
  deletingLabel: string;
  viewLabel: string;
  canEdit: boolean;
  isDeleting: boolean;
  isSelected?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView?: () => void;
}

export function ExpenseCard({
  formattedAmount,
  timeLabel,
  dateTime,
  description,
  paidByText,
  payerName,
  payerTone,
  extraPayers,
  splitInfo,
  editLabel,
  deleteLabel,
  deletingLabel,
  viewLabel,
  canEdit,
  isDeleting,
  isSelected = false,
  onEdit,
  onDelete,
  onView,
}: Readonly<ExpenseCardProps>) {
  const classes = ['expense-card', isDeleting && 'is-deleting', isSelected && 'is-selected']
    .filter(Boolean)
    .join(' ');
  const deleteText = isDeleting ? deletingLabel : deleteLabel;
  // Actions keep short names ("Edit") and get the expense as their description.
  const descriptionId = useId();

  return (
    <article className={classes} data-testid="expense-card" aria-busy={isDeleting || undefined}>
      <span className="expense-avatar">
        <Avatar name={payerName} tone={payerTone} />
        {extraPayers > 0 && <span className="expense-avatar-more" aria-hidden="true">+{extraPayers}</span>}
      </span>

      <div className="expense-main">
        <h4 className="expense-description line-clamp-2" id={descriptionId}>{description}</h4>
        <p className="expense-meta">
          <span className="expense-payer">{paidByText}</span>
          <span className="expense-meta-sep" aria-hidden="true">·</span>
          <time dateTime={dateTime}>{timeLabel}</time>
        </p>
      </div>

      <div className="expense-amount">{formattedAmount}</div>

      <div className="expense-footer">
        <span className="expense-chip">
          <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
          {splitInfo}
        </span>

        {(onView || canEdit) && (
          <div className="expense-actions">
            {onView && (
              <button
                type="button"
                className="icon-action"
                onClick={onView}
                title={viewLabel}
                aria-label={viewLabel}
                aria-describedby={descriptionId}
              >
                <FontAwesomeIcon icon={faEye} aria-hidden="true" />
              </button>
            )}
            {canEdit && (
              <>
                <button
                  type="button"
                  className="icon-action"
                  onClick={onEdit}
                  disabled={isDeleting}
                  title={editLabel}
                  aria-label={editLabel}
                  aria-describedby={descriptionId}
                >
                  <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-action icon-action-danger"
                  data-testid="expense-delete-button"
                  onClick={onDelete}
                  disabled={isDeleting}
                  title={deleteText}
                  aria-label={deleteText}
                  aria-describedby={descriptionId}
                >
                  <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
