export const metadata = {
  title: 'Datenschutzerklärung',
  description: 'Wie Byte-Pulse mit personenbezogenen Daten umgeht.',
  alternates: { languages: { 'en-US': '/privacy', 'de-DE': '/de/privacy' } },
};

export default function DatenschutzDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Datenschutzerklärung</h1>

      <p className="text-sm text-muted">Stand: Mai 2026</p>

      <h2>1. Verantwortlicher</h2>
      <p>
        BRL Vision Solutions<br />
        Okerstr. 24, 51371 Leverkusen<br />
        E-Mail: <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a><br />
        Geschäftsführer: Serhat Er
      </p>

      <h2>2. Allgemeines</h2>
      <p>
        Wir verarbeiten personenbezogene Daten nur, soweit dies für die Bereitstellung dieser Webseite
        und ihrer Funktionen technisch erforderlich ist. Diese Datenschutzerklärung informiert dich nach
        Art. 13 DSGVO über Art, Umfang und Zweck der Datenverarbeitung.
      </p>

      <h2>3. Server-Logs</h2>
      <p>
        Beim Aufruf von byte-pulse.net werden vom Hosting-Anbieter (Vercel Inc., USA) automatisch
        technische Daten erfasst: IP-Adresse, User-Agent, Referrer, aufgerufene URL, Zeitpunkt.
        Rechtsgrundlage: <strong>Art. 6 Abs. 1 lit. f DSGVO</strong> (berechtigtes Interesse am sicheren
        Betrieb). Die Logs werden vom Anbieter automatisch nach einigen Wochen gelöscht.
      </p>

      <h2>4. Cookies</h2>
      <p>
        Diese Webseite setzt keine Tracking-Cookies. Cloudflare (DNS-Anbieter) kann ein technisches
        Sicherheits-Cookie setzen, das für den Betrieb erforderlich ist (Art. 6 Abs. 1 lit. f DSGVO).
      </p>

      <h2>5. Werbung (wenn aktiviert)</h2>
      <p>
        Google AdSense kann zukünftig aktiviert werden. In diesem Fall setzt Google Cookies zur
        Anzeige personalisierter Werbung und Leistungsmessung. Rechtsgrundlage:{' '}
        <strong>Art. 6 Abs. 1 lit. a DSGVO</strong> (Einwilligung — du wirst einen Cookie-Banner sehen).
        Details:{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          policies.google.com/technologies/ads
        </a>
        .
      </p>

      <h2>6. Empfänger deiner Daten</h2>
      <ul>
        <li>Vercel Inc. (Hosting, USA — Übermittlung über EU-Standardvertragsklauseln)</li>
        <li>Cloudflare Inc. (DNS, USA — Übermittlung über EU-Standardvertragsklauseln)</li>
        <li>Turso (Datenbank, EU — Irland)</li>
        <li>OpenAI (Content-Generierung — es werden keine Nutzerdaten übermittelt, nur RSS-Quelltexte)</li>
      </ul>

      <h2>7. Newsletter</h2>
      <p>
        Der Newsletter ist derzeit deaktiviert. Sobald er startet, speichern wir deine E-Mail-Adresse
        ausschließlich mit deiner ausdrücklichen Einwilligung (Double-Opt-In, Art. 6 Abs. 1 lit. a
        DSGVO). Du kannst dich mit einem Klick in jeder Mail wieder abmelden.
      </p>

      <h2>8. Deine Rechte</h2>
      <p>Du hast nach DSGVO folgende Rechte:</p>
      <ul>
        <li>Auskunft (Art. 15)</li>
        <li>Berichtigung (Art. 16) oder Löschung (Art. 17)</li>
        <li>Einschränkung der Verarbeitung (Art. 18)</li>
        <li>Datenübertragbarkeit (Art. 20)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
        <li>
          Beschwerde bei einer Aufsichtsbehörde (in NRW: Landesbeauftragte für Datenschutz und
          Informationsfreiheit Nordrhein-Westfalen, Kavalleriestr. 2-4, 40213 Düsseldorf)
        </li>
      </ul>
      <p>
        Zur Ausübung schreibe an <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a>.
      </p>

      <h2>9. Änderungen</h2>
      <p>
        Wir können diese Erklärung anpassen, wenn sich die Webseite weiterentwickelt. Die aktuelle Version
        findest du immer unter byte-pulse.net/de/privacy.
      </p>
    </div>
  );
}
