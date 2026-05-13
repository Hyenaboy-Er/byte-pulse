// Impressum — eigene Seite unter /impressum, weil deutsche Nutzer und AdSense-
// Crawler explizit diese URL erwarten. Inhalt identisch zum /about#legal
// Abschnitt aber als dedizierte Seite mit voller TMG/MStV-Konformität.

export const metadata = {
  title: 'Impressum',
  description: 'Impressum & rechtliche Hinweise nach § 5 TMG und § 18 MStV.',
  alternates: { canonical: '/impressum' },
  robots: { index: true, follow: true },
};

export default function Impressum() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Impressum</h1>

      <h2>Anbieterkennzeichnung nach § 5 TMG</h2>
      <p>
        BRL Vision Solutions<br />
        Okerstr. 24<br />
        51371 Leverkusen<br />
        Deutschland
      </p>

      <h2>Vertreten durch</h2>
      <p>Geschäftsführer: Serhat Er</p>

      <h2>Kontakt</h2>
      <p>
        Telefon: +49 2143 3014059<br />
        E-Mail: <a href="mailto:editorial@byte-pulse.net">editorial@byte-pulse.net</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Serhat Er<br />
        Anschrift wie oben
      </p>

      <h2>Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>.
        <br />
        Unsere E-Mail-Adresse finden Sie oben im Impressum.
      </p>
      <p>
        Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>

      <h2>Haftung für Inhalte</h2>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten
        nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als
        Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
        Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
        Tätigkeit hinweisen.
      </p>
      <p>
        Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den
        allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch
        erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei
        Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend
        entfernen.
      </p>

      <h2>Haftung für Links</h2>
      <p>
        Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
        Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr
        übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter
        oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt
        der Verlinkung auf mögliche Rechtsverstöße überprüft. Rechtswidrige Inhalte waren zum
        Zeitpunkt der Verlinkung nicht erkennbar.
      </p>

      <h2>Urheberrecht</h2>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen
        dem deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet, jede Quelle
        wird am Ende des jeweiligen Artikels verlinkt.
      </p>

      <h2>Hinweis zu KI-unterstützter Inhaltserstellung</h2>
      <p>
        Byte-Pulse nutzt KI-gestützte Werkzeuge im redaktionellen Workflow (Quellen-Monitoring,
        Erstentwurf, Übersetzung, Faktencheck). Jeder Artikel wird vor Veröffentlichung von der
        Redaktion geprüft und freigegeben. Trotz mehrstufiger Prüfung können Fehler nicht
        ausgeschlossen werden — Korrekturhinweise gerne an{' '}
        <a href="mailto:corrections@byte-pulse.net">corrections@byte-pulse.net</a>.
      </p>

      <p className="mt-12 text-xs text-muted">Stand: 12. Mai 2026</p>
    </div>
  );
}
