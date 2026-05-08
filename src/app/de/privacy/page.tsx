export const metadata = {
  title: 'Datenschutz',
  alternates: { languages: { 'en-US': '/privacy', 'de-DE': '/de/privacy' } },
};

export default function PrivacyDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Datenschutzerklärung</h1>
      <p>Diese Seite verarbeitet personenbezogene Daten nur, soweit für die Bereitstellung der Inhalte technisch nötig.</p>

      <h2>Newsletter</h2>
      <p>Wir speichern deine E-Mail-Adresse ausschliesslich, um dir den Newsletter zuzustellen. Abmeldung jederzeit über den Link in jeder Mail.</p>

      <h2>Server-Logs</h2>
      <p>Beim Aufruf der Seite werden technische Informationen wie IP-Adresse und User-Agent vom Hosting-Provider zur Sicherstellung des Betriebs verarbeitet.</p>

      <h2>Werbung</h2>
      <p>Wenn AdSense aktiviert ist, kann Google Cookies setzen. Details: policies.google.com/technologies/ads</p>

      <h2>Deine Rechte</h2>
      <p>Auskunft, Berichtigung, Löschung — Anfrage per Mail an die im Impressum genannte Adresse.</p>
    </div>
  );
}
