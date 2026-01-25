import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faClock, faArrowRight, faShare, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import type { RecentGroup } from '@teilfair/shared';

interface HomeRecentGroupsProps {
  groups: RecentGroup[];
  loading: boolean;
  onOpen: (groupId: string, token: string) => void;
  onRemove: (groupId: string) => void;
}

export function HomeRecentGroups({ groups, loading, onOpen, onRemove }: HomeRecentGroupsProps) {
  const { t } = useTranslation();
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  const formatLastAccessed = (lastAccessed: number) => {
    const date = new Date(lastAccessed);
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const handleShare = async (group: RecentGroup) => {
    const shareUrl = `${globalThis.location.origin}/g/${group.id}?t=${group.token}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }

    setCopiedGroupId(group.id);
    setTimeout(() => setCopiedGroupId(null), 2000);
  };


  if (groups.length === 0) {
    return null;
  }

  return (
    <div className="card animate-in animate-delay-1">
      <h2 className="card-title mb-3">
        <FontAwesomeIcon icon={faUsers} style={{ marginRight: '10px', opacity: 0.7 }} />
        {t('home.recentGroupsTitle')}
      </h2>
      <div>
        {groups.map((group) => {
          const isCopied = copiedGroupId === group.id;
          const lastAccessedLabel = formatLastAccessed(group.lastAccessed);

          return (
            <div key={group.id} className="recent-group-card">
              <div className="recent-group-main">
                <div className="recent-group-header">
                  <div className="recent-group-title">
                    <span className="name">{group.name}</span>
                    <span className="badge group-access-badge">
                      {group.permission === 'write' ? t('common.fullAccess') : t('common.viewOnly')}
                    </span>
                  </div>
                </div>
                <div className="recent-group-stats">
                  <div className="recent-group-stat">
                    <FontAwesomeIcon icon={faClock} style={{ opacity: 0.6, fontSize: '12px' }} />
                    <span>{t('common.lastUpdated', { date: lastAccessedLabel })}</span>
                  </div>
                </div>
              </div>
              <div className="recent-group-side">
                <div className="recent-group-actions">
                  <div className="recent-group-action-group">
                    <button
                      className="btn btn-sm btn-ghost expense-action-button"
                      onClick={() => handleShare(group)}
                      title={t('common.share')}
                      aria-label={t('common.share')}
                    >
                      <FontAwesomeIcon icon={isCopied ? faCheck : faShare} />
                    </button>
                    <button
                      className="btn btn-sm btn-ghost expense-action-button"
                      onClick={() => onRemove(group.id)}
                      title={t('common.remove')}
                      aria-label={t('common.remove')}
                      style={{ color: 'var(--color-danger)' }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                  <button
                    className="btn btn-sm btn-primary recent-group-open"
                    onClick={() => onOpen(group.id, group.token)}
                    disabled={loading}
                  >
                    {t('common.open')}
                    <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '6px', fontSize: '10px' }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
