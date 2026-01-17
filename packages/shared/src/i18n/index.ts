import i18next from 'i18next';
import type { i18n as I18nInstance, TFunction } from 'i18next';
import enTranslations from './locales/en';
import deTranslations from './locales/de';

export type TranslationKey = keyof typeof enTranslations;

// Export translations as named exports
export const en = enTranslations;
export const de = deTranslations;

// Default language resources (English + German)
export const defaultResources = {
  en: { translation: enTranslations },
  de: { translation: deTranslations },
} as const;

export type SupportedLanguage = keyof typeof defaultResources;

/**
 * Create a shared i18next instance
 * Platforms can initialize with additional plugins (e.g., language detector)
 */
export function createI18n(options?: {
  lng?: string;
  fallbackLng?: string;
  resources?: typeof defaultResources;
}): I18nInstance {
  const instance = i18next.createInstance();
  instance.init({
    lng: options?.lng ?? 'en',
    fallbackLng: options?.fallbackLng ?? 'en',
    resources: options?.resources ?? defaultResources,
    interpolation: {
      escapeValue: false, // React/React Native already escape values
    },
    returnNull: false,
    returnEmptyString: false,
  });
  return instance;
}

// Create a default instance for simple usage
let sharedInstance: I18nInstance | null = null;

export function getSharedI18n(): I18nInstance {
  if (!sharedInstance) {
    sharedInstance = createI18n();
  }
  return sharedInstance;
}

export function setSharedI18n(instance: I18nInstance): void {
  sharedInstance = instance;
}

/**
 * Get the translation function from the shared instance
 */
export function getT(): TFunction {
  return getSharedI18n().t;
}

/**
 * Translate a key using the shared instance
 */
export function t(key: string, options?: Record<string, unknown>): string {
  return getSharedI18n().t(key, options);
}

/**
 * Change the language of the shared instance
 */
export async function changeLanguage(lng: string): Promise<void> {
  await getSharedI18n().changeLanguage(lng);
}

/**
 * Get the current language
 */
export function getCurrentLanguage(): string {
  return getSharedI18n().language;
}

// Export i18next for advanced usage
export { i18next };
export type { I18nInstance, TFunction };
