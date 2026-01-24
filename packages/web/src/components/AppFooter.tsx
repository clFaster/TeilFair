import { useTranslation } from 'react-i18next';

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <span style={{ opacity: 0.7 }}>{t('common.appName')}</span> &middot; {t('common.tagline')}
    </footer>
  );
}
