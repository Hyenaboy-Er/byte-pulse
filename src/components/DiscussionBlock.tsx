// Article-end Discussion block — visible user-interaction signal.
//
// AdSense audit (PDF 02.06.2026) flagged "Comments or user interaction
// visible" as missing. We don't run an open comments section by design
// (spam + moderation overhead on a newsroom of our size). Instead we
// surface the same engagement vectors a comments thread would:
//
//   - "Discuss on Bluesky" — opens a Bluesky compose with the article URL
//   - "Discuss on X" — opens an X compose pre-filled with title + URL
//   - "Email the desk" — mailto: link to corrections@byte-pulse.net with
//     subject pre-filled with article title
//   - "Submit a tip" — link to /contact
//
// Every link is a real, dismissible interaction point — so the audit's
// engagement-visibility heuristic finds something concrete on every
// article page, and readers actually have a way to talk back.

import Link from 'next/link';

const BLUESKY_PROFILE = 'byte-pulse.bsky.social';
const X_HANDLE = 'bytePulsenew';

interface Props {
  title: string;
  url: string;
}

export default function DiscussionBlock({ title, url }: Props) {
  const bskyText = encodeURIComponent(`${title} ${url}`);
  const xText = encodeURIComponent(title);
  const xUrl = encodeURIComponent(url);
  const mailto = `mailto:editorial@byte-pulse.net?subject=${encodeURIComponent(
    `Re: ${title}`,
  )}`;

  return (
    <section
      aria-labelledby="discuss-h"
      className="mt-12 rounded-2xl bg-bg-card border border-white/5 p-6"
    >
      <h2
        id="discuss-h"
        className="font-display font-extrabold text-xl tracking-tight mb-1"
      >
        Discuss this story
      </h2>
      <p className="text-sm text-white/70 leading-snug mb-5">
        Got a take, a correction, or a follow-up tip? Reply where you read —
        we read everything.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <a
          href={`https://bsky.app/intent/compose?text=${bskyText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-accent/40 hover:bg-white/[0.02] transition"
        >
          <span aria-hidden="true" className="text-lg">🦋</span>
          <span>
            <span className="block text-sm font-semibold">Discuss on Bluesky</span>
            <span className="block text-xs text-muted">
              @{BLUESKY_PROFILE}
            </span>
          </span>
        </a>

        <a
          href={`https://twitter.com/intent/tweet?text=${xText}&url=${xUrl}&via=${X_HANDLE}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-accent/40 hover:bg-white/[0.02] transition"
        >
          <span aria-hidden="true" className="text-lg">𝕏</span>
          <span>
            <span className="block text-sm font-semibold">Discuss on X</span>
            <span className="block text-xs text-muted">@{X_HANDLE}</span>
          </span>
        </a>

        <a
          href={mailto}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-accent/40 hover:bg-white/[0.02] transition"
        >
          <span aria-hidden="true" className="text-lg">✉️</span>
          <span>
            <span className="block text-sm font-semibold">Email the desk</span>
            <span className="block text-xs text-muted">
              editorial@byte-pulse.net
            </span>
          </span>
        </a>

        <Link
          href="/contact"
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 hover:border-accent/40 hover:bg-white/[0.02] transition"
        >
          <span aria-hidden="true" className="text-lg">💡</span>
          <span>
            <span className="block text-sm font-semibold">Submit a tip</span>
            <span className="block text-xs text-muted">/contact</span>
          </span>
        </Link>
      </div>

      <p className="mt-5 text-xs text-muted">
        Found an error? File a correction at{' '}
        <Link href="/corrections" className="text-accent hover:underline">
          /corrections
        </Link>
        . Substantive corrections are logged publicly.
      </p>
    </section>
  );
}
