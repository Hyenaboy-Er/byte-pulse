// Datenschutzerklärung — DSGVO-konform, AdSense-fertig.
// Offenlegung aller Drittanbieter mit Rechtsgrundlage, Speicherdauer,
// internationalen Datentransfers (SCC), Betroffenenrechten (Art. 15-22) und
// Beschwerdeweg. Spiegelt den englischen /privacy.

export const metadata = {
  title: 'Datenschutzerklärung',
  description: 'Wie Byte-Pulse personenbezogene Daten verarbeitet — DSGVO-konforme Offenlegung aller Verarbeiter.',
  alternates: { languages: { 'en-US': '/privacy', 'de-DE': '/de/privacy' } },
  robots: { index: true, follow: true },
};

export default function DatenschutzDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Datenschutzerklärung</h1>

      <p className="text-sm text-muted">Stand: 12. Mai 2026 · Gültig ab sofort</p>

      <p>
        Diese Datenschutzerklärung informiert Sie nach Art. 13 DSGVO und § 25 TTDSG darüber, welche
        personenbezogenen Daten beim Besuch von byte-pulse.net oder bei Nutzung des Newsletters durch
        Byte-Pulse (Betreiberin: BRL Vision Solutions, Okerstr. 24, 51371 Leverkusen) verarbeitet werden,
        zu welchen Zwecken und auf welcher Rechtsgrundlage.
      </p>

      <h2>1. Verantwortlicher</h2>
      <p>Verantwortlich im Sinne von Art. 4 Nr. 7 DSGVO ist:</p>
      <p>
        BRL Vision Solutions<br />
        Okerstr. 24<br />
        51371 Leverkusen<br />
        Deutschland<br />
        Geschäftsführer: Serhat Er<br />
        Telefon: +49 2143 3014059<br />
        E-Mail: <a href="mailto:hello@byte-pulse.net">hello@byte-pulse.net</a>
      </p>
      <p>
        Ein Datenschutzbeauftragter ist nicht bestellt, da die Schwellenwerte nach § 38 BDSG nicht
        überschritten werden. Datenschutzanfragen beantwortet die Geschäftsführung direkt.
      </p>

      <h2>2. Geltungsbereich</h2>
      <p>
        Diese Erklärung gilt für byte-pulse.net, alle Subdomains und sämtliche dort angebotenen Dienste
        (Artikelseiten, Newsletter-Anmeldung, Autorenseiten, Kategorieübersichten, RSS-Feeds). Sie gilt
        nicht für extern verlinkte Websites — dort gelten die jeweils eigenen Datenschutzerklärungen.
      </p>

      <h2>3. Welche Daten wir verarbeiten, wozu und auf welcher Rechtsgrundlage</h2>

      <h3>3.1 Server-Logs</h3>
      <p>
        Bei jedem Aufruf einer Seite oder Ressource speichert unser Hosting-Anbieter Vercel Inc.
        automatisch: IP-Adresse (soweit möglich verkürzt), User-Agent, aufgerufene URL, ggf. Referrer-URL,
        HTTP-Status und Zeitstempel. Zweck: sicherer Betrieb, Fehleranalyse, Missbrauchsabwehr
        (Rate-Limiting, Bot-Schutz). Speicherdauer: bis zu 30 Tage, danach automatische Löschung durch
        Vercel. Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — berechtigtes Interesse am
        stabilen, sicheren Betrieb.
      </p>

      <h3>3.2 Cookies und vergleichbare Technologien</h3>
      <p>
        Byte-Pulse setzt selbst nur die folgenden clientseitigen Speicher:
      </p>
      <ul>
        <li>
          <strong>Cookie-Banner-Zustand</strong> (<code>bp_consent_v1</code> in localStorage): merkt sich
          Ihre Wahl, damit wir nicht erneut fragen. Technisch notwendig.
        </li>
        <li>
          <strong>Newsletter-Cooldown</strong> (<code>bp_nl_v1</code> in localStorage): blendet das
          Newsletter-Modal nach Schließen für 7 Tage aus. UX-notwendig.
        </li>
        <li>
          <strong>Gemerkte Artikel</strong> (<code>bp_saved</code> in localStorage, falls Sie den
          Herz-Button nutzen): rein lokale Slug-Liste, nie an unseren Server gesendet.
        </li>
      </ul>
      <p>
        Drittanbieter-Cookies von Cloudflare (DNS / CDN) wie <code>__cf_bm</code> (Bot-Erkennung) und{' '}
        <code>cf_clearance</code> (Sicherheits-Challenges) können gesetzt werden — diese sind technisch
        notwendig für die Auslieferung. Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. f DSGVO</strong>.
      </p>
      <p>
        Werbe- oder Analyse-Cookies (siehe §3.6 und §3.7) werden ausschließlich mit Ihrer ausdrücklichen
        Einwilligung gesetzt. Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> i.V.m. § 25
        Abs. 1 TTDSG.
      </p>

      <h3>3.3 Artikelaufrufe (anonymer Zähler)</h3>
      <p>
        Pro Artikel erhöhen wir einen internen Aufrufzähler — eine einzelne Ganzzahl je Artikel. Es werden
        keine IP, kein Fingerprint und keine Nutzerkennung gespeichert. Rechtsgrundlage:{' '}
        <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — berechtigtes Interesse an redaktioneller Auswertung.
      </p>

      <h3>3.4 Newsletter (Resend)</h3>
      <p>
        Wenn Sie sich über das Newsletter-Modal oder das Footer-Formular eintragen, speichern wir Ihre
        E-Mail-Adresse, ein Bestätigungs-Token, den Zeitstempel sowie den Bestätigungsstatus. Sie erhalten
        zunächst eine einmalige Bestätigungs-Mail; erst nach Klick auf den Link in dieser Mail nehmen wir
        Sie in den täglichen Digest auf. Dieses <strong>Double-Opt-In</strong>-Verfahren entspricht den
        Anforderungen von Art. 7 DSGVO.
      </p>
      <p>
        Der E-Mail-Versand erfolgt über <strong>Resend Inc.</strong> (USA). Ihre E-Mail-Adresse wird an
        Resend ausschließlich zum Versand der Bestätigungs- und Digest-Mails übermittelt. Resend
        verarbeitet auf Basis der EU-Standardvertragsklauseln (Art. 46 DSGVO). Speicherdauer: bis zur
        Abmeldung (One-Click-Link in jeder Mail).
      </p>
      <p>
        Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Ihre ausdrückliche Einwilligung.
      </p>

      <h3>3.5 Kontakt per E-Mail</h3>
      <p>
        Wenn Sie uns unter hello@byte-pulse.net (oder einer anderen byte-pulse.net-Adresse) schreiben,
        speichern wir Ihre E-Mail-Adresse und den Nachrichteninhalt nur so lange, wie es zur Bearbeitung
        nötig ist, zzgl. gesetzlicher Aufbewahrungsfristen (i.d.R. 6 Monate für allgemeine Korrespondenz,
        6 Jahre soweit handels-/steuerrechtliche Pflichten bestehen).
      </p>
      <p>
        Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. b DSGVO</strong> (vorvertraglich) oder{' '}
        <strong>lit. f</strong> (berechtigtes Interesse an der Beantwortung).
      </p>

      <h3>3.6 Werbung — Google AdSense (sobald aktiviert)</h3>
      <p>
        Nach Aktivierung zeigt byte-pulse.net Werbung von <strong>Google Ireland Ltd.</strong> über Google
        AdSense an. AdSense verwendet Cookies und ähnliche Kennungen zur Auslieferung relevanter Anzeigen
        und Messung der Werbeleistung. Google kann Informationen über Ihren Besuch dieser und anderer
        Websites nutzen, um bessere Werbung anzuzeigen — siehe Googles{' '}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
          Richtlinie für Partner-Websites
        </a>{' '}
        und{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          Werbe-Datenschutz
        </a>.
      </p>
      <p>
        Sie können personalisierte Anzeigen jederzeit deaktivieren — in den{' '}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          Google Anzeigeneinstellungen
        </a>{' '}
        oder branchenweit über{' '}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
          aboutads.info/choices
        </a>.
      </p>
      <p>
        Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> — Ihre Einwilligung im Cookie-Banner.
        Wenn Sie ablehnen, wird AdSense — sofern möglich — im nicht-personalisierten Modus (NPA) geladen.
      </p>

      <h3>3.7 Analyse — Vercel Analytics & Speed Insights</h3>
      <p>
        Wir nutzen <strong>Vercel Analytics</strong> (Seitenaufrufe, Referrer, aggregierte Gerätekategorie)
        und <strong>Vercel Speed Insights</strong> (Core Web Vitals — LCP, FID, CLS). Vercel anonymisiert
        diese Signale bereits bei der Erfassung — keine IP, kein Fingerprint, kein Cookie wird gesetzt.
      </p>
      <p>
        Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> — berechtigtes Interesse an
        Performance-Messung. Da keine personenbezogenen Daten erhoben werden, ist keine Einwilligung
        erforderlich (Erwägungsgrund 26 DSGVO).
      </p>

      <h3>3.8 Affiliate-Links — Amazon, Skimlinks u.a.</h3>
      <p>
        Einige Links auf byte-pulse.net sind <em>Affiliate-Links</em>. Beim Klick werden Sie auf eine
        Partner-Seite (z.B. amazon.de, amazon.com) weitergeleitet, die eigene Cookies setzt und uns ggf.
        eine Provision zahlt, wenn Sie kaufen. Wir kennzeichnen das auf jedem Artikel mit
        &quot;Anzeige · Affiliate-Link&quot;. Wir geben keine Daten an den Partner weiter — nur der Klick
        selbst ist das Signal.
      </p>
      <p>
        Lesen Sie Amazons eigene Datenschutzerklärung unter{' '}
        <a href="https://www.amazon.de/datenschutz" target="_blank" rel="noopener noreferrer">
          amazon.de/datenschutz
        </a>{' '}
        bzw.{' '}
        <a href="https://www.amazon.com/privacy" target="_blank" rel="noopener noreferrer">
          amazon.com/privacy
        </a>.
      </p>

      <h3>3.9 Push-Benachrichtigungen — OneSignal (Opt-In)</h3>
      <p>
        Wir bieten optional Browser-Push-Benachrichtigungen über <strong>OneSignal Inc.</strong> (USA) an.
        Push ist strikt opt-in über den nativen Browser-Dialog. Bei Zustimmung speichert OneSignal einen
        Push-Token und Ihre Themenpräferenzen. Sie können jederzeit über die Browser-Einstellungen
        oder den &quot;Abmelden&quot;-Link in jeder Benachrichtigung widerrufen.
      </p>
      <p>
        Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. a DSGVO</strong>. Für die US-Übermittlung gelten
        EU-Standardvertragsklauseln.
      </p>

      <h3>3.10 Hosting und CDN</h3>
      <p>Infrastruktur-Dienstleister:</p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA) — Application-Hosting und Edge-CDN. Standardvertragsklauseln;
          AVV abgeschlossen.
        </li>
        <li>
          <strong>Cloudflare Inc.</strong> (USA) — DNS. SCC; AVV abgeschlossen.
        </li>
        <li>
          <strong>Turso (ChiselStrike Inc.)</strong> — Datenbank. EU-Region genutzt; Datenverarbeitung in
          der EU.
        </li>
      </ul>

      <h3>3.11 KI-/Content-Tooling</h3>
      <p>
        Unsere Redaktion nutzt die APIs von <strong>OpenAI</strong> und <strong>Google Gemini</strong> für
        Erstentwurf, Faktencheck und Übersetzung. Übermittelt wird ausschließlich der öffentliche
        Quellartikel-Text und unsere eigenen Prompts — keine Nutzerdaten, keine IP, keine E-Mail.
      </p>

      <h3>3.12 IndexNow-Ping an Suchmaschinen</h3>
      <p>
        Nach jeder Veröffentlichung pingen wir IndexNow (Bing, Yandex, Seznam, Naver) mit der
        öffentlichen Artikel-URL — keine Nutzerdaten.
      </p>

      <h3>3.13 Social-Broadcast</h3>
      <p>
        Jeder veröffentlichte Artikel wird automatisch auf unseren öffentlichen Accounts bei X (Twitter),
        Mastodon und Bluesky geteilt. Übermittelt werden nur öffentliche Artikel-Metadaten (Titel, Excerpt,
        URL). Es verlassen keinerlei Nutzerdaten die Website.
      </p>

      <h2>4. Internationale Datenübermittlung</h2>
      <p>
        Einige unserer Dienstleister sitzen in den USA (Vercel, Cloudflare, Resend, OpenAI, Google,
        OneSignal). Die Übermittlung ist durch EU-Standardvertragsklauseln (Art. 46 Abs. 2 lit. c DSGVO)
        und ggf. das EU-US Data Privacy Framework abgesichert. Die jeweiligen SCC und Zertifizierungen
        sind auf den Websites der Anbieter abrufbar.
      </p>

      <h2>5. Ihre Rechte</h2>
      <p>Nach DSGVO haben Sie folgende Rechte:</p>
      <ul>
        <li><strong>Auskunft</strong> — Kopie Ihrer gespeicherten Daten (Art. 15)</li>
        <li><strong>Berichtigung</strong> unrichtiger Daten (Art. 16)</li>
        <li><strong>Löschung</strong> — &quot;Recht auf Vergessenwerden&quot; (Art. 17)</li>
        <li><strong>Einschränkung</strong> der Verarbeitung (Art. 18)</li>
        <li><strong>Datenübertragbarkeit</strong> in einem maschinenlesbaren Format (Art. 20)</li>
        <li>
          <strong>Widerspruch</strong> gegen Verarbeitung auf Basis berechtigter Interessen (Art. 21) —
          insbesondere gegen Direktwerbung jederzeit
        </li>
        <li>
          <strong>Widerruf</strong> erteilter Einwilligungen mit Wirkung für die Zukunft (Art. 7 Abs. 3)
        </li>
        <li>
          <strong>Beschwerde</strong> bei einer Aufsichtsbehörde. Für unseren Sitz in Leverkusen zuständig
          ist die <strong>Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen
          (LDI NRW)</strong>, Kavalleriestr. 2-4, 40213 Düsseldorf, +49 211 38424-0,{' '}
          <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer">www.ldi.nrw.de</a>.
        </li>
      </ul>
      <p>
        Zur Ausübung Ihrer Rechte schreiben Sie an{' '}
        <a href="mailto:hello@byte-pulse.net">hello@byte-pulse.net</a>. Wir antworten innerhalb von 30
        Tagen (verlängerbar um 60 Tage bei komplexen Anfragen, mit Mitteilung).
      </p>

      <h2>6. Speicherdauer</h2>
      <p>
        Wir löschen oder anonymisieren personenbezogene Daten, sobald der Zweck der Verarbeitung erfüllt
        ist, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen (z.B. § 257 HGB / § 147 AO
        für Handelskorrespondenz). Logs: 30 Tage. Newsletter: bis zur Abmeldung. Kontaktmails: 6 Monate
        (24 Monate, sofern eine Geschäftsbeziehung entsteht).
      </p>

      <h2>7. Minderjährige</h2>
      <p>
        Byte-Pulse erhebt wissentlich keine Daten von Personen unter 16 Jahren. Mit der Newsletter-
        Anmeldung bestätigen Sie, das gesetzliche Mindestalter in Ihrem Land zu haben. Sollten wir
        Kenntnis davon erlangen, dass Minderjährige Daten übermittelt haben, löschen wir diese
        unverzüglich.
      </p>

      <h2>8. Sicherheit</h2>
      <p>
        Der gesamte Verkehr mit byte-pulse.net ist mit HTTPS (TLS 1.2+) verschlüsselt. Die Datenbank wird
        in der EU mit At-Rest-Verschlüsselung gehostet. Administrative Zugänge sind durch Passwörter +
        2FA geschützt. Wir orientieren uns am OWASP-Baseline-Standard.
      </p>

      <h2>9. Änderungen dieser Erklärung</h2>
      <p>
        Wir können diese Datenschutzerklärung anpassen, wenn wir Dienste hinzufügen oder entfernen. Die
        jeweils aktuelle Version ist unter{' '}
        <a href="https://www.byte-pulse.net/de/privacy">byte-pulse.net/de/privacy</a> abrufbar.
        Wesentliche Änderungen werden oben auf dieser Seite bekanntgegeben.
      </p>

      <h2>10. Kontakt</h2>
      <p>
        Datenschutzanfragen:{' '}
        <a href="mailto:hello@byte-pulse.net">hello@byte-pulse.net</a>
      </p>
    </div>
  );
}
