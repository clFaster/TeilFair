import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faPen, faReceipt, faShare, faTrash, faUsers } from '@fortawesome/free-solid-svg-icons';

interface GroupHeaderProps {
  name: string;
  expenseCount: number;
  memberCount: number;
  canWrite: boolean;
  /** Pre-formatted total, e.g. "€141.60". */
  total: string;
  onShare: () => void;
  onDelete?: () => void;
}

/** Group hero: name + share, meta chips (counts, access) and the running total. */
export function GroupHeader({ name, expenseCount, memberCount, canWrite, total, onShare, onDelete }: Readonly<GroupHeaderProps>) {
  const { t } = useTranslation();

  return (
    <header className="group-hero">
      <div className="group-hero-main">
        <div className="group-title-row">
          <h1 className="group-title line-clamp-2" title={name}>{name}</h1>
          <button
            type="button"
            className="group-share-button"
            onClick={onShare}
            title={t('common.share')}
            aria-label={t('common.share')}
          >
            <FontAwesomeIcon icon={faShare} aria-hidden="true" />
          </button>
          {onDelete && (
            <button
              type="button"
              className="group-share-button group-delete-button"
              onClick={onDelete}
              title={t('group.deleteGroup')}
              aria-label={t('group.deleteGroup')}
            >
              <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
            </button>
          )}
        </div>
        <ul className="group-chips">
          <li className="group-chip">
            <FontAwesomeIcon icon={faReceipt} aria-hidden="true" />
            {t(expenseCount === 1 ? 'group.expenseCount' : 'group.expenseCount_plural', { count: expenseCount })}
          </li>
          <li className="group-chip">
            <FontAwesomeIcon icon={faUsers} aria-hidden="true" />
            {t(memberCount === 1 ? 'group.memberCount' : 'group.memberCount_plural', { count: memberCount })}
          </li>
          <li className={`group-chip group-chip-access ${canWrite ? 'is-write' : 'is-read'}`}>
            <FontAwesomeIcon icon={canWrite ? faPen : faEye} aria-hidden="true" />
            {canWrite ? t('common.fullAccess') : t('common.viewOnly')}
          </li>
        </ul>
      </div>
      <div className="group-hero-total">
        <span className="group-total-label">{t('common.total')}</span>
        <span className="group-total-value" data-testid="group-total">{total}</span>
      </div>
    </header>
  );
}
