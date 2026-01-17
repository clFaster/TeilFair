import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en, de, setSharedI18n } from '@teilfair/shared';

// Build resources object explicitly to ensure both languages are included
const resources = {
  en: { translation: en },
  de: { translation: de },
};

// Initialize i18next for React
const i18n = i18next.createInstance();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

// Set as the shared instance so shared library functions can use it
setSharedI18n(i18n);

export default i18n;
