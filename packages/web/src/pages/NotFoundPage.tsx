import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faHome } from '@fortawesome/free-solid-svg-icons';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="app">
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <div className="card text-center" style={{ maxWidth: '400px' }}>
          <FontAwesomeIcon
            icon={faExclamationTriangle}
            style={{ fontSize: '48px', color: 'var(--color-text-muted)', marginBottom: '16px' }}
          />
          <h2 style={{ marginBottom: '8px' }}>{t('notFound.title')}</h2>
          <p className="text-secondary mb-4">{t('notFound.description')}</p>
          <Link to="/" className="btn btn-primary">
            <FontAwesomeIcon icon={faHome} style={{ marginRight: '8px' }} />
            {t('common.goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
