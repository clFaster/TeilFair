import type { LegalDocument } from './types';

export const privacyDe: LegalDocument = {
  title: 'Datenschutzerklärung',
  summary: 'Keine Benutzerkonten und keine Cookies. Gruppendaten werden in der EU gespeichert und sind über den geteilten Gruppenlink zugänglich.',
  lastUpdated: 'November 2026',
  sections: [
    {
      id: 'verantwortlicher',
      title: 'Verantwortlicher',
      content: (
        <p>
          Verantwortlich für die Verarbeitung personenbezogener Daten ist Moritz Reis (TeilFair), Wien, Österreich.
          E-Mail: <a href="mailto:legal@moritzreis.dev">legal@moritzreis.dev</a>.
        </p>
      ),
    },
    {
      id: 'allgemeines',
      title: 'Allgemeines zur Datenverarbeitung',
      content: (
        <p>
          TeilFair ist eine Web-Anwendung zur gemeinsamen Aufteilung von Ausgaben. Die App benötigt kein Benutzerkonto.
          Beim Seitenaufruf werden technische Zugriffsdaten verarbeitet; bei der Nutzung verarbeiten wir die von Ihnen
          eingegebenen Gruppen-, Mitglieder- und Ausgabendaten.
        </p>
      ),
    },
    {
      id: 'hosting',
      title: 'Hosting und Auftragsverarbeiter',
      content: (
        <>
          <p>
            Die Website wird von Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA gehostet. Dabei können
            insbesondere IP-Adresse, Zeitpunkt und angeforderte URL, User-Agent, Referrer sowie Fehler- und Statuscodes
            in technischen Server-Logs verarbeitet werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Bereitstellung,
            Stabilität und Sicherheit der Website).
          </p>
          <p>
            Vercel und Supabase verarbeiten Daten als Auftragsverarbeiter auf Grundlage von Auftragsverarbeitungsverträgen
            gemäß Art. 28 DSGVO. Informationen: <a href="https://vercel.com/legal/dpa" target="_blank" rel="noopener noreferrer">Vercel DPA</a> und{' '}
            <a href="https://supabase.com/legal/dpa" target="_blank" rel="noopener noreferrer">Supabase DPA</a>.
          </p>
        </>
      ),
    },
    {
      id: 'analytics',
      title: 'Vercel Analytics und Speed Insights',
      content: (
        <p>
          Wir nutzen Vercel Analytics zur aggregierten Reichweitenmessung und Vercel Speed Insights zur Messung von
          Performance-Kennzahlen. Dabei können Seitenaufrufe, ungefähre Standort- sowie Geräte- und Browserinformationen
          und technische Performance-Metadaten verarbeitet werden. URLs werden vor der Übermittlung ohne Query-Parameter
          und Fragmente gesendet; Gruppen-IDs im Pfad werden durch <code>[id]</code> ersetzt. Nach Angaben von Vercel
          verwenden diese Dienste keine Cookies. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Interesse an der
          Verbesserung und dem sicheren Betrieb des Angebots). Mehr dazu: <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer">Analytics-Datenschutz</a> und{' '}
          <a href="https://vercel.com/docs/speed-insights/privacy-policy" target="_blank" rel="noopener noreferrer">Speed-Insights-Datenschutz</a>.
        </p>
      ),
    },
    {
      id: 'gruppendaten',
      title: 'Gruppendaten in Supabase',
      content: (
        <>
          <p>
            Wenn Sie eine Gruppe erstellen oder einem Gruppenlink folgen, werden Ihre Eingaben in unserem Supabase-Projekt
            in der Region <strong>eu-west-1 (Irland)</strong> gespeichert. Verarbeitet werden insbesondere Gruppennamen,
            Währungen und Zeitpunkte, Mitgliedernamen, Ausgabenbeschreibungen, Beträge, Daten, Zahler und Aufteilungen
            sowie die für den Zugriff benötigten Lese- und Schreibtoken. Anbieter ist Supabase, Inc., ein Unternehmen
            mit Sitz in den USA; Informationen: <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer">Datenschutzerklärung von Supabase</a>.
          </p>
          <p>
            Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO für die Bereitstellung der von Ihnen angeforderten App-Funktionen
            sowie Art. 6 Abs. 1 lit. f DSGVO für Betrieb und Sicherheit.
          </p>
        </>
      ),
    },
    {
      id: 'personenbezogene-daten-dritter',
      title: 'Daten anderer Personen',
      content: (
        <p>
          Mitglieder- und Ausgabedaten können sich auf andere Personen beziehen. Bitte geben Sie nur Daten ein, die für
          die gemeinsame Abrechnung erforderlich sind, informieren Sie betroffene Personen gegebenenfalls darüber und
          verwenden Sie nach Möglichkeit Vornamen oder Spitznamen statt vollständiger Namen.
        </p>
      ),
    },
    {
      id: 'zugriff',
      title: 'Zugriff über Gruppenlinks',
      content: (
        <p>
          TeilFair verwendet keine Benutzerkonten. Der Zugriff erfolgt über Gruppenlinks mit einem Token im URL-Fragment
          (zum Beispiel <code>#t=…</code>), das Lese- oder Schreibrechte gewährt. Das Fragment wird vom Browser nicht an
          den Server gesendet und erscheint daher nicht in Vercel-Server-Logs. Behandeln Sie den Link dennoch wie ein
          Passwort und teilen Sie ihn nur mit Personen, denen Sie Zugriff geben möchten.
        </p>
      ),
    },
    {
      id: 'lokale-speicherung',
      title: 'Lokale Speicherung im Browser',
      content: (
        <>
          <p>Der Browser speichert lokal folgende Daten im Local Storage:</p>
          <ul>
            <li>Sprachwahl und Theme-Präferenz</li>
            <li>Zuletzt geöffnete Gruppen einschließlich Gruppen-ID und Zugriffstoken</li>
          </ul>
          <p>
            Diese Informationen bleiben auf Ihrem Endgerät und können in den Browser-Einstellungen gelöscht werden.
            Der Zugriff auf Informationen im Endgerät richtet sich nach § 165 Abs. 3 TKG 2021 und ist ohne Einwilligung
            zulässig, soweit er für einen von Ihnen ausdrücklich gewünschten Dienst unbedingt erforderlich ist.
            Die datenschutzrechtliche Grundlage für die damit verbundene Verarbeitung ist Art. 6 Abs. 1 lit. b DSGVO,
            soweit sie zur Bereitstellung der angeforderten Funktion nötig ist.
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies',
      content: <p>Diese Website setzt keine Cookies.</p>,
    },
    {
      id: 'drittland',
      title: 'Datenübermittlung in Drittländer',
      content: (
        <p>
          Vercel Inc. und Supabase, Inc. sind US-Unternehmen. Soweit personenbezogene Daten in die USA übermittelt werden,
          stützt sich die Übermittlung durch Vercel auf das EU-US Data Privacy Framework (DPF); soweit erforderlich kommen
          Standardvertragsklauseln und ergänzende Schutzmaßnahmen zum Einsatz. Weitere Informationen: <a href="https://www.dataprivacyframework.gov/" target="_blank" rel="noopener noreferrer">EU-US Data Privacy Framework</a>.
          Die Gruppendatenbank dieses Projekts befindet sich in der EU-Region eu-west-1 (Irland).
        </p>
      ),
    },
    {
      id: 'kontakt',
      title: 'Kontaktaufnahme',
      content: (
        <p>
          Wenn Sie uns per E-Mail kontaktieren, verarbeiten wir Ihre E-Mail-Adresse, Ihren Namen (falls angegeben) und
          den Nachrichteninhalt, um Ihre Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO
          (berechtigtes Interesse an der Bearbeitung von Anfragen). Kontakt: <a href="mailto:legal@moritzreis.dev">legal@moritzreis.dev</a>.
        </p>
      ),
    },
    {
      id: 'rechte',
      title: 'Ihre Rechte und Beschwerdemöglichkeit',
      content: (
        <>
          <p>
            Sie haben die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
            und Widerspruch gemäß Art. 15–21 DSGVO sowie das Recht, eine Einwilligung jederzeit mit Wirkung für die Zukunft
            zu widerrufen (Art. 7 Abs. 3 DSGVO). Da TeilFair keine Benutzerkonten hat, geben Sie bei einer Anfrage bitte
            den betreffenden Gruppenlink oder zumindest die Gruppen-ID an, damit wir die Daten zuordnen können. Schreiben
            Sie an <a href="mailto:legal@moritzreis.dev">legal@moritzreis.dev</a>.
          </p>
          <p>
            Sie können sich bei der Österreichischen Datenschutzbehörde beschweren: Barichgasse 40–42, 1030 Wien,
            Österreich, <a href="https://www.dsb.gv.at/" target="_blank" rel="noopener noreferrer">dsb.gv.at</a>.
          </p>
        </>
      ),
    },
    {
      id: 'speicherdauer',
      title: 'Speicherdauer und Löschung',
      content: (
        <p>
          Gruppen, Mitglieder und Ausgaben bleiben gespeichert, bis Sie die Gruppe über die Löschfunktion in der App
          löschen oder eine Löschung per E-Mail anfordern. Eine automatische Löschung inaktiver Gruppen findet derzeit
          nicht statt. Technische Zugriffsdaten werden nur so lange aufbewahrt, wie sie für Betrieb und Sicherheit
          erforderlich sind; lokale Browserdaten bleiben gespeichert, bis Sie sie im Browser löschen. Gelöschte Daten
          können noch für begrenzte Zeit in Sicherungskopien und Logs der Anbieter enthalten sein, bis deren jeweilige
          Aufbewahrungsfristen ablaufen.
        </p>
      ),
    },
    {
      id: 'aenderungen',
      title: 'Änderungen dieser Datenschutzerklärung',
      content: <p>Wir aktualisieren diese Erklärung, wenn sich die Datenverarbeitung oder die rechtlichen Anforderungen ändern.</p>,
    },
  ],
};