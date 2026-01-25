import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faReceipt, faCalculator, faHandshake } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

export function HomeHowItWorks() {
  const { t } = useTranslation();

  return (
    <div className="card animate-in animate-delay-2">
      <h2 className="card-title mb-4">{t('home.howItWorksTitle')}</h2>
      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="feature-content">
            <h4>{t('home.step1Title')}</h4>
            <p>{t('home.step1Description')}</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <FontAwesomeIcon icon={faReceipt} />
          </div>
          <div className="feature-content">
            <h4>{t('home.step2Title')}</h4>
            <p>{t('home.step2Description')}</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <FontAwesomeIcon icon={faCalculator} />
          </div>
          <div className="feature-content">
            <h4>{t('home.step3Title')}</h4>
            <p>{t('home.step3Description')}</p>
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-icon">
            <FontAwesomeIcon icon={faHandshake} />
          </div>
          <div className="feature-content">
            <h4>{t('home.step4Title')}</h4>
            <p>{t('home.step4Description')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
