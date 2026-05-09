// Mid-article affiliate CTA. Renders only when the orchestrator picks a relevant
// program (e.g. NordVPN on security articles). Displays a clear "Anzeige" /
// "Sponsored" label so we stay GDPR/UWG-compliant.
import { affiliateCtaFor } from '@/lib/affiliate';

export default function AffiliateCTA({ category, lang = 'en' }: { category: string; lang?: 'en' | 'de' }) {
  const cta = affiliateCtaFor(category, lang);
  if (!cta) return null;

  const label = lang === 'de' ? 'Anzeige · Affiliate-Link' : 'Sponsored · Affiliate link';

  return (
    <div className="my-8 rounded-xl bg-gradient-to-br from-accent/10 to-bg-card border border-accent/20 p-5">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-2">{label}</div>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="font-display font-bold text-lg mb-1">{cta.title}</div>
          <p className="text-sm text-white/70 mb-3">{cta.body}</p>
          <a
            href={cta.ref}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="inline-block px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition"
          >
            {cta.cta} →
          </a>
        </div>
      </div>
    </div>
  );
}
