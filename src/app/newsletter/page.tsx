import NewsletterForm from '@/components/NewsletterForm';

export const metadata = { title: 'Subscribe to the newsletter', description: 'The top tech stories every weekday at 7:00 AM.' };

export default function NewsletterPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="text-5xl mb-4">📬</div>
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Newsletter</h1>
      <p className="text-white/70 mt-3 text-lg">
        Every weekday at 7:00 AM in your inbox: the five most important tech stories of the last 24 hours,
        curated by two AI editors — no filter bubble, no fluff.
      </p>

      <div className="mt-8">
        <NewsletterForm />
      </div>

      <div className="mt-10 grid grid-cols-3 gap-4 text-sm text-white/60">
        <div>
          <div className="text-2xl mb-1">⏱</div>
          <strong className="text-white">2-min read</strong>
          <div>Done before your coffee.</div>
        </div>
        <div>
          <div className="text-2xl mb-1">🚫</div>
          <strong className="text-white">No spam</strong>
          <div>Weekdays only, one email.</div>
        </div>
        <div>
          <div className="text-2xl mb-1">↗️</div>
          <strong className="text-white">One-click out</strong>
          <div>Unsubscribe in any email.</div>
        </div>
      </div>
    </div>
  );
}
