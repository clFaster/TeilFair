import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEarthEurope } from '@fortawesome/free-solid-svg-icons';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'de', label: 'DE' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  // Handles en-US, de-DE, etc. by matching the base language code.
  const activeIndex = LANGUAGES.findIndex((lang) => i18n.language.startsWith(lang.code));
  const current = LANGUAGES[activeIndex >= 0 ? activeIndex : 0];
  const next = LANGUAGES[(activeIndex >= 0 ? activeIndex : 0) === 0 ? 1 : 0];

  const handleClick = () => {
    // Switching is a plain, single-click toggle so users can flip back and
    // forth instantly without a dropdown having to open/close each time.
    i18n.changeLanguage(next.code);
  };

  return (
    <button
      className="language-switcher-button app-header-icon"
      onClick={handleClick}
      title={t('accessibility.languageSelector')}
      aria-label={t('accessibility.languageSelector')}
    >
      <FontAwesomeIcon icon={faEarthEurope} style={{ fontSize: '16px' }} />
      <span className="language-switcher-label">{current.label}</span>
    </button>
  );
}
