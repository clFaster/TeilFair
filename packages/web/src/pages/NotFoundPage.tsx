import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCompass, faHome } from '@fortawesome/free-solid-svg-icons';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="app">
      <AppHeader />

      <main className="container status-page">
        <EmptyState
          variant="page"
          titleAs="h1"
          code="404"
          icon={faCompass}
          title={t('notFound.title')}
          description={t('notFound.description')}
          action={(
            <Link to="/" className="btn btn-primary">
              <FontAwesomeIcon icon={faHome} aria-hidden="true" />
              {t('common.goHome')}
            </Link>
          )}
        />
      </main>

      <AppFooter />
    </div>
  );
}
