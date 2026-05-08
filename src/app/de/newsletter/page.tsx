export const metadata = {
  title: 'Newsletter — kommt bald',
  description: 'Der tägliche Byte-Pulse-Newsletter ist noch nicht aktiv.',
  alternates: { languages: { 'en-US': '/newsletter', 'de-DE': '/de/newsletter' } },
};

export default function NewsletterPageDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">📬</div>
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Newsletter — kommt bald</h1>
      <p className="text-white/70 mt-3 text-lg">
        Wir feilen noch an der redaktionellen Linie. Der tägliche Newsletter geht online sobald wir
        gleichmäßige Qualität über alle Rubriken haben. Danke für deine Geduld.
      </p>
      <p className="text-sm text-muted mt-6">
        Bis dahin: abonniere den <a href="/de/feed.xml" className="text-accent">RSS-Feed</a>.
      </p>
    </div>
  );
}
