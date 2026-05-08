export const metadata = {
  title: 'Newsletter — coming soon',
  description: 'The Byte-Pulse daily newsletter is not yet active.',
  alternates: { languages: { 'en-US': '/newsletter', 'de-DE': '/de/newsletter' } },
};

export default function NewsletterPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">📬</div>
      <h1 className="font-display font-extrabold text-4xl tracking-tight">Newsletter — coming soon</h1>
      <p className="text-white/70 mt-3 text-lg">
        We&apos;re still finding our editorial voice. The daily newsletter will launch once we have
        consistent quality across enough categories. Thanks for your patience.
      </p>
      <p className="text-sm text-muted mt-6">
        In the meantime: subscribe to the <a href="/feed.xml" className="text-accent">RSS feed</a>.
      </p>
    </div>
  );
}
