import NewsletterForm from '@/components/NewsletterForm';

export const metadata = {
  title: 'The Byte-Pulse Daily — tech news that matters, every morning',
  description:
    'One short email a day: the 5 tech stories worth your time — AI, hardware, gaming, security. Free, fact-checked, unsubscribe anytime.',
  alternates: { canonical: '/newsletter', languages: { 'en-US': '/newsletter', 'de-DE': '/de/newsletter' } },
};

export default function NewsletterPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-center">
        <div className="text-5xl mb-4">📬</div>
        <h1 className="font-display font-extrabold text-4xl tracking-tight">
          The Byte-Pulse Daily
        </h1>
        <p className="text-white/70 mt-3 text-lg">
          The 5 tech stories that actually matter — in your inbox by 8&nbsp;AM. AI,
          hardware, gaming, security. Fact-checked, no hype, no 800-word intros.
        </p>
      </div>

      <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/60">
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> Free, forever</li>
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> One email/day, never more</li>
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> Unsubscribe in one click</li>
        <li className="flex items-center gap-2"><span className="text-accent">✓</span> No spam, no data selling</li>
      </ul>

      <div className="mt-8 max-w-md mx-auto">
        <NewsletterForm />
        <p className="mt-3 text-center text-xs text-white/40">
          Double opt-in: we send one confirmation email — click the link and you&apos;re in.
          (Check your spam folder the first time and mark us &quot;not spam&quot; — we&apos;re a young
          domain still building sender reputation.)
        </p>
      </div>

      <p className="text-sm text-muted mt-10 text-center">
        Prefer a reader? Grab the <a href="/feed.xml" className="text-accent">RSS feed</a>.
      </p>
    </div>
  );
}
