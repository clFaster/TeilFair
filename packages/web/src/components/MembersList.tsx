import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faEdit, faTrash, faCheck, faTimes, faUser } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';

interface MembersListProps {
  canEdit: boolean;
}

export function MembersList({ canEdit }: MembersListProps) {
  const { t } = useTranslation();
  const { members, addMember, updateMember, deleteMember, expenses, memberBalances } = useGroupStore();
  
  const [newMemberName, setNewMemberName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
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

  const handleDeleteMember = async (memberId: string) => {
    const isUsed = expenses.some(
      e => e.payers.some(p => p.memberId === memberId) ||
           e.splits.some(s => s.memberId === memberId)
    );
    
    if (isUsed) {
      alert(t('member.cannotDelete'));
      return;
    }
    
    if (!confirm(t('member.confirmDelete'))) return;
    
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
      {/* Add Member Form */}
      {canEdit && (
        <form onSubmit={handleAddMember} style={{ marginBottom: '24px' }}>
          <div className="flex gap-2">
            <input
              type="text"
              className="input"
              placeholder={t('member.memberNamePlaceholder')}
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !newMemberName.trim()}
              style={{ flexShrink: 0 }}
            >
              <FontAwesomeIcon icon={faUserPlus} style={{ marginRight: '6px' }} />
              {t('member.addMember')}
            </button>
          </div>
        </form>
      )}

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
                style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'var(--color-surface-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  marginBottom: '8px',
                  transition: 'all var(--transition-fast)',
                  animationDelay: `${index * 0.05}s`
                }}
                className="animate-in"
              >
                {/* Avatar */}
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 'var(--font-size-md)',
                  fontFamily: 'var(--font-display)',
                  flexShrink: 0
                }}>
                  {member.name.charAt(0).toUpperCase()}
                </div>

                {/* Member Info / Edit Form */}
                {isEditing ? (
                  <div className="flex gap-2" style={{ flex: 1 }}>
                    <input
                      type="text"
                      className="input"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateMember(member.id);
                        if (e.key === 'Escape') cancelEditing();
                      }}
                    />
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => handleUpdateMember(member.id)}
                      disabled={loading || !editingName.trim()}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={cancelEditing}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{member.name}</div>
                      {formattedBalance && (
                        <div 
                          className={`text-sm ${balance > 0 ? 'balance-positive' : 'balance-negative'}`}
                          style={{ marginTop: '2px' }}
                        >
                          {balance > 0 ? t('balance.getsBack') : t('balance.owes')} {Math.abs(balance).toFixed(2)}
                        </div>
                      )}
                    </div>
                    
                    {canEdit && (
                      <div className="flex gap-1">
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => startEditing(member.id, member.name)}
                          title={t('member.editNameTitle')}
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleDeleteMember(member.id)}
                          title={t('member.deleteTitle')}
                          style={{ color: 'var(--color-danger)' }}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
