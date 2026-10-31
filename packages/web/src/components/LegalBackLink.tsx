import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

/** Small "back to home" link shown above legal page titles. */
export function LegalBackLink() {
  const { t, i18n } = useTranslation();
  return (
    <Link to="/" className="legal-back" lang={i18n.language}>
      <FontAwesomeIcon icon={faArrowLeft} aria-hidden="true" />
      <span>{t('accessibility.backToHome')}</span>
    </Link>
  );
}
