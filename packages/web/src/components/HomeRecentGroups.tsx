import { useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faChevronRight, faLink, faTrash } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import type { RecentGroup } from '@teilfair/shared';
import { Avatar } from './Avatar';

interface HomeRecentGroupsProps {
  groups: RecentGroup[];
  loading: boolean;
  onOpen: (groupId: string, token: string) => void;
  onRemove: (groupId: string) => void;
}

const DAY = 24 * 60 * 60 * 1000;

/** "today", "yesterday", "3 days ago", then a short date. */
function formatRelative(timestamp: number, locale: string) {
  const startOfDay = (time: number) => new Date(time).setHours(0, 0, 0, 0);
  const days = Math.round((startOfDay(Date.now()) - startOfDay(timestamp)) / DAY);
  if (days >= 0 && days < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(-days, 'day');
  }
  return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(timestamp);
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('input');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }
}

export function HomeRecentGroups({ groups, loading, onOpen, onRemove }: Readonly<HomeRecentGroupsProps>) {
  const { t, i18n } = useTranslation();
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleShare = async (group: RecentGroup) => {
    await copyText(`${globalThis.location.origin}/g/${group.id}#t=${encodeURIComponent(group.token)}`);
    setCopiedGroupId(group.id);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopiedGroupId(null), 2000);
  };

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="home-section animate-in animate-delay-1" aria-labelledby="recent-groups-title">
      <h2 id="recent-groups-title" className="home-section-title">
        {t('home.recentGroupsTitle')}
        <span className="home-section-count">{groups.length}</span>
      </h2>

      <ul className="recent-list">
        {groups.map((group, index) => {
          const isCopied = copiedGroupId === group.id;
          const canWrite = group.permission === 'write';
          const memberCount = group.memberCount;

          return (
            <li key={group.id} className="recent-card">
              <button
                type="button"
                className="recent-card-open"
                onClick={() => onOpen(group.id, group.token)}
                disabled={loading}
              >
                <Avatar name={group.name} tone={index} />
                <span className="recent-card-body">
                  <span className="recent-card-name line-clamp-2">{group.name}</span>
                  <span className="recent-card-meta">
                    <span className={`access-pill ${canWrite ? 'is-write' : 'is-read'}`}>
                      {canWrite ? t('common.fullAccess') : t('common.viewOnly')}
                    </span>
                    <span>{t('home.lastOpened', { when: formatRelative(group.lastAccessed, i18n.language) })}</span>
                    {memberCount !== undefined && memberCount > 0 && (
                      <span>
                        {t(memberCount === 1 ? 'group.memberCount' : 'group.memberCount_plural', { count: memberCount })}
                      </span>
                    )}
                  </span>
                </span>
                <FontAwesomeIcon icon={faChevronRight} className="recent-card-arrow" aria-hidden="true" />
              </button>

              <div className="recent-card-actions">
                <button
                  type="button"
                  className="icon-action icon-action-primary"
                  onClick={() => handleShare(group)}
                  aria-label={t('home.copyGroupLink', { name: group.name })}
                  title={isCopied ? t('common.copied') : t('common.share')}
                >
                  <FontAwesomeIcon icon={isCopied ? faCheck : faLink} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-action icon-action-danger"
                  onClick={() => onRemove(group.id)}
                  aria-label={t('home.removeRecentGroup', { name: group.name })}
                  title={t('common.remove')}
                >
                  <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="sr-only" aria-live="polite">
        {copiedGroupId ? t('common.copied') : ''}
      </p>
    </section>
  );
}
