import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faReceipt, faCalculator, faHandshake } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

const STEPS = [
  { icon: faUsers, key: 'step1' },
  { icon: faReceipt, key: 'step2' },
  { icon: faCalculator, key: 'step3' },
  { icon: faHandshake, key: 'step4' },
] as const;

export function HomeHowItWorks() {
  const { t } = useTranslation();

  return (
    <section className="home-section animate-in animate-delay-2" aria-labelledby="how-it-works-title">
      <h2 id="how-it-works-title" className="home-section-title">{t('home.howItWorksTitle')}</h2>
      <ol className="steps">
        {STEPS.map(({ icon, key }, index) => (
          <li key={key} className="step">
            <span className="step-icon" aria-hidden="true">
              <FontAwesomeIcon icon={icon} />
              <span className="step-number">{index + 1}</span>
            </span>
            <div>
              <h3 className="step-title">{t(`home.${key}Title`)}</h3>
              <p className="step-text">{t(`home.${key}Description`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
