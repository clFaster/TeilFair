import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleExclamation, faPlus, faSpinner, faUserPlus } from '@fortawesome/free-solid-svg-icons';
import { Modal } from './Modal';
import { useAddMember } from '../hooks/useAddMember';

interface AddMemberModalProps {
  onClose: () => void;
}

/** Phone sheet for adding members; stays open so several can be added in a row. */
export function AddMemberModal({ onClose }: Readonly<AddMemberModalProps>) {
  const { t } = useTranslation();
  const { name, setName, loading, submit, lastAdded, error, inputRef } = useAddMember();
  const formId = useId();
  const inputId = useId();
  const errorId = useId();

  const footer = (
    <>
      <button type="button" className="btn btn-secondary" onClick={onClose}>
        {t('common.done')}
      </button>
      <button
        type="submit"
        form={formId}
        className="btn btn-primary"
        data-testid="member-submit-button"
        disabled={loading || !name.trim()}
      >
        <FontAwesomeIcon icon={loading ? faSpinner : faPlus} spin={loading} aria-hidden="true" />
        <span>{t('member.addMember')}</span>
      </button>
    </>
  );

  return (
    <Modal
      title={t('member.addMemberTitle')}
      icon={faUserPlus}
      onClose={onClose}
      size="sm"
      testId="add-member-dialog"
      initialFocusRef={inputRef}
      footer={footer}
    >
      <form id={formId} className="member-sheet-form" onSubmit={submit} aria-busy={loading || undefined}>
        <div className="input-group">
          <label htmlFor={inputId}>{t('member.nameLabel')}</label>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            className="input"
            data-testid="member-name-input"
            placeholder={t('member.memberNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            readOnly={loading}
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        {error && (
          <div id={errorId} className="form-error member-add-error" role="alert" data-testid="member-form-error">
            <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
            <span>{t(error)}</span>
          </div>
        )}
        {/* Always rendered so screen readers pick up each change */}
        <p className="member-sheet-status" role="status">
          {lastAdded ? t('member.addedStatus', { name: lastAdded }) : ''}
        </p>
      </form>
    </Modal>
  );
}
