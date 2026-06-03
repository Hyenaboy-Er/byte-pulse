// Byte-Pulse Nightly mit Danny Williams — Homepage-Block für den letzten
// nächtlichen Broadcast. Ohne Client-State: wir lesen das YouTube-Channel-
// Feed-RSS, schnappen die neueste Video-ID, fertig. Kein API-Key, keine
// OAuth-Komplexität, kein Quota.
//
// Server-Komponente mit ISR (revalidate 30 Min) — Caching durch Next.js.
import Link from 'next/link';

const CHANNEL_HANDLE = 'byte-pulsenet';                  // @byte-pulsenet
const CHANNEL_ID     = 'UC205iPFJOmacCEn37A7_gRw';        // youtube channel id
const FALLBACK_ID    = 'i3UmHX2SOuE';                    // letzter bekannter Broadcast, wenn RSS scheitert

async function fetchLatestVideoId(): Promise<{ id: string; title: string }> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`,
      { next: { revalidate: 1800 }, signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) throw new Error('rss ' + res.status);
    const xml = await res.text();
    // <entry><yt:videoId>...</yt:videoId><title>...</title>
    const idMatch = xml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
    const titleMatch = xml.match(/<entry>[\s\S]*?<title>([^<]+)<\/title>/);
    if (idMatch && titleMatch) {
      return { id: idMatch[1], title: titleMatch[1] };
    }
  } catch {
    // ignore — fall back below
  }
  return { id: FALLBACK_ID, title: 'Byte-Pulse Nightly' };
}

export default async function DannyWilliamsBroadcast() {
  const { id, title } = await fetchLatestVideoId();
  const youtubeUrl = `https://www.youtube.com/watch?v=${id}`;
  const channelUrl = `https://www.youtube.com/@${CHANNEL_HANDLE}`;

  return (
    <section className="mt-14 mb-4 rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-bg-card to-bg-elevated">
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-0">
        {/* Embed */}
        <div className="relative aspect-video bg-black md:rounded-l-2xl overflow-hidden">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 w-full h-full"
            loading="lazy"
          />
        </div>

        {/* Side panel */}
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="text-xs uppercase tracking-widest text-accent font-bold inline-flex items-center gap-2 mb-3">
            <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-accent live-dot" />
            Byte-Pulse Nightly
          </div>
          <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight leading-tight mb-2">
            Danny Williams — today&apos;s tech, in three minutes.
          </h2>
          <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-bold text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-full px-2 py-0.5 mb-3 w-fit">
            <span>AI-generated anchor</span>
          </div>
          <p className="text-white/70 text-sm md:text-base mb-5">
            Every night we wrap the day&apos;s biggest tech stories into one
            anchor-style broadcast. The on-screen anchor is AI-synthesised;
            scripts are written and reviewed by our editorial team.
            Subscribe and we land in your feed.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full bg-accent hover:bg-accent-hover text-sm font-bold transition"
            >
              ▶ Watch now
            </a>
            <a
              href={channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-full border border-white/15 hover:border-white/40 text-sm font-semibold transition"
            >
              Subscribe on YouTube
            </a>
            <Link
              href="/about"
              className="px-4 py-2 rounded-full text-white/65 hover:text-white text-sm transition"
            >
              How we make it
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
