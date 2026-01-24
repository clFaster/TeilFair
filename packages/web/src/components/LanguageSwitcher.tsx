import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEarthEurope } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect, useRef } from 'react';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ];

  const handleLanguageChange = async (langCode: string) => {
    await i18n.changeLanguage(langCode);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Check if current language matches the language code (handles en-US, de-DE, etc.)
  const isActiveLanguage = (langCode: string) => {
    return i18n.language.startsWith(langCode);
  };

  return (
    <div className="language-switcher" ref={dropdownRef}>
      <button
        className="language-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        title={t('accessibility.languageSelector')}
        aria-label={t('accessibility.languageSelector')}
        aria-expanded={isOpen}
      >
        <FontAwesomeIcon icon={faEarthEurope} style={{ fontSize: '18px' }} />
      </button>

      {isOpen && (
        <div className="language-switcher-dropdown">
          {languages.map((lang) => (
            <button
              key={lang.code}
              className={`language-option ${isActiveLanguage(lang.code) ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
              aria-current={isActiveLanguage(lang.code) ? 'true' : 'false'}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
