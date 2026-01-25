import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { LogoIcon } from '../components/LogoIcon';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggleButton } from '../components/ThemeToggleButton';
import { useTheme } from '../theme/ThemeProvider';

export function PrivacyPage() {
  const { t } = useTranslation();
  const { mode, toggleTheme } = useTheme();
  
  return (
    <div className="legal-page">
      <AppHeader
        left={(
          <Link to="/" className="logo">
            <LogoIcon size={32} />
            <span>{t('common.appName')}</span>
          </Link>
        )}
        right={(
          <>
            <LanguageSwitcher />
            <ThemeToggleButton
              mode={mode}
              onToggle={toggleTheme}
              title={t('accessibility.themeToggle', { mode })}
            />
          </>
        )}
      />
      
      <main className="legal-content">
        <h1>Datenschutzerklärung</h1>

        <section>
          <h2>Allgemeines zur Datenverarbeitung</h2>
          <p>
            Beim Besuch dieser Website werden keine personenbezogenen Daten
            aktiv erhoben, gespeichert oder verarbeitet.
          </p>

          <h2>Hosting</h2>
          <p>
            Diese Website wird auf einem externen Server gehostet. Die dabei
            technisch notwendigen Daten (z.B. IP-Adresse, Browsertyp,
            Zugriffszeitpunkt) können vom Hosting-Provider in Server-Log-Dateien
            gespeichert werden. Diese Datenverarbeitung erfolgt auf Grundlage
            berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO) zur
            Sicherstellung des Betriebs und der Sicherheit der Website.
          </p>

          <h2>Google Fonts</h2>
          <p>
            Diese Website verwendet Google Fonts zur Darstellung von
            Schriftarten. Google Fonts ist ein Dienst der Google Ireland Limited
            ("Google"), Gordon House, Barrow Street, Dublin 4, Irland. Beim
            Aufruf dieser Website lädt Ihr Browser die benötigten Web Fonts von
            den Servern von Google. Dabei wird Ihre IP-Adresse an Google
            übertragen. Die Nutzung von Google Fonts erfolgt im Interesse einer
            einheitlichen und ansprechenden Darstellung unserer Website. Dies
            stellt ein berechtigtes Interesse im Sinne von Art. 6 Abs. 1 lit. f
            DSGVO dar. Weitere Informationen zu Google Fonts finden Sie unter
            https://developers.google.com/fonts/faq und in der
            Datenschutzerklärung von Google: https://policies.google.com/privacy
          </p>

          <h2>Cookies und Tracking</h2>
          <p>
            Diese Website verwendet keine Cookies und setzt keine Tracking-Tools
            oder Analysedienste ein. Es erfolgt keine Verfolgung des
            Nutzerverhaltens.
          </p>

          <h2>Externe Links</h2>
          <p>
            Diese Website enthält Links zu externen Websites (z.B. GitHub,
            LinkedIn, Stack Overflow). Beim Klick auf diese Links verlassen Sie
            diese Website. Für die Datenverarbeitung auf den verlinkten Websites
            sind deren Betreiber verantwortlich. Bitte informieren Sie sich dort
            über die jeweiligen Datenschutzbestimmungen.
          </p>

          <h2>Kontaktaufnahme</h2>
          <p>
            Bei Kontaktaufnahme per E-Mail werden die von Ihnen mitgeteilten
            Daten (E-Mail-Adresse, Name, Nachrichteninhalt) zur Bearbeitung
            Ihrer Anfrage gespeichert. Diese Daten werden nicht ohne Ihre
            Einwilligung weitergegeben. Die Verarbeitung erfolgt auf Grundlage
            von Art. 6 Abs. 1 lit. b DSGVO, sofern Ihre Anfrage mit der
            Erfüllung eines Vertrags zusammenhängt oder zur Durchführung
            vorvertraglicher Maßnahmen erforderlich ist. In allen übrigen Fällen
            beruht die Verarbeitung auf Ihrer Einwilligung (Art. 6 Abs. 1 lit. a
            DSGVO) und/oder auf unseren berechtigten Interessen (Art. 6 Abs. 1
            lit. f DSGVO).
          </p>

          <h2>Ihre Rechte</h2>
          <p>
            Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
            Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch
            gemäß den Artikeln 15-21 DSGVO. Zur Ausübung dieser Rechte wenden
            Sie sich bitte an legal@moritzreis.dev. Sie haben außerdem das
            Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
            Verarbeitung Ihrer personenbezogenen Daten zu beschweren.
          </p>

          <h2>Speicherdauer</h2>
          <p>
            Soweit personenbezogene Daten verarbeitet werden, werden diese nur
            so lange gespeichert, wie es für die Erfüllung des jeweiligen Zwecks
            erforderlich ist oder gesetzliche Aufbewahrungsfristen bestehen.
          </p>

          <h2>Änderungen dieser Datenschutzerklärung</h2>
          <p>
            Diese Datenschutzerklärung kann bei Bedarf angepasst werden, um
            rechtlichen Anforderungen oder Änderungen an der Website gerecht zu
            werden.
          </p>
        </section>

        <p className="legal-timestamp">
          Stand: Januar 2026
        </p>
      </main>

      <AppFooter />
    </div>
  );
}
