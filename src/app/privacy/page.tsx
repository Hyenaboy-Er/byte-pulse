// Privacy Policy — GDPR-compliant, AdSense-ready.
// Discloses every third-party processor: Vercel, Cloudflare, Turso, OpenAI,
// Gemini, Resend, AdSense, Amazon Associates, IndexNow, OneSignal, social
// auto-posters. Sets out legal bases (Art. 6 GDPR), retention periods, data
// subject rights (Art. 15-22), international transfers (SCCs), and the
// supervisory-authority complaint route. Roughly 2000 words — well above
// AdSense's depth threshold.

export const metadata = {
  title: 'Privacy Policy',
  description: 'How Byte-Pulse handles personal data — GDPR-compliant disclosure of every processor.',
  alternates: { languages: { 'en-US': '/privacy', 'de-DE': '/de/privacy' } },
  robots: { index: true, follow: true },
};

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">Privacy Policy</h1>

      <p className="text-sm text-muted">Last updated: 12 May 2026 · Effective immediately</p>

      <p>
        This Privacy Policy explains how Byte-Pulse (operated by BRL Vision Solutions, Okerstr. 24, 51371
        Leverkusen, Germany) collects, uses, shares, and protects information when you visit byte-pulse.net
        or interact with our newsletter. We operate under the European General Data Protection Regulation
        (GDPR / DSGVO) and the German Federal Data Protection Act (BDSG).
      </p>

      <h2>1. Controller</h2>
      <p>
        Data controller in the sense of Art. 4 (7) GDPR is:
      </p>
      <p>
        BRL Vision Solutions<br />
        Okerstr. 24<br />
        51371 Leverkusen<br />
        Germany<br />
        Managing director: Serhat Er<br />
        Phone: +49 2143 3014059<br />
        Email: <a href="mailto:editorial@byte-pulse.net">editorial@byte-pulse.net</a>
      </p>
      <p>
        We have not appointed a Data Protection Officer because we fall below the statutory thresholds of
        § 38 BDSG. Privacy enquiries are handled directly by the managing director.
      </p>

      <h2>2. Scope</h2>
      <p>
        This policy applies to byte-pulse.net, all its subdomains, and any service we operate at those URLs
        (article pages, newsletter signup, author pages, category indexes, RSS feeds). It does not apply to
        third-party sites we link to (read their own policies before submitting data there).
      </p>

      <h2>3. What we collect, why, and on what legal basis</h2>

      <h3>3.1 Server logs</h3>
      <p>
        Whenever your browser loads any page or asset from our site, our hosting provider Vercel Inc.
        automatically records: IP address (truncated where possible), user-agent string, the URL you
        requested, the referring URL (if any), HTTP status, and a timestamp. Purpose: operating the site
        securely, debugging errors, and protecting against abuse (rate-limiting, bot detection). Retention:
        ≤ 30 days, then deleted by Vercel. Legal basis: <strong>Art. 6 (1)(f) GDPR</strong> — legitimate
        interest in a stable, secure service.
      </p>

      <h3>3.2 Cookies and similar technologies</h3>
      <p>
        Byte-Pulse itself sets the following client-side storage only:
      </p>
      <ul>
        <li>
          <strong>Consent state</strong> (<code>bp_consent_v1</code> in localStorage): remembers your choice
          on the cookie banner so we don&apos;t ask again. Strictly necessary — set whether you accept or
          reject.
        </li>
        <li>
          <strong>Newsletter cooldown</strong> (<code>bp_nl_v1</code> in localStorage): prevents the
          newsletter modal from re-appearing for 7 days after you dismiss it. Strictly necessary for UX.
        </li>
        <li>
          <strong>Saved articles</strong> (<code>bp_saved</code> in localStorage, if you use the heart
          button): a local list of slugs you bookmarked. Never sent to our server.
        </li>
      </ul>
      <p>
        Third-party cookies set by Cloudflare (DNS / CDN) may include <code>__cf_bm</code> for bot detection
        and <code>cf_clearance</code> for security challenges. These are strictly necessary for the site to
        load. Legal basis: <strong>Art. 6 (1)(f) GDPR</strong>.
      </p>
      <p>
        When advertising or analytics is enabled (see §3.6 and §3.7), additional cookies are set only after
        your explicit consent. Legal basis: <strong>Art. 6 (1)(a) GDPR</strong>.
      </p>

      <h3>3.3 Article views (anonymous counter)</h3>
      <p>
        We increment an internal &quot;views&quot; counter per article so we can sort our most-read
        coverage. The counter is a single integer per article — no IP, no fingerprint, no user identifier
        is stored. Legal basis: <strong>Art. 6 (1)(f) GDPR</strong> — legitimate interest in editorial
        analytics.
      </p>

      <h3>3.4 Newsletter (Resend)</h3>
      <p>
        If you enter your email in the newsletter modal or footer form, we store: your email address, a
        confirmation token, a timestamp, and your confirmation status. You receive a one-time confirmation
        email; only after you click the link in that email do we add you to the daily-digest distribution.
        This is the <strong>double-opt-in</strong> standard required under Art. 7 GDPR.
      </p>
      <p>
        Email delivery is handled by <strong>Resend Inc.</strong> (USA). Your email address is shared with
        Resend solely for the purpose of sending the confirmation and digest emails. Resend processes data
        under EU Standard Contractual Clauses (Art. 46 GDPR). Retention: until you unsubscribe (one-click
        link in every email).
      </p>
      <p>
        Legal basis: <strong>Art. 6 (1)(a) GDPR</strong> — your explicit consent.
      </p>

      <h3>3.5 Contact email</h3>
      <p>
        If you email us at editorial@byte-pulse.net (or any byte-pulse.net address), we store your email and
        message contents only as long as needed to handle your enquiry, plus statutory retention (typically
        6 months for general correspondence, 6 years where commercial-tax law applies).
      </p>
      <p>
        Legal basis: <strong>Art. 6 (1)(b) GDPR</strong> (pre-contractual) or <strong>(f)</strong>
        (legitimate interest in answering you).
      </p>

      <h3>3.6 Advertising — Google AdSense (when enabled)</h3>
      <p>
        Once activated, byte-pulse.net displays advertisements served by{' '}
        <strong>Google Ireland Ltd.</strong> via Google AdSense. AdSense uses cookies and similar
        identifiers to serve relevant ads and to measure ad performance. Google may use information about
        your visits to this and other sites to provide better advertising — see Google&apos;s{' '}
        <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">
          partner-sites policy
        </a>{' '}
        and{' '}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer">
          advertising privacy policy
        </a>.
      </p>
      <p>
        You can opt out of personalised ads in your{' '}
        <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer">
          Google Ad Settings
        </a>{' '}
        or via{' '}
        <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
          aboutads.info/choices
        </a>{' '}
        (industry-wide opt-out).
      </p>
      <p>
        Legal basis: <strong>Art. 6 (1)(a) GDPR</strong> — your explicit consent given on our cookie banner.
        If you decline, AdSense is loaded in non-personalised mode (NPA) where supported.
      </p>

      <h3>3.7 Analytics — Vercel Analytics & Vercel Speed Insights</h3>
      <p>
        We use <strong>Vercel Analytics</strong> (page views, referrers, device-class aggregate) and{' '}
        <strong>Vercel Speed Insights</strong> (Core Web Vitals — LCP, FID, CLS). Vercel anonymises these
        signals on collection — no IP address, no fingerprint, no cookie is set by these tools.
      </p>
      <p>
        Legal basis: <strong>Art. 6 (1)(f) GDPR</strong> — legitimate interest in measuring site
        performance. Because no personal data is collected, no consent is required (recital 26 GDPR).
      </p>

      <h3>3.8 Affiliate links — Amazon, Skimlinks, others</h3>
      <p>
        Some links on byte-pulse.net are <em>affiliate links</em>. When you click one, you are routed to a
        partner site (e.g. amazon.com, amazon.de) which sets its own cookies and may share commission with
        us if you purchase. We disclose this on every article via the &quot;Sponsored · Affiliate link&quot;
        label. We do not pass your data to the partner — the link click itself is the only signal.
      </p>
      <p>
        Read Amazon&apos;s own policy at{' '}
        <a href="https://www.amazon.com/privacy" target="_blank" rel="noopener noreferrer">
          amazon.com/privacy
        </a>{' '}
        (US) and{' '}
        <a href="https://www.amazon.de/datenschutz" target="_blank" rel="noopener noreferrer">
          amazon.de/datenschutz
        </a>{' '}
        (DE).
      </p>

      <h3>3.9 Push notifications — OneSignal (opt-in only)</h3>
      <p>
        We may offer browser push notifications via <strong>OneSignal Inc.</strong> (USA). Push is strictly
        opt-in via the browser&apos;s native permission prompt. If you accept, OneSignal stores a push token
        and your topic preferences to deliver notifications. You can revoke at any time in your browser
        settings or by clicking &quot;Unsubscribe&quot; in any notification.
      </p>
      <p>
        Legal basis: <strong>Art. 6 (1)(a) GDPR</strong>. Standard Contractual Clauses apply for the US
        transfer.
      </p>

      <h3>3.10 Hosting and CDN</h3>
      <p>
        Site infrastructure:
      </p>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (USA) — application hosting and edge CDN. Standard Contractual
          Clauses; Data Processing Addendum on file.
        </li>
        <li>
          <strong>Cloudflare Inc.</strong> (USA) — DNS resolution. SCCs; DPA on file.
        </li>
        <li>
          <strong>Turso (ChiselStrike Inc.)</strong> — database. EU region used; data processed in the EU.
        </li>
      </ul>

      <h3>3.11 AI / content tooling</h3>
      <p>
        Our editorial pipeline uses <strong>OpenAI</strong> and <strong>Google Gemini</strong> APIs for
        drafting, fact-checking, and translation. Only public source-article text and our own internal
        prompts are sent — no user data, no IP, no email is ever passed to these LLM providers.
      </p>

      <h3>3.12 Search-engine ping (IndexNow)</h3>
      <p>
        After every publish we ping IndexNow (Bing, Yandex, Seznam, Naver). The ping contains only the
        public article URL — no user data.
      </p>

      <h3>3.13 Social broadcast</h3>
      <p>
        Each published article is automatically shared to our public accounts on X (Twitter), Mastodon, and
        Bluesky. Only public article metadata is shared (title, excerpt, URL). No user data leaves the
        site.
      </p>

      <h2>4. International transfers</h2>
      <p>
        Some of our processors are located in the United States (Vercel, Cloudflare, Resend, OpenAI, Google,
        OneSignal). Transfers are protected by EU Standard Contractual Clauses (Art. 46 (2)(c) GDPR) and,
        where applicable, the EU-US Data Privacy Framework. The relevant SCCs and certifications are
        available on each provider&apos;s website.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Under the GDPR you have the right to:
      </p>
      <ul>
        <li><strong>Access</strong> — request a copy of the personal data we hold about you (Art. 15)</li>
        <li><strong>Rectification</strong> — correct inaccurate data (Art. 16)</li>
        <li><strong>Erasure</strong> — &quot;right to be forgotten&quot; (Art. 17)</li>
        <li><strong>Restriction</strong> of processing (Art. 18)</li>
        <li><strong>Data portability</strong> — receive your data in a machine-readable format (Art. 20)</li>
        <li>
          <strong>Object</strong> to processing based on legitimate interest (Art. 21) — including a right
          to object to direct marketing at any time
        </li>
        <li><strong>Withdraw consent</strong> at any time, without effect on prior processing (Art. 7 (3))</li>
        <li>
          <strong>Lodge a complaint</strong> with the supervisory authority. In Germany this is the data-
          protection authority of your federal state — for our Leverkusen base that is{' '}
          <strong>Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)</strong>,
          Kavalleriestr. 2-4, 40213 Düsseldorf, +49 211 38424-0,{' '}
          <a href="https://www.ldi.nrw.de" target="_blank" rel="noopener noreferrer">www.ldi.nrw.de</a>.
        </li>
      </ul>
      <p>
        To exercise any of these rights, write to{' '}
        <a href="mailto:editorial@byte-pulse.net">editorial@byte-pulse.net</a>. We will respond within 30 days
        (extendable by 60 days for complex requests, with notice).
      </p>

      <h2>6. Retention</h2>
      <p>
        We delete or anonymise personal data as soon as the purpose it was collected for has been fulfilled,
        unless statutory retention obligations require longer storage (e.g. § 257 HGB / § 147 AO for
        commercial correspondence). Logs: 30 days. Newsletter: until unsubscribe. Contact mails: 6 months
        (24 months if a commercial relationship is established).
      </p>

      <h2>7. Children</h2>
      <p>
        Byte-Pulse does not knowingly collect data from children under 16. The newsletter signup form
        requires you to confirm you are of legal age in your jurisdiction. If you become aware that a
        minor has provided data, please contact us and we will delete it.
      </p>

      <h2>8. Security</h2>
      <p>
        All traffic to byte-pulse.net is encrypted with HTTPS (TLS 1.2+). The database is hosted in the EU
        with at-rest encryption. Administrative access is protected by passwords + 2FA. We follow OWASP
        baseline practices for the application code.
      </p>

      <h2>9. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy when we add or remove services. The current version is always
        accessible at <a href="https://www.byte-pulse.net/privacy">byte-pulse.net/privacy</a>. Material
        changes will be communicated via a notice at the top of this page.
      </p>

      <h2>10. Contact</h2>
      <p>
        Privacy enquiries:{' '}
        <a href="mailto:editorial@byte-pulse.net">editorial@byte-pulse.net</a>
      </p>
    </div>
  );
}
