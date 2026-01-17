import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { defaultResources, setSharedI18n } from '@teilfair/shared';

// Get device locale
const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';

// Initialize i18next for React Native
const i18n = i18next.createInstance();

i18n
  .use(initReactI18next)
  .init({
    resources: defaultResources,
    lng: deviceLocale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React Native doesn't need escaping
    },
    compatibilityJSON: 'v4', // Required for React Native
  });

// Set as the shared instance so shared library functions can use it
setSharedI18n(i18n);

export default i18n;
