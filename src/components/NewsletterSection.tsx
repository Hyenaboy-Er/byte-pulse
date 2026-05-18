// Full-width newsletter section for the homepage. Conversion-optimised:
// clear value prop, frequency expectation set up-front, trust signals
// (free / no spam / unsubscribe), and a single strong CTA. Dark-theme
// gradient band so it reads as a deliberate "moment" on the page rather
// than an afterthought banner.
//
// Server component wrapper — the interactive bit is the NewsletterForm
// client island it renders, so the rest of the homepage stays static/ISR.
import NewsletterForm from './NewsletterForm';

export default function NewsletterSection() {
  return (
    <section className="mt-16 mb-4">
      <div className="relative overflow-hidden rounded-3xl border border-accent/25 bg-gradient-to-br from-accent/15 via-bg-card to-bg-card px-6 py-10 sm:px-12 sm:py-14">
        {/* Decorative glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            </span>
            The Byte-Pulse Brief
          </div>

          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            The 5 tech stories worth your time — Mon, Wed &amp; Fri
          </h2>

          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/70">
            AI, hardware, gaming, security. We read the firehose so you don&apos;t have to —
            fact-checked, no hype, no 800-word intros. Three curated emails a week — never daily spam.
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span> Free, forever
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span> 3× a week, never daily spam
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span> Unsubscribe in one click
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent">✓</span> No spam, no selling your data
            </li>
          </ul>

          <div className="mt-7 max-w-md">
            <NewsletterForm />
          </div>

          <p className="mt-3 text-xs text-white/40">
            Double opt-in. We&apos;ll send one confirmation email — click the link and you&apos;re in.
          </p>
        </div>
      </div>
    </section>
  );
}
