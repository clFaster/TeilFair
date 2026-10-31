import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faLink, faEye, faEdit, faShieldAlt, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { createGroupUrls } from '@teilfair/shared';
import { Modal } from './Modal';

interface ShareModalProps {
  onClose: () => void;
}

interface ShareLinkSectionProps {
  variant: 'read' | 'write';
  icon: IconDefinition;
  label: string;
  badge: string;
  description: string;
  url: string;
  copied: boolean;
  onCopy: () => void;
}

function ShareLinkSection({ variant, icon, label, badge, description, url, copied, onCopy }: Readonly<ShareLinkSectionProps>) {
  const { t } = useTranslation();
  const inputId = useId();

  return (
    <div className={`share-link-section share-link-${variant}`}>
      <div className="share-link-heading">
        <FontAwesomeIcon icon={icon} className="share-link-icon" aria-hidden="true" />
        <label htmlFor={inputId} className="share-link-label">{label}</label>
        <span className={`badge badge-${variant}`}>{badge}</span>
      </div>
      <p className="share-link-description">{description}</p>
      <div className="copy-group">
        <input
          id={inputId}
          type="text"
          className="input copy-input"
          value={url}
          readOnly
          onFocus={(e) => e.target.select()}
        />
        <button type="button" className="btn btn-primary copy-button" onClick={onCopy}>
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
          <span aria-live="polite">{copied ? t('common.copied') : t('common.copy')}</span>
        </button>
      </div>
    </div>
  );
}

export function ShareModal({ onClose }: Readonly<ShareModalProps>) {
  const { t } = useTranslation();
  const { group, permission } = useGroupStore();
  const [copied, setCopied] = useState<'read' | 'write' | null>(null);

  if (!group) return null;

  const baseUrl = globalThis.location.origin;
  const urls = createGroupUrls(baseUrl, group.id, group.readToken, group.writeToken);

  const copyToClipboard = async (url: string, type: 'read' | 'write') => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const canShareWrite = permission === 'write';

  return (
    <Modal
      title={t('share.title')}
      icon={faLink}
      onClose={onClose}
      size="md"
      footer={(
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          {t('common.close')}
        </button>
      )}
    >
      <p className="share-intro">
        {t('share.description', { groupName: group.name })}
      </p>

      <ShareLinkSection
        variant="read"
        icon={faEye}
        label={t('share.viewOnlyLinkLabel')}
        badge={t('share.viewOnlyBadge')}
        description={t('share.viewOnlyDescription')}
        url={urls.readUrl}
        copied={copied === 'read'}
        onCopy={() => copyToClipboard(urls.readUrl, 'read')}
      />

      {canShareWrite && (
        <ShareLinkSection
          variant="write"
          icon={faEdit}
          label={t('share.fullAccessLinkLabel')}
          badge={t('share.fullAccessBadge')}
          description={t('share.fullAccessDescription')}
          url={urls.writeUrl}
          copied={copied === 'write'}
          onCopy={() => copyToClipboard(urls.writeUrl, 'write')}
        />
      )}

      <div className="share-security-note">
        <FontAwesomeIcon icon={faShieldAlt} className="share-security-icon" aria-hidden="true" />
        <p>
          <strong>{t('share.securityNoteTitle')}</strong> {t('share.securityNoteDescription')}
          {canShareWrite && ' ' + t('share.securityWriteWarning')}
        </p>
      </div>
    </Modal>
  );
}
