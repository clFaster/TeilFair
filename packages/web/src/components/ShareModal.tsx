import { useState } from 'react';
import { useGroupStore } from '../store/groupStore';
import { createGroupUrls } from '@teilfair/shared';

interface ShareModalProps {
  onClose: () => void;
}

export function ShareModal({ onClose }: ShareModalProps) {
  const { group, permission } = useGroupStore();
  const [copied, setCopied] = useState<'read' | 'write' | null>(null);

  if (!group) return null;

  const baseUrl = window.location.origin;
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
          <h2>Share Group</h2>
          <button className="btn btn-icon btn-secondary" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p className="text-muted text-sm mb-4">
            Share these links to invite others to the group. Anyone with the link can access it.
          </p>
          
          <div className="mb-4">
            <label className="font-bold">
              View-only Link
              <span className="badge badge-read ml-2">Read</span>
            </label>
            <p className="text-sm text-muted mb-2">
              Recipients can view expenses and balances but cannot make changes.
            </p>
            <div className="copy-group">
              <input
                type="text"
                className="input copy-input"
                value={urls.readUrl}
                readOnly
              />
              <button
                className="btn btn-primary"
                onClick={() => copyToClipboard(urls.readUrl, 'read')}
              >
                {copied === 'read' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          {canShareWrite && (
            <div className="mb-4">
              <label className="font-bold">
                Edit Link
                <span className="badge badge-write ml-2">Write</span>
              </label>
              <p className="text-sm text-muted mb-2">
                Recipients can add members, create expenses, and edit the group.
              </p>
              <div className="copy-group">
                <input
                  type="text"
                  className="input copy-input"
                  value={urls.writeUrl}
                  readOnly
                />
                <button
                  className="btn btn-primary"
                  onClick={() => copyToClipboard(urls.writeUrl, 'write')}
                >
                  {copied === 'write' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          
          <div className="text-sm text-muted">
            <strong>Security note:</strong> These links never expire. Only share with people you trust.
            {canShareWrite && ' The edit link gives full access to modify the group.'}
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
