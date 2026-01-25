import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <span style={{ opacity: 0.7 }}>{t('common.appName')}</span>
      <span className="footer-separator">&middot;</span>
      {t('common.tagline')}
      <span className="footer-separator">&middot;</span>
      <Link to="/privacy" className="footer-link">
        {t('footer.privacy')}
      </Link>
      <span className="footer-separator">&middot;</span>
      <Link to="/imprint" className="footer-link">
        {t('footer.imprint')}
      </Link>
    </footer>
  );
}
