import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { LogoIcon } from '../components/LogoIcon';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../theme/ThemeProvider';

export function ImprintPage() {
  const { t } = useTranslation();
  const { mode, toggleTheme } = useTheme();
  
  return (
    <div className="legal-page">
      <AppHeader
        left={
          <Link to="/" className="logo">
            <LogoIcon size={32} />
            <span>{t("common.appName")}</span>
          </Link>
        }
        right={
          <>
            <LanguageSwitcher />
            <ThemeToggleButton
              mode={mode}
              onToggle={toggleTheme}
              title={t("accessibility.themeToggle", { mode })}
            />
          </>
        }
      />

      <main className="legal-content">
        <h1>Impressum</h1>

        <section>
          <h2>Angaben gemäß § 25 Mediengesetz</h2>
          <p>
            TeilFair
            <br />
            Moritz Reis
            <br />
            Wien, Österreich
          </p>

          <h2>Kontakt</h2>
          <p>E-Mail: legal@moritzreis.dev</p>

          <h2>Haftungsausschluss</h2>
          <p>
            Trotz sorgfältiger inhaltlicher Kontrolle übernehme ich keine
            Haftung für die Inhalte externer Links. Für den Inhalt der
            verlinkten Seiten sind ausschließlich deren Betreiber
            verantwortlich.
          </p>

          <h2>Hinweis</h2>
          <p>
            Dieses Impressum gilt für diese Website: teilfair.moritzreis.dev
          </p>
          <p>Bei dieser Seite handelt es sich um ein persönliches Projekt.</p>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
