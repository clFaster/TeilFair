import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import { Modal } from './Modal';

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
 * Built on the shared Modal (portal, Escape, focus trap) and focuses the
 * primary action for keyboard users.
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
  const messageId = useId();

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  const footer = infoOnly ? (
    <button
      ref={primaryButtonRef}
      type="button"
      className="btn btn-primary"
      data-testid="confirm-dialog-ok-button"
      onClick={onClose}
    >
      {t('common.ok')}
    </button>
  ) : (
    <>
      <button
        type="button"
        className="btn btn-secondary"
        data-testid="confirm-dialog-cancel-button"
        onClick={onClose}
      >
        {t('common.cancel')}
      </button>
      <button
        ref={primaryButtonRef}
        type="button"
        className={danger ? 'btn btn-danger' : 'btn btn-primary'}
        data-testid="confirm-dialog-confirm-button"
        onClick={handleConfirm}
      >
        {confirmLabel || t('common.delete')}
      </button>
    </>
  );

  return (
    <Modal
      title={title}
      icon={danger ? faTriangleExclamation : faCircleInfo}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      describedBy={messageId}
      testId="confirm-dialog"
      initialFocusRef={primaryButtonRef}
      className={danger ? 'confirm-dialog confirm-dialog-danger' : 'confirm-dialog'}
      footer={footer}
    >
      <p id={messageId} className="confirm-dialog-message">{message}</p>
    </Modal>
  );
}
