// /contact — AdSense + Google Trust signals expect a way for visitors to reach
// the publisher. Static page, no form (forms add abuse-risk; an email link is
// cleaner). Bilingual via inline branch.

import type { Metadata } from 'next';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';
const SITE_EMAIL = process.env.NEXT_PUBLIC_SITE_EMAIL ?? 'hello@byte-pulse.net';

export const metadata: Metadata = {
  title: `Contact · ${SITE_NAME}`,
  description: `Reach the ${SITE_NAME} editorial team — story tips, partnerships, corrections, press.`,
  alternates: { canonical: '/contact', languages: { 'en-US': '/contact', 'de-DE': '/de/contact' } },
};

export default function ContactPage() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Contact</h1>
      <p className="mt-4 text-white/75 leading-relaxed">
        Reach the {SITE_NAME} editorial team — story tips, partnerships, corrections, or press inquiries.
      </p>

      <div className="mt-8 rounded-xl bg-bg-card border border-white/5 p-6">
        <div className="text-xs uppercase tracking-wider text-accent font-bold">Email</div>
        <a href={`mailto:${SITE_EMAIL}`} className="mt-2 inline-block text-lg font-semibold text-white hover:text-accent transition">
          {SITE_EMAIL}
        </a>
        <p className="mt-3 text-sm text-muted">
          We read every message. Press and partnership inquiries get a response within 2 business days.
        </p>
      </div>

      <div className="mt-6 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70 leading-relaxed">
        <strong className="block text-white font-semibold mb-1">Corrections</strong>
        If you spot a factual error in any article, email us with the article URL and the correction.
        We update articles inline and add a brief note when needed.
      </div>

      <div className="mt-4 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70 leading-relaxed">
        <strong className="block text-white font-semibold mb-1">Story tips</strong>
        Got a tech story you want covered? Send it our way. We don't promise to write everything,
        but we read every tip and reply to the ones we pursue.
      </div>

      <div className="mt-4 rounded-xl bg-bg-card/50 border border-white/5 p-5 text-sm text-white/70 leading-relaxed">
        <strong className="block text-white font-semibold mb-1">Partnerships & advertising</strong>
        For sponsorships, brand partnerships, or affiliate inquiries beyond our standard programs,
        please include "Partnership" in the subject line.
      </div>
    </article>
  );
}
