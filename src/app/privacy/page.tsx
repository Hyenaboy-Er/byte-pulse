export const metadata = {
  title: 'Privacy Policy',
  description: 'How Byte-Pulse handles personal data.',
  alternates: { languages: { 'en-US': '/privacy', 'de-DE': '/de/privacy' } },
};

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Privacy Policy</h1>

      <p className="text-sm text-muted">Last updated: May 2026</p>

      <h2>Controller</h2>
      <p>
        BRL Vision Solutions<br />
        Okerstr. 24, 51371 Leverkusen, Germany<br />
        Email: <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a><br />
        Managing director: Serhat Er
      </p>

      <h2>What we collect</h2>
      <p>We aim to collect as little personal data as possible. The categories we currently process:</p>

      <h3>Server logs</h3>
      <p>
        When you visit byte-pulse.net, our hosting provider (Vercel Inc., USA) automatically records
        technical data: your IP address, user-agent, referrer, requested URL, and timestamp. Legal basis:
        <strong> Art. 6 (1)(f) GDPR</strong> — legitimate interest in operating the site securely. Logs
        are retained briefly (typically 30 days) and then deleted by the provider.
      </p>

      <h3>Cookies</h3>
      <p>
        The site itself does not set tracking cookies. Cloudflare (DNS provider) may set a small
        technical cookie for security; this is necessary for the site to load.
      </p>

      <h3>Advertising (when activated)</h3>
      <p>
        Google AdSense may be enabled in the future. When active, Google sets cookies to display
        personalized ads and measure performance. Legal basis: <strong>Art. 6 (1)(a) GDPR</strong> —
        consent (you will see a cookie banner). You can review Google&apos;s practices at{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          policies.google.com/technologies/ads
        </a>
        .
      </p>

      <h2>Recipients of your data</h2>
      <ul>
        <li>Vercel Inc. (hosting, USA — adequacy via SCCs)</li>
        <li>Cloudflare Inc. (DNS, USA — adequacy via SCCs)</li>
        <li>Turso (database, EU — Ireland)</li>
        <li>OpenAI (content generation — no user data is sent; only RSS source text)</li>
      </ul>

      <h2>Your rights (GDPR)</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Request access to your personal data (Art. 15)</li>
        <li>Request rectification (Art. 16) or erasure (Art. 17)</li>
        <li>Restrict processing (Art. 18)</li>
        <li>Data portability (Art. 20)</li>
        <li>Object to processing (Art. 21)</li>
        <li>
          Lodge a complaint with the supervisory authority (in Germany: the data-protection authority of
          your federal state, e.g. LDI NRW for North Rhine-Westphalia)
        </li>
      </ul>
      <p>
        To exercise any of these rights, email{' '}
        <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a>.
      </p>

      <h2>Newsletter</h2>
      <p>
        The newsletter is currently inactive. When it launches, we will only store your email address with
        explicit double-opt-in consent (Art. 6 (1)(a) GDPR). You will be able to unsubscribe at any time
        with one click.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this notice as the site evolves. The current version is always reachable at
        byte-pulse.net/privacy.
      </p>
    </div>
  );
}
