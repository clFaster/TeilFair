import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  title: string;
  message: string;
  /** When true, only shows a single acknowledgement button (like a native alert). */
  infoOnly?: boolean;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

/**
 * Styled replacement for native `window.confirm` / `window.alert`.
 * Traps Escape-to-close and focuses the primary action for keyboard users.
 */
export function ConfirmDialog({
  title,
  message,
  infoOnly = false,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: Readonly<ConfirmDialogProps>) {
  const { t } = useTranslation();
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    primaryButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return createPortal(
    <div className="modal-overlay" data-testid="confirm-dialog" onClick={onClose}>
      <div
        className="modal confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="confirm-dialog-title">{title}</h2>
          <button className="btn-close" onClick={onClose} aria-label={t('common.close')}>
            &times;
          </button>
        </div>
        <div className="modal-body">
          <p id="confirm-dialog-message">{message}</p>
        </div>
        <div className="modal-footer">
          {infoOnly ? (
            <button
              ref={primaryButtonRef}
              className="btn btn-primary"
              data-testid="confirm-dialog-ok-button"
              onClick={onClose}
            >
              {t('common.ok')}
            </button>
          ) : (
            <>
              <button
                className="btn btn-secondary"
                data-testid="confirm-dialog-cancel-button"
                onClick={onClose}
              >
                {t('common.cancel')}
              </button>
              <button
                ref={primaryButtonRef}
                className={danger ? 'btn btn-danger' : 'btn btn-primary'}
                data-testid="confirm-dialog-confirm-button"
                onClick={handleConfirm}
              >
                {confirmLabel || t('common.delete')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
