import NewsletterForm from '@/components/NewsletterForm';

export const metadata = {
  title: 'Der Byte-Pulse Daily — Tech-News die zählen, jeden Morgen',
  description:
    'Eine kurze Mail am Tag: die 5 Tech-Stories die zählen — KI, Hardware, Gaming, Security. Kostenlos, faktengeprüft, jederzeit abbestellbar.',
  alternates: { canonical: '/de/newsletter', languages: { 'en-US': '/newsletter', 'de-DE': '/de/newsletter' } },
};

export default function NewsletterPageDE() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="font-display font-extrabold text-4xl tracking-tight">
          Der Byte-Pulse Daily
        </h1>
        <p className="text-white/70 mt-3 text-lg">
          Die 5 Tech-Stories die wirklich zählen — bis 8&nbsp;Uhr in deinem Postfach.
          KI, Hardware, Gaming, Security. Faktengeprüft, ohne Hype, ohne Fülltext.
        </p>
      </div>

      <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> Kostenlos, für immer</li>
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> Eine Mail/Tag, nie mehr</li>
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> Abmeldung mit einem Klick</li>
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> Kein Spam, kein Datenverkauf</li>
      </ul>

      <div className="mt-8 max-w-md mx-auto">
        <NewsletterForm />
        <p className="mt-3 text-center text-xs text-white/40">
          Double-Opt-In: wir senden eine Bestätigungsmail — Link klicken, fertig.
          (Schau das erste Mal im Spam-Ordner und markier uns als &quot;kein Spam&quot; —
          die Domain ist jung und baut gerade Absender-Reputation auf.)
        </p>
      </div>

      <p className="text-sm text-muted mt-10 text-center">
        Lieber im Reader? Hol dir den <a href="/de/feed.xml" className="text-accent">RSS-Feed</a>.
      </p>
    </div>
  );
}
