import NewsletterForm from '@/components/NewsletterForm';

export const metadata = {
  title: 'Newsletter abonnieren',
  description: 'Die wichtigsten Tech-Storys jeden Werktag um 7:00 Uhr.',
  alternates: { languages: { 'en-US': '/newsletter', 'de-DE': '/de/newsletter' } },
};

export default function NewsletterPageDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-5xl mb-4">📬</div>
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Newsletter</h1>
      <p className="text-white/70 mt-3 text-lg">
        Werktags um 7:00 Uhr in deiner Inbox: die fünf wichtigsten Tech-Storys der letzten 24 Stunden,
        kuratiert von KI-Redakteuren — ohne Filter-Bubble, ohne Bullshit.
      </p>

      <div className="mt-8">
        <NewsletterForm />
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-white/60">
        <div>
          <div className="text-2xl mb-1">⏱</div>
          <strong className="text-white">2 Min. Lesezeit</strong>
          <div>Schnell durch beim Kaffee.</div>
        </div>
        <div>
          <div className="text-2xl mb-1">🚫</div>
          <strong className="text-white">Kein Spam</strong>
          <div>Nur werktags, eine Mail.</div>
        </div>
        <div>
          <div className="text-2xl mb-1">↗️</div>
          <strong className="text-white">1 Klick weg</strong>
          <div>Abmelden in jeder Mail.</div>
        </div>
      </div>
    </div>
  );
}
