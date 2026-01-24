import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

interface RecentGroup {
  id: string;
  name: string;
  token: string;
  permission: 'read' | 'write';
}

interface HomeRecentGroupsProps {
  groups: RecentGroup[];
  loading: boolean;
  onOpen: (groupId: string, token: string) => void;
  onRemove: (groupId: string) => void;
}

export function HomeRecentGroups({ groups, loading, onOpen, onRemove }: HomeRecentGroupsProps) {
  const { t } = useTranslation();

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
        {groups.map((group) => (
          <div key={group.id} className="recent-group-card">
            <div className="recent-group-info">
              <span className="name">{group.name}</span>
              <span className={`badge ${group.permission === 'write' ? 'badge-write' : 'badge-read'}`}>
                {group.permission === 'write' ? t('common.fullAccess') : t('common.viewOnly')}
              </span>
            </div>
            <div className="recent-group-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => onOpen(group.id, group.token)}
                disabled={loading}
              >
                {t('common.open')}
                <FontAwesomeIcon icon={faArrowRight} style={{ marginLeft: '6px', fontSize: '10px' }} />
              </button>
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onRemove(group.id)}
                title={t('common.remove')}
              >
                &times;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
