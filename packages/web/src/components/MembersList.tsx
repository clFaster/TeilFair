import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEdit, faTrash, faCheck, faTimes, faUser } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { ConfirmDialog } from './ConfirmDialog';

interface MembersListProps {
  canEdit: boolean;
}

export function MembersListForm({ canEdit }: Readonly<MembersListProps>) {
  const { t } = useTranslation();
  const { addMember } = useGroupStore();
  const [newMemberName, setNewMemberName] = useState('');
  const [loading, setLoading] = useState(false);
 
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || loading) return;
    
    setLoading(true);
    try {
      await addMember(newMemberName.trim());
      setNewMemberName('');
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <form onSubmit={handleAddMember} style={{ marginBottom: '24px' }}>
      <div className="flex gap-2 action-row">
        <input
          type="text"
          className="input action-input"
          data-testid="member-name-input"
          placeholder={t('member.memberNamePlaceholder')}
          value={newMemberName}
          onChange={(e) => setNewMemberName(e.target.value)}
          disabled={loading}
        />
        <button 
          type="submit" 
          className="btn btn-primary action-button" 
          data-testid="member-submit-button"
          disabled={loading || !newMemberName.trim()}
          style={{ flexShrink: 0 }}
        >
          <FontAwesomeIcon icon={faUserPlus} style={{ marginRight: '6px' }} />
          {t('member.addMember')}
        </button>
      </div>
    </form>
  );
}

export function MembersList({ canEdit }: Readonly<MembersListProps>) {
  const { t } = useTranslation();
  const { members, updateMember, deleteMember, expenses, memberBalances } = useGroupStore();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [inUseNotice, setInUseNotice] = useState(false);

  const handleUpdateMember = async (memberId: string) => {
    if (!editingName.trim() || loading) return;
    
    setLoading(true);
    try {
      await updateMember(memberId, editingName.trim());
      setEditingId(null);
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

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const getMemberBalance = (memberId: string) => {
    const balance = memberBalances.find(b => b.memberId === memberId);
    return balance?.netBalance || 0;
  };

  const formatBalance = (balance: number) => {
    if (Math.abs(balance) < 0.01) return null;
    const sign = balance > 0 ? '+' : '';
    return `${sign}${balance.toFixed(2)}`;
  };

  return (
    <div>
      {/* Members List */}
      {members.length === 0 ? (
        <div className="empty-state">
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'var(--color-surface)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            margin: '0 auto 16px',
            fontSize: '24px',
            color: 'var(--color-text-muted)'
          }}>
            <FontAwesomeIcon icon={faUser} />
          </div>
          <p>{t('member.emptyTitle')}</p>
          {canEdit && <p className="text-sm">{t('member.emptyDescriptionWithWrite')}</p>}
        </div>
      ) : (
        <div>
          {members.map((member, index) => {
            const balance = getMemberBalance(member.id);
            const formattedBalance = formatBalance(balance);
            const isEditing = editingId === member.id;

            return (
              <div
                key={member.id}
                style={{ animationDelay: `${index * 0.05}s` }}
                className="animate-in member-card"
                data-testid="member-card"
              >
                {/* Avatar */}
                <div className="member-card-avatar">
                  {member.name.charAt(0).toUpperCase()}
                </div>

                <div className="member-card-body">
                  {isEditing ? (
                    <input
                      type="text"
                      className="input action-input member-card-input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateMember(member.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                  ) : (
                    <>
                      <div style={{ fontWeight: 500 }}>{member.name}</div>
                      {formattedBalance && (
                        <div
                          className={`text-sm ${balance > 0 ? 'balance-positive' : 'balance-negative'}`}
                          style={{ marginTop: '2px' }}
                        >
                          {balance > 0 ? t('balance.getsBack') : t('balance.owes')} {Math.abs(balance).toFixed(2)}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {canEdit && (
                  <div className="member-card-actions">
                    {isEditing ? (
                      <>
                        <button
                          className="btn btn-sm btn-ghost member-card-action"
                          onClick={() => handleUpdateMember(member.id)}
                          disabled={loading || !editingName.trim()}
                          title={t('common.save')}
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost member-card-action"
                          onClick={cancelEditing}
                          title={t('common.cancel')}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-ghost member-card-action"
                          onClick={() => startEditing(member.id, member.name)}
                          title={t('member.editNameTitle')}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost member-card-action"
                          data-testid="member-delete-button"
                          onClick={() => requestDeleteMember(member.id, member.name)}
                          title={t('member.deleteTitle')}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}
