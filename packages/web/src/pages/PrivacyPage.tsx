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
          <h2>Verantwortlicher</h2>
          <p>
            Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:
            <br />
            Moritz Reis (TeilFair)
            <br />
            Wien, Österreich
            <br />
            E-Mail: legal@moritzreis.dev
          </p>

          <h2>Allgemeines zur Datenverarbeitung</h2>
          <p>
            Diese Website ist eine Web-Anwendung zur gemeinsamen Aufteilung von Ausgaben.
            Dabei werden je nach Nutzung unterschiedliche Daten verarbeitet: Beim reinen
            Seitenaufruf fallen technische Zugriffsdaten an; bei Nutzung der App werden
            Inhalte verarbeitet, die Sie selbst eingeben (z.B. Gruppen- und Ausgabendaten).
          </p>

          <h2>Hosting (Vercel)</h2>
          <p>
            Diese Website wird bei Vercel gehostet. Beim Aufruf der Website werden
            technisch notwendige Daten verarbeitet (z.B. IP-Adresse, Zeitpunkt des
            Zugriffs, angeforderte URL, User-Agent, Referrer, Fehler-/Statuscodes),
            die in Server-Log-Dateien anfallen können. Die Verarbeitung erfolgt zur
            Bereitstellung, Stabilität und Sicherheit der Website auf Grundlage
            berechtigter Interessen (Art. 6 Abs. 1 lit. f DSGVO).
            Anbieter: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.
          </p>

          <h2>Vercel Analytics</h2>
          <p>
            Diese Website nutzt Vercel Analytics, um die Nutzung der Website in
            aggregierter Form auszuwerten und das Angebot zu verbessern.
            Nach Angaben von Vercel erfolgt dies ohne den Einsatz von Cookies.
            Dabei können u.a. Informationen wie Seitenaufrufe, aufgerufene Seiten,
            ungefähre Standort-/Länderinformationen, Geräte-/Browserinformationen
            sowie technische Metadaten verarbeitet werden. Rechtsgrundlage ist
            Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Reichweitenmessung
            und Optimierung).
            Weitere Informationen: https://vercel.com/docs/analytics/privacy-policy
          </p>

          <h2>Vercel Speed Insights</h2>
          <p>
            Diese Website nutzt Vercel Speed Insights zur Messung von Performance-
            Kennzahlen (z.B. Web Vitals), um Ladezeiten und Stabilität der Website
            zu verbessern. Nach Angaben von Vercel erfolgt dies ohne den Einsatz von
            Cookies. Dabei können technische Daten (z.B. Performance-Metriken,
            Browser-/Geräteinformationen, aufgerufene Seite) verarbeitet werden.
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
            Weitere Informationen: https://vercel.com/docs/speed-insights/privacy-policy
          </p>

          <h2>App-Nutzung / Daten in Supabase (EU)</h2>
          <p>
            Wenn Sie die App nutzen (z.B. eine Gruppe erstellen oder einem
            Gruppenlink folgen), werden die von Ihnen eingegebenen Inhalte in einer
            Datenbank bei Supabase gespeichert (Projekt in einer EU-Region).
            Dies umfasst insbesondere:
          </p>
          <ul>
            <li>Gruppendaten (Name, Währung, Zeitpunkte)</li>
            <li>Mitglieder (von Ihnen vergebene Namen)</li>
            <li>Ausgaben (Beschreibung, Betrag, Datum) inkl. Zahler/Splits</li>
            <li>Zugriffstoken (Lese-/Schreibtoken) zur Berechtigung</li>
          </ul>
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Bereitstellung der
            von Ihnen angeforderten Funktionalität) sowie ggf. Art. 6 Abs. 1 lit. f
            DSGVO (Betrieb und Sicherheit).
            Anbieter: Supabase, Inc. (weitere Informationen: https://supabase.com/privacy).
          </p>

          <h2>Zugriff über Token-Links</h2>
          <p>
            TeilFair arbeitet ohne Benutzerkonten. Der Zugriff erfolgt über
            Links mit Token (Parameter <code>t</code>), die Lese- oder Schreibrechte
            verbriefen. Bitte behandeln Sie diese Links wie ein Passwort und teilen
            Sie sie nur mit Personen, denen Sie Zugriff geben möchten.
          </p>

          <h2>Lokale Speicherung im Browser (Local Storage)</h2>
          <p>
            Für Komfortfunktionen speichert die Website bestimmte Einstellungen
            lokal in Ihrem Browser (Local Storage). Dazu gehören insbesondere:
          </p>
          <ul>
            <li>Sprachwahl (i18next)</li>
            <li>Theme-Präferenz (hell/dunkel)</li>
            <li>Zuletzt geöffnete Gruppen inkl. Gruppen-ID und Zugriffstoken</li>
          </ul>
          <p>
            Diese Daten verbleiben auf Ihrem Endgerät und können jederzeit über
            die Browser-Einstellungen gelöscht werden. Rechtsgrundlage ist
            Art. 6 Abs. 1 lit. f DSGVO (benutzerfreundliche Bereitstellung der App).
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

          <h2>Cookies</h2>
          <p>
            Diese Website setzt keine Marketing-Cookies ein. In der hier verwendeten
            Konfiguration setzen Vercel Analytics und Vercel Speed Insights nach Angaben
            von Vercel keine Cookies.
          </p>

          <h2>Datenübermittlung in Drittländer</h2>
          <p>
            Durch den Einsatz von Vercel (Hosting/Analytics/Speed Insights) sowie Google
            Fonts kann eine Verarbeitung von Daten außerhalb der EU/des EWR (insbesondere
            in den USA) nicht ausgeschlossen werden. Dabei können geeignete Garantien
            (z.B. EU-Standardvertragsklauseln) eingesetzt werden. Supabase wird für diese
            Website mit einer EU-Region genutzt.
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
            Zugriffsdaten (Server-Logs) werden nur so lange gespeichert, wie es für
            Betrieb und Sicherheit erforderlich ist.
            Inhalte, die Sie in TeilFair erfassen (Gruppen, Mitglieder, Ausgaben),
            bleiben gespeichert, bis sie innerhalb der App gelöscht werden oder Sie
            eine Löschung anfordern. Lokale Speicherungen (Local Storage) bleiben
            bestehen, bis Sie diese in Ihrem Browser löschen.
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
