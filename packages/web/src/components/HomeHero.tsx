import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faLink } from '@fortawesome/free-solid-svg-icons';
import { useTranslation } from 'react-i18next';

interface HomeHeroProps {
  onCreate: () => void;
  onJoin: () => void;
}

export function HomeHero({ onCreate, onJoin }: Readonly<HomeHeroProps>) {
  const { t } = useTranslation();

  return (
    <div className="hero-card animate-in">
      <h1
        style={{
          fontSize: 'clamp(2rem, 5vw, 2.75rem)',
          fontWeight: 700,
          marginBottom: '12px',
          letterSpacing: '-0.03em',
          whiteSpace: 'pre-line',
        }}
      >
        {t('home.heroTitle')}
      </h1>
      <p
        style={{
          fontSize: '1.125rem',
          opacity: 0.9,
          marginBottom: '28px',
          maxWidth: '380px',
          margin: '0 auto 28px',
          lineHeight: 1.6,
        }}
      >
        {t('home.heroSubtitle')}
      </p>

      <div className="flex gap-3 justify-center flex-wrap">
        <button className="btn hero-btn-primary" onClick={onCreate}>
          <FontAwesomeIcon icon={faPlus} />
          <span>{t('home.createGroup')}</span>
        </button>
        <button className="btn hero-btn-secondary" onClick={onJoin}>
          <FontAwesomeIcon icon={faLink} />
          <span>{t('home.joinGroup')}</span>
        </button>
      </div>
    </div>
  );
}
