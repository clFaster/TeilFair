import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faPen, faTrash, faCheck, faXmark, faUserGroup, faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { ConfirmDialog } from './ConfirmDialog';
import { Avatar } from './Avatar';
import { EmptyState } from './EmptyState';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { useAddMember } from '../hooks/useAddMember';

interface MembersListProps {
  canEdit: boolean;
}

export function MembersListForm({ canEdit }: Readonly<MembersListProps>) {
  const { t } = useTranslation();
  const {
    name: newMemberName,
    setName: setNewMemberName,
    loading,
    submit: handleAddMember,
    error,
    inputRef,
  } = useAddMember();
  const inputId = useId();
  const errorId = useId();

  if (!canEdit) {
    return null;
  }

  return (
    <>
      <form onSubmit={handleAddMember} className="member-add" aria-busy={loading || undefined}>
        <label htmlFor={inputId} className="sr-only">{t('member.addMemberLabel')}</label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          className="input member-add-input"
          data-testid="member-name-input"
          placeholder={t('member.memberNamePlaceholder')}
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
          readOnly={loading}
          autoComplete="off"
          enterKeyHint="done"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <button
          type="submit"
          className="btn btn-primary member-add-button"
          data-testid="member-submit-button"
          disabled={loading || !newMemberName.trim()}
        >
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          <span>{t('member.addMember')}</span>
        </button>
      </form>
      {error && (
        <div id={errorId} className="form-error member-add-error" role="alert" data-testid="member-form-error">
          <FontAwesomeIcon icon={faCircleExclamation} aria-hidden="true" />
          <span>{t(error)}</span>
        </div>
      )}
    </>
  );
}

export function MembersList({ canEdit }: Readonly<MembersListProps>) {
  const { t } = useTranslation();
  const { members, group, updateMember, deleteMember, expenses, memberBalances } = useGroupStore();
  // Phones add members through the FAB sheet instead of the inline form.
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [inUseNotice, setInUseNotice] = useState(false);
  const idPrefix = useId();
  const editButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnFocusTo = useRef<string | null>(null);

  // The edit button unmounts while editing; give focus back once it is rendered again.
  useEffect(() => {
    if (editingId !== null || !returnFocusTo.current) return;
    editButtons.current.get(returnFocusTo.current)?.focus();
    returnFocusTo.current = null;
  }, [editingId]);

  const finishEditing = () => {
    returnFocusTo.current = editingId;
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdateMember = async (memberId: string) => {
    if (!editingName.trim() || loading) return;

    setLoading(true);
    try {
      await updateMember(memberId, editingName.trim());
      finishEditing();
    } finally {
      setLoading(false);
    }
  };

  const requestDeleteMember = (memberId: string, name: string) => {
    const isUsed = expenses.some(
      e => e.payers.some(p => p.memberId === memberId) ||
           e.splits.some(s => s.memberId === memberId)
    );

    if (isUsed) {
      setInUseNotice(true);
      return;
    }

    setPendingDelete({ id: memberId, name });
  };

  const handleDeleteMember = async (memberId: string) => {
    setLoading(true);
    try {
      await deleteMember(memberId);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (memberId: string, name: string) => {
    setEditingId(memberId);
    setEditingName(name);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: group?.currency || 'EUR',
    }).format(amount);
  };

  const renderBalance = (memberId: string) => {
    const balance = memberBalances.find(b => b.memberId === memberId);
    if (!balance) return null;

    const amount = balance.netBalance;
    if (Math.abs(amount) < 0.01) {
      return <span className="member-card-balance is-zero">{t('balance.settled')}</span>;
    }

    const isPositive = amount > 0;
    return (
      <span className={`member-card-balance ${isPositive ? 'is-positive' : 'is-negative'}`}>
        {isPositive ? t('balance.getsBack') : t('balance.owes')}{' '}
        <span className="member-card-amount">{formatCurrency(Math.abs(amount))}</span>
      </span>
    );
  };

  if (members.length === 0) {
    return (
      <EmptyState
        icon={faUserGroup}
        titleAs="h3"
        title={t('member.emptyTitle')}
        description={canEdit
          ? t(isDesktop ? 'member.emptyDescriptionWithWrite' : 'member.emptyDescriptionFab')
          : undefined}
      />
    );
  }

  return (
    <>
      <ul className="member-list">
        {members.map((member, index) => {
          const isEditing = editingId === member.id;
          const nameId = `${idPrefix}-name-${member.id}`;
          const inputId = `${idPrefix}-edit-${member.id}`;

          return (
            <li
              key={member.id}
              className={`member-card${isEditing ? ' is-editing' : ''}`}
              data-testid="member-card"
            >
              <Avatar name={member.name} tone={index} size="lg" />

              {isEditing ? (
                <form
                  className="member-card-edit"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateMember(member.id);
                  }}
                >
                  <label htmlFor={inputId} className="sr-only">{t('member.editNameTitle')}</label>
                  <input
                    id={inputId}
                    type="text"
                    className="input member-card-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    autoFocus
                    autoComplete="off"
                    enterKeyHint="done"
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation();
                        finishEditing();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    className="icon-action icon-action-primary"
                    disabled={loading || !editingName.trim()}
                    title={t('common.save')}
                    aria-label={t('common.save')}
                  >
                    <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="icon-action"
                    onClick={finishEditing}
                    title={t('common.cancel')}
                    aria-label={t('common.cancel')}
                  >
                    <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                  </button>
                </form>
              ) : (
                <>
                  <span className="member-card-body">
                    <span className="member-card-name" id={nameId}>{member.name}</span>
                    {renderBalance(member.id)}
                  </span>

                  {canEdit && (
                    <span className="member-card-actions">
                      <button
                        type="button"
                        ref={(node) => {
                          if (node) editButtons.current.set(member.id, node);
                          else editButtons.current.delete(member.id);
                        }}
                        className="icon-action"
                        onClick={() => startEditing(member.id, member.name)}
                        title={t('member.editNameTitle')}
                        aria-label={t('member.editNameTitle')}
                        aria-describedby={nameId}
                      >
                        <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="icon-action icon-action-danger"
                        data-testid="member-delete-button"
                        onClick={() => requestDeleteMember(member.id, member.name)}
                        title={t('member.deleteTitle')}
                        aria-label={t('member.deleteTitle')}
                        aria-describedby={nameId}
                      >
                        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                      </button>
                    </span>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      {pendingDelete && (
        <ConfirmDialog
          title={t('member.confirmDeleteTitle')}
          message={t('member.confirmDeleteNamed', { name: pendingDelete.name })}
          danger
          confirmLabel={t('common.delete')}
          onConfirm={() => handleDeleteMember(pendingDelete.id)}
          onClose={() => setPendingDelete(null)}
        />
      )}

      {inUseNotice && (
        <ConfirmDialog
          title={t('member.cannotDeleteTitle')}
          message={t('member.cannotDelete')}
          infoOnly
          onClose={() => setInUseNotice(false)}
        />
      )}
    </>
  );
}
