import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faLink, faPlus } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';
import { Avatar } from './Avatar';

interface HomeHeroProps {
  onCreate: () => void;
  onJoin: () => void;
}

/** Illustrative balances for the hero preview (decorative only). */
const PREVIEW = [
  { name: 'Anna', amount: 48.3, tone: 0 },
  { name: 'Ben', amount: -12.4, tone: 1 },
  { name: 'Cleo', amount: -35.9, tone: 2 },
];

export function HomeHero({ onCreate, onJoin }: Readonly<HomeHeroProps>) {
  const { t, i18n } = useTranslation();
  const format = (amount: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'EUR' }).format(Math.abs(amount));

  return (
    <section className="home-hero animate-in">
      <div className="home-hero-copy">
        <h1 className="home-hero-title">{t('home.heroTitle')}</h1>
        <p className="home-hero-subtitle">{t('home.heroSubtitle')}</p>

        <div className="home-hero-actions">
          <button type="button" className="btn hero-btn-primary" onClick={onCreate}>
            <FontAwesomeIcon icon={faPlus} />
            <span>{t('home.createGroup')}</span>
          </button>
          <button type="button" className="btn hero-btn-secondary" onClick={onJoin}>
            <FontAwesomeIcon icon={faLink} />
            <span>{t('home.joinGroup')}</span>
          </button>
        </div>

        <ul className="home-hero-values">
          {(['valueNoAccount', 'valueCurrencies', 'valueSettle'] as const).map((key) => (
            <li key={key}>
              <FontAwesomeIcon icon={faCheck} aria-hidden="true" />
              {t(`home.${key}`)}
            </li>
          ))}
        </ul>
      </div>

      <div className="home-hero-preview" aria-hidden="true">
        {PREVIEW.map((row) => (
          <div key={row.name} className="hero-preview-row">
            <Avatar name={row.name} tone={row.tone} size="sm" />
            <span className="hero-preview-name">{row.name}</span>
            <span className={`hero-preview-amount ${row.amount > 0 ? 'is-positive' : 'is-negative'}`}>
              {row.amount > 0 ? t('balance.getsBack') : t('balance.owes')} {format(row.amount)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
