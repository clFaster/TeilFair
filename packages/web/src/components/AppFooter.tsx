import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <p className="footer-brand">
          <span className="footer-name">{t('common.appName')}</span>
          <span className="footer-separator" aria-hidden="true">&middot;</span>
          <span className="footer-tagline">{t('common.tagline')}</span>
        </p>
        <nav className="footer-nav">
          <Link to="/privacy" className="footer-link">
            {t('footer.privacy')}
          </Link>
          <Link to="/imprint" className="footer-link">
            {t('footer.imprint')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
