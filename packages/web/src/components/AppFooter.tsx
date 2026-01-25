import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <span style={{ opacity: 0.7 }}>{t('common.appName')}</span> &middot; {t('common.tagline')}
      <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>&middot;</span>
      <Link to="/privacy" style={{ opacity: 0.7, textDecoration: 'none' }}>
        {t('footer.privacy')}
      </Link>
      <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>&middot;</span>
      <Link to="/imprint" style={{ opacity: 0.7, textDecoration: 'none' }}>
        {t('footer.imprint')}
      </Link>
    </footer>
  );
}
