// Inline mid-article affiliate card. Used as a fallback to AdSlot when AdSense
// isn't approved yet (or has 0% fill) so we ALWAYS have monetized content mid-
// article instead of an empty placeholder. Picks the category-based Amazon CTA
// from affiliateCtaFor() but renders as a compact horizontal card so it doesn't
// dominate the article like the bigger bottom CTA does.
import { affiliateCtaFor } from '@/lib/affiliate';

export default function InlineAffiliateCard({
  category,
  lang = 'en',
  variant = 'compact',
}: {
  category: string;
  lang?: 'en' | 'de';
  variant?: 'compact' | 'callout';
}) {
  const cta = affiliateCtaFor(category, lang);
  if (!cta) return null;

  const adLabel = lang === 'de' ? 'Anzeige' : 'Sponsored';
  const partnerLabel =
    cta.kind === 'amazon' ? 'Amazon' :
    cta.kind === 'nordvpn' ? 'NordVPN' :
    cta.kind === 'surfshark' ? 'Surfshark' :
    cta.kind === 'protonvpn' ? 'Proton VPN' :
    cta.kind === 'hostinger' ? 'Hostinger' :
    null;

  if (variant === 'callout') {
    // Slightly bolder side-style box, good for after paragraph 6 (deeper in the article).
    return (
      <aside className="my-8 rounded-xl border-l-4 border-accent bg-bg-card/60 px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] uppercase tracking-wider text-accent font-bold">{adLabel}</span>
          {partnerLabel && <span className="text-[10px] text-muted">· {partnerLabel}</span>}
        </div>
        <div className="font-display font-bold text-base mb-1">{cta.title}</div>
        <p className="text-sm text-white/70 mb-3">{cta.body}</p>
        <a
          href={cta.ref}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-semibold transition"
        >
          {cta.cta} <span aria-hidden>→</span>
        </a>
      </aside>
    );
  }

  // Compact horizontal layout — sits well after paragraph 3 without disrupting reading flow.
  return (
    <div className="my-6 rounded-xl bg-gradient-to-r from-accent/5 to-bg-card/60 border border-white/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] uppercase tracking-wider text-muted">{adLabel}</span>
          {partnerLabel && <span className="text-[10px] text-muted">· {partnerLabel}</span>}
        </div>
        <div className="font-display font-semibold text-sm leading-snug">{cta.title}</div>
        <p className="text-xs text-white/60 mt-0.5 line-clamp-2">{cta.body}</p>
      </div>
      <a
        href={cta.ref}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="shrink-0 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold transition whitespace-nowrap"
      >
        {cta.cta} <span aria-hidden>→</span>
      </a>
    </div>
  );
}
