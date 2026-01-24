import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faLink, faEye, faEdit, faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { useGroupStore } from '../store/groupStore';
import { createGroupUrls } from '@teilfair/shared';

interface ShareModalProps {
  onClose: () => void;
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
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    }
  };

  const canShareWrite = permission === 'write';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FontAwesomeIcon icon={faLink} style={{ marginRight: '10px', opacity: 0.7 }} />
            {t('share.title')}
          </h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          <p className="text-muted text-sm mb-4">
            {t('share.description', { groupName: group.name })}
          </p>
          
          {/* View-only Link */}
          <div className="share-link-section share-link-read">
            <div className="flex items-center gap-2 mb-2">
              <FontAwesomeIcon icon={faEye} className="share-link-icon" />
              <label className="share-link-label">{t('share.viewOnlyLinkLabel')}</label>
              <span className="badge badge-read">{t('share.viewOnlyBadge')}</span>
            </div>
            <p className="text-sm mb-3 share-link-description">
              {t('share.viewOnlyDescription')}
            </p>
            <div className="copy-group">
              <input
                type="text"
                className="input copy-input"
                value={urls.readUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className="btn btn-primary"
                onClick={() => copyToClipboard(urls.readUrl, 'read')}
              >
                {copied === 'read' ? (
                  <>
                    <FontAwesomeIcon icon={faCheck} />
                    <span>{t('common.copied')}</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faCopy} />
                    <span>{t('common.copy')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Full Access Link */}
          {canShareWrite && (
            <div className="share-link-section share-link-write">
              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faEdit} className="share-link-icon" />
                <label className="share-link-label">{t('share.fullAccessLinkLabel')}</label>
                <span className="badge badge-write">{t('share.fullAccessBadge')}</span>
              </div>
              <p className="text-sm mb-3 share-link-description">
                {t('share.fullAccessDescription')}
              </p>
              <div className="copy-group">
                <input
                  type="text"
                  className="input copy-input"
                  value={urls.writeUrl}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  className="btn btn-primary"
                  onClick={() => copyToClipboard(urls.writeUrl, 'write')}
                >
                  {copied === 'write' ? (
                    <>
                      <FontAwesomeIcon icon={faCheck} />
                      <span>{t('common.copied')}</span>
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCopy} />
                      <span>{t('common.copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Security Note */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '12px',
            padding: '16px',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)'
          }}>
            <FontAwesomeIcon icon={faShieldAlt} style={{ color: 'var(--color-text-muted)', marginTop: '2px' }} />
            <div className="text-sm text-muted">
              <strong style={{ color: 'var(--color-text-secondary)' }}>{t('share.securityNoteTitle')}</strong> {t('share.securityNoteDescription')}
              {canShareWrite && ' ' + t('share.securityWriteWarning')}
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('common.close')}</button>
        </div>
      </div>
    </div>
  );
}
