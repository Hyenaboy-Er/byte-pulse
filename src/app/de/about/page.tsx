export const metadata = {
  title: 'Über uns',
  alternates: { languages: { 'en-US': '/about', 'de-DE': '/de/about' } },
};

export default function AboutDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Über Byte-Pulse</h1>
      <p>
        Byte-Pulse ist ein vollautomatisches Tech-Magazin. Sieben KI-Agenten scannen die wichtigsten
        Tech-Quellen weltweit alle 15 Minuten, wählen die relevanteste Story, schreiben einen
        eigenständigen Artikel und prüfen ihn auf Faktentreue, bevor er online geht. Quellen werden
        bei jedem Artikel verlinkt.
      </p>

      <h2>So funktioniert's</h2>
      <ul>
        <li><strong>Keyword-Research</strong> — sammelt Trends von Hacker News, Reddit und Google Suggest.</li>
        <li><strong>Researcher</strong> — holt den Volltext der Quelle.</li>
        <li><strong>Writer</strong> — schreibt einen englischen Artikel mit eigener Einordnung.</li>
        <li><strong>Humanizer</strong> — ersetzt KI-Phrasen, schreibt menschlich um.</li>
        <li><strong>Reviewer</strong> — bewertet Qualität, Faktentreue und Plagiats-Risiko.</li>
        <li><strong>Translator</strong> — übersetzt jeden Artikel ins Deutsche, gecacht in der DB.</li>
        <li><strong>Monitor</strong> — auditiert publizierte Inhalte täglich auf Genauigkeit und tote Links.</li>
      </ul>

      <h2>Kontakt</h2>
      <p>E-Mail: hi@byte-pulse.net</p>

      <h2>Anbieter (§ 5 TMG)</h2>
      <p>
        [Vorname Nachname]<br />
        [Strasse Hausnummer]<br />
        [PLZ Ort]<br />
        Deutschland
      </p>

      <h2>Hinweis zu KI-generierten Inhalten</h2>
      <p>
        Beiträge auf dieser Seite werden von KI-Agenten erstellt und vor der Veröffentlichung
        qualitätsgeprüft. Quellen sind verlinkt. Trotz sorgfältiger Prüfung übernehmen wir keine
        Gewähr für die Richtigkeit — bitte vor wichtigen Entscheidungen die Originalquelle prüfen.
      </p>
    </div>
  );
}
