export const metadata = {
  title: 'Impressum',
  description: 'Impressum von Byte-Pulse — Anbieterkennzeichnung gem. § 5 TMG.',
  alternates: { languages: { 'en-US': '/about', 'de-DE': '/de/about' } },
};

export default function ImpressumDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Impressum</h1>

      <p className="text-sm text-muted">Angaben gemäß § 5 TMG</p>

      <h2>Anbieter</h2>
      <p>
        BRL Vision Solutions<br />
        Okerstr. 24<br />
        51371 Leverkusen<br />
        Deutschland
      </p>

      <h2>Vertreten durch</h2>
      <p>Serhat Er, Geschäftsführer</p>

      <h2>Kontakt</h2>
      <p>
        Telefon (Hotline): +49 2143 3014059<br />
        Telefon (mobil): +49 163 0816099<br />
        E-Mail: <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a>
      </p>

      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        Serhat Er<br />
        Anschrift wie oben
      </p>

      <h2>Hinweis zu KI-generierten Inhalten</h2>
      <p>
        Die redaktionellen Beiträge auf dieser Seite werden vollständig von KI-Agenten erstellt und vor
        der Veröffentlichung qualitäts- und faktengeprüft. Bei jedem Artikel ist die Originalquelle
        verlinkt. Trotz sorgfältiger Prüfung können wir keine Gewähr für die Richtigkeit aller Inhalte
        übernehmen — bitte vor wichtigen Entscheidungen die Originalquelle konsultieren.
      </p>

      <h2>Haftungsausschluss</h2>
      <h3>Haftung für Inhalte</h3>
      <p>
        Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den
        allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch
        nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach
        Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
      </p>

      <h3>Haftung für Links</h3>
      <p>
        Unser Angebot enthält Links zu externen Webseiten Dritter, auf deren Inhalte wir keinen Einfluss
        haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte
        der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
      </p>

      <h3>Urheberrecht</h3>
      <p>
        Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem
        deutschen Urheberrecht. Beiträge Dritter sind als solche gekennzeichnet bzw. mit Quellenangabe
        verlinkt.
      </p>

      <h2>Streitschlichtung</h2>
      <p>
        Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
          https://ec.europa.eu/consumers/odr
        </a>
        . Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
        Verbraucherschlichtungsstelle teilzunehmen.
      </p>
    </div>
  );
}
