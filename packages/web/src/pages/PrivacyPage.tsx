import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { LegalBackLink } from '../components/LegalBackLink';
import { privacyDe } from './legal/privacy.de';
import { privacyEn } from './legal/privacy.en';

export function PrivacyPage() {
  const { i18n, t } = useTranslation();
  const isGerman = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('de');
  const language = isGerman ? 'de' : 'en';
  const document = isGerman ? privacyDe : privacyEn;

  return (
    <div className="app">
      <AppHeader />

      <main className="legal-content" lang={language}>
        <LegalBackLink />
        <h1>{document.title}</h1>
        <p className="privacy-summary">{document.summary}</p>
        {!isGerman && <p>{t('legal.germanVersionBinding')}</p>}

        <nav className="privacy-toc" aria-label={t('legal.contents')}>
          <h2 className="privacy-toc-title">{t('legal.contents')}</h2>
          <ol>
            {document.sections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
          </ol>
        </nav>

        {document.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-heading`}>
            <h2 id={`${section.id}-heading`}>{section.title}</h2>
            {section.content}
          </section>
        ))}

        <p className="legal-timestamp">{t('legal.lastUpdated', { date: document.lastUpdated })}</p>
      </main>

      <AppFooter />
    </div>
  );
}
