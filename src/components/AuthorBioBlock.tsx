// Author-Bio-Block — wird am Ende jedes Artikels gerendert. Sichtbares
// E-E-A-T-Signal: jeder Story-Reader sieht (a) ein echtes Foto, (b) Name +
// Rolle, (c) Kurz-Bio, (d) verifizierbare Social-Links. Google's manueller
// AdSense-Review prüft explizit, ob jeder Artikel einen identifizierbaren
// Autor mit Bio-Block hat. Ohne diesen Block: "low value" Risk.
import Link from 'next/link';
import type { Author } from '@/lib/authors';

function socialLabel(url: string): string {
  if (url.includes('linkedin.com')) return 'LinkedIn';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'X';
  if (url.includes('mastodon')) return 'Mastodon';
  if (url.includes('bsky.app')) return 'Bluesky';
  if (url.includes('youtube')) return 'YouTube';
  if (url.includes('tiktok')) return 'TikTok';
  return 'Website';
}

export default function AuthorBioBlock({ author, reviewedAt }: { author: Author; reviewedAt?: string }) {
  return (
    <section
      className="mt-14 pt-8 border-t border-white/10"
      itemScope
      itemType="https://schema.org/Person"
    >
      <div className="text-xs uppercase tracking-widest text-accent font-bold mb-3">
        About the author
      </div>
      <div className="flex flex-col sm:flex-row gap-5 items-start">
        {author.photo ? (
          <img
            src={author.photo}
            alt={`${author.name} — ${author.role}`}
            itemProp="image"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover ring-2 ring-accent/30 shrink-0"
            loading="lazy"
          />
        ) : (
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-2xl font-display font-extrabold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #064e3b 100%)' }}
            aria-hidden
          >
            {author.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <Link
            href={`/author/${author.slug}`}
            className="font-display font-extrabold text-xl tracking-tight hover:text-accent transition"
            itemProp="url"
          >
            <span itemProp="name">{author.name}</span>
          </Link>
          <div className="text-sm text-accent/90 mt-0.5" itemProp="jobTitle">
            {author.role}
          </div>
          <p className="text-white/80 text-sm leading-relaxed mt-2.5" itemProp="description">
            {author.bioEn}
          </p>

          {author.expertise.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {author.expertise.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-white/70"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {author.sameAs.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {author.sameAs.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer me"
                  itemProp="sameAs"
                  className="px-2.5 py-1 rounded-full border border-white/15 hover:border-white/40 text-[11px] font-semibold text-white/80 hover:text-white transition"
                >
                  {socialLabel(url)}
                </a>
              ))}
            </div>
          )}

          {reviewedAt && (
            <div className="mt-4 text-[11px] text-muted">
              Editorially reviewed
              {reviewedAt ? <> on <time dateTime={reviewedAt}>{new Date(reviewedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</time></> : null}.
              Spotted an error? <a href="mailto:corrections@byte-pulse.net" className="underline hover:text-accent">Tell us</a>.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
