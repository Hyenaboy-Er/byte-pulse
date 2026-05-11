import type { Metadata } from 'next';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';
const SITE_EMAIL = process.env.NEXT_PUBLIC_SITE_EMAIL ?? 'hello@byte-pulse.net';

export const metadata: Metadata = {
  title: `Kontakt · ${SITE_NAME}`,
  description: `${SITE_NAME} Redaktion erreichen — Story-Tipps, Partnerschaften, Korrekturen, Presse.`,
  alternates: { canonical: '/de/contact', languages: { 'en-US': '/contact', 'de-DE': '/de/contact' } },
};

export default function ContactPageDE() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Kontakt</h1>
      <p className="mt-4 text-white/75 leading-relaxed">
        Erreiche das {SITE_NAME}-Redaktionsteam — Story-Tipps, Kooperationen, Korrekturen oder Presseanfragen.
      </p>

      <div className="mt-8 rounded-xl bg-bg-card border border-white/5 p-6">
        <div className="text-xs uppercase tracking-wider text-accent font-bold">E-Mail</div>
        <a href={`mailto:${SITE_EMAIL}`} className="mt-2 inline-block text-lg font-semibold text-white hover:text-accent transition">
          {SITE_EMAIL}
        </a>
        <p className="mt-3 text-sm text-muted">
          Wir lesen jede Nachricht. Presse- und Partneranfragen werden innerhalb von 2 Werktagen beantwortet.
        </p>
      </div>

      <div className="mt-6 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70 leading-relaxed">
        <strong className="block text-white font-semibold mb-1">Korrekturen</strong>
        Wenn du einen sachlichen Fehler in einem Artikel entdeckst, schreib uns die Artikel-URL und die Korrektur.
        Wir aktualisieren Artikel direkt und ergänzen bei Bedarf einen kurzen Hinweis.
      </div>

      <div className="mt-4 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70 leading-relaxed">
        <strong className="block text-white font-semibold mb-1">Story-Tipps</strong>
        Du hast eine Tech-Story, die wir abdecken sollen? Schick sie uns. Wir versprechen nicht, alles zu schreiben,
        aber wir lesen jeden Tipp und antworten auf die, die wir aufgreifen.
      </div>

      <div className="mt-4 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70 leading-relaxed">
        <strong className="block text-white font-semibold mb-1">Partnerschaften & Werbung</strong>
        Für Sponsoring, Markenkooperationen oder Affiliate-Anfragen außerhalb unserer Standardprogramme,
        bitte „Partnerschaft" in den Betreff schreiben.
      </div>
    </article>
  );
}
