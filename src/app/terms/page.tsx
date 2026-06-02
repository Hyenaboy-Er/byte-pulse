// Terms of Service — English-language legal terms for using byte-pulse.net.
//
// AdSense audit (PDF 02.06.2026) flagged "Terms & Conditions page present
// & clear" as missing because the German Impressum was the only legal-
// terms page. This is the standalone English ToS so the audit and any
// English-speaking reader (including Google's reviewer) finds it where
// expected.

import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description:
    'The rules and terms that apply when you use Byte-Pulse. Plain-English version, last updated 2 June 2026.',
  alternates: { canonical: '/terms' },
  robots: { index: true, follow: true },
};

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-4xl font-display font-extrabold tracking-tight">Terms of Service</h1>
      <p className="text-sm text-muted mb-8">Last updated: 2 June 2026</p>

      <p>
        These Terms govern your use of Byte-Pulse (the site at{' '}
        <code>byte-pulse.net</code>) operated by BRL Vision Solutions, Germany.
        Full company details are in our <Link href="/impressum">Impressum</Link>.
        By using the site you agree to these terms.
      </p>

      <h2>1. What Byte-Pulse is</h2>
      <p>
        Byte-Pulse is a free, ad-supported online publication covering technology
        news — AI, hardware, gaming, mobile, software, security, science and EVs.
        We publish daily and update articles when we learn new facts.
      </p>

      <h2>2. Use of the site</h2>
      <p>You may:</p>
      <ul>
        <li>read articles for personal, non-commercial use;</li>
        <li>share links to articles on social platforms;</li>
        <li>quote short excerpts (under 50 words) with attribution and a backlink to the original article on byte-pulse.net.</li>
      </ul>
      <p>You may not:</p>
      <ul>
        <li>republish full articles on other sites or in other apps without written permission;</li>
        <li>train commercial AI models on Byte-Pulse content without a written licence;</li>
        <li>scrape the site at a rate above one request per second per IP, or in any way that places undue load on our infrastructure;</li>
        <li>use the site for anything illegal in your jurisdiction.</li>
      </ul>

      <h2>3. Intellectual property</h2>
      <p>
        Articles, layouts, code and the Byte-Pulse name are © BRL Vision Solutions
        and licensors. Headlines, images, quotes and trademarks of third parties
        are used under fair-use / fair-dealing principles for reporting and
        commentary. See our <Link href="/disclaimer">Disclaimer</Link> for the
        full third-party-content note.
      </p>

      <h2>4. User content (comments, tips)</h2>
      <p>
        Byte-Pulse does not host an open comments section. Reader tips and
        corrections sent to us via the <Link href="/contact">contact page</Link>{' '}
        or to <a href="mailto:contact@byte-pulse.net">contact@byte-pulse.net</a>{' '}
        may be used in coverage; we will attribute or anonymise on request.
      </p>

      <h2>5. Advertising and affiliate links</h2>
      <p>
        The site shows third-party ads (e.g. Google AdSense) and contains
        affiliate links. Ad selection is done by the ad network. Affiliate links
        earn us a small commission at no extra cost to you. Neither influences
        editorial decisions. See our{' '}
        <Link href="/affiliate-disclosure">Affiliate Disclosure</Link> and{' '}
        <Link href="/editorial-policy">Editorial Policy</Link>.
      </p>

      <h2>6. No professional advice</h2>
      <p>
        Articles are general information, not investment, legal, medical or
        professional advice. For decisions with real-world consequences please
        consult a qualified professional. The full disclaimer lives at{' '}
        <Link href="/disclaimer">/disclaimer</Link>.
      </p>

      <h2>7. Availability</h2>
      <p>
        We aim to keep the site online 24/7 but we don&apos;t guarantee
        uninterrupted availability. We may schedule maintenance, change the
        layout, or retire individual pages without notice.
      </p>

      <h2>8. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by applicable law, BRL Vision Solutions
        is not liable for any direct, indirect, incidental, consequential or
        punitive damages arising from your use of, or reliance on, the site.
        Nothing in these Terms limits liability that cannot be limited under
        applicable law (such as for gross negligence or wilful misconduct under
        German law).
      </p>

      <h2>9. Privacy</h2>
      <p>
        How we handle personal data is set out in our{' '}
        <Link href="/privacy">Privacy Policy</Link>. Please read it.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these Terms at any time. The &quot;Last updated&quot; date
        at the top reflects the most recent revision. Material changes will also
        be announced via the site&apos;s RSS feed and on our social channels.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These Terms are governed by the law of the Federal Republic of Germany,
        excluding its conflict-of-laws rules. Mandatory consumer protection
        provisions of the country where you have your habitual residence remain
        unaffected.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these Terms? Reach us via{' '}
        <Link href="/contact">/contact</Link> or at{' '}
        <a href="mailto:contact@byte-pulse.net">contact@byte-pulse.net</a>.
      </p>
    </div>
  );
}
