// Disclaimer Page — explicit AdSense + general liability disclaimer.
// Required by AdSense audit (PDF 02.06.2026: "Disclaimer page present (if
// applicable) & visible"). Covers AI-content disclosure, affiliate links,
// no-financial-advice, third-party-content, accuracy-not-guaranteed.

import Link from 'next/link';

export const metadata = {
  title: 'Disclaimer',
  description:
    'Byte-Pulse disclaimer: AI-assisted reporting, affiliate links, accuracy, fair use, and what we do (and do not) guarantee.',
  alternates: { canonical: '/disclaimer' },
  robots: { index: true, follow: true },
};

export default function Disclaimer() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-4xl font-display font-extrabold tracking-tight">Disclaimer</h1>
      <p className="text-sm text-muted mb-8">Last updated: 1 June 2026</p>

      <p>
        Byte-Pulse (operated by BRL Vision Solutions, Germany — see{' '}
        <Link href="/impressum">Impressum</Link>) publishes daily technology news, reviews and
        analysis. This page sets out important limitations of that coverage. By using this site
        you agree to the points below.
      </p>

      <h2>1. Information, not advice</h2>
      <p>
        Articles on Byte-Pulse are written for general information and educational purposes
        only. Nothing on this site is:
      </p>
      <ul>
        <li>investment, financial or trading advice;</li>
        <li>professional security, legal or compliance advice;</li>
        <li>a recommendation to buy, sell or hold any product, security or cryptocurrency;</li>
        <li>medical advice, even when we cover health-tech topics.</li>
      </ul>
      <p>
        For decisions with real-world consequences (money, health, security), consult a
        qualified professional in your jurisdiction.
      </p>

      <h2>2. Accuracy &amp; timeliness</h2>
      <p>
        We strive to be accurate and to link the original sources for every story (see our{' '}
        <Link href="/editorial-policy">Editorial Policy</Link> for our fact-check pipeline). But
        technology moves fast: prices, specs, availability, software behaviour and policies change
        without notice. We do <strong>not</strong> warrant that any article remains accurate after
        publication. If you spot an error, please{' '}
        <Link href="/corrections">submit a correction</Link>.
      </p>

      <h2>3. AI-assisted reporting</h2>
      <p>
        Some of our research, drafting and translation is assisted by large language models
        (currently Google Gemini and others). Every published article is reviewed by our
        editorial system against a multi-criteria quality bar and against the original source
        material. AI output without human-aligned review is not published. We disclose the role
        of AI tooling in our{' '}
        <Link href="/editorial-policy#ai-disclosure">Editorial Policy</Link>.
      </p>

      <h2>4. Affiliate &amp; sponsored content</h2>
      <p>
        Some links on Byte-Pulse are affiliate links — if you buy through them we may receive a
        small commission at no extra cost to you. These links never influence what we cover or
        what we recommend. We label affiliate links and mark sponsored placements clearly. See
        our <Link href="/affiliate-disclosure">Affiliate Disclosure</Link> for the full picture.
      </p>

      <h2>5. Third-party content</h2>
      <p>
        Headlines, quotes, images, screenshots, embeds (YouTube, Bluesky) and trademarks from
        third parties remain the property of their respective owners. We use them under fair-use
        / fair-dealing principles for reporting, commentary and review. If you are a rights
        holder and believe a specific use exceeds those bounds, contact us at{' '}
        <a href="mailto:contact@byte-pulse.net">contact@byte-pulse.net</a> and we will respond
        promptly.
      </p>

      <h2>6. External links</h2>
      <p>
        Byte-Pulse links out to many third-party sites (sources, manufacturers, regulators).
        We do <strong>not</strong> control or endorse the content, products or practices of
        external sites and accept no responsibility for them. Following external links is at
        your own risk.
      </p>

      <h2>7. Advertising</h2>
      <p>
        Byte-Pulse displays advertising served by third parties (e.g. Google AdSense once
        approved). Ad content is selected by the ad network, not by our editorial team, and may
        be personalised based on cookies. See our{' '}
        <Link href="/privacy">Privacy Policy</Link> for what data ads can access and how to opt
        out.
      </p>

      <h2>8. No warranty</h2>
      <p>
        Byte-Pulse and its content are provided <em>“as is”</em>, without warranty of any kind,
        express or implied, including but not limited to merchantability, fitness for a
        particular purpose, or non-infringement. To the maximum extent permitted by applicable
        law, BRL Vision Solutions is not liable for any direct, indirect, incidental,
        consequential or punitive damages arising from your use of, or reliance on, the site.
      </p>

      <h2>9. Reader responsibility</h2>
      <p>
        Decisions you make based on Byte-Pulse content are your own. We encourage independent
        verification — that is exactly why we link the original sources on every article.
      </p>

      <h2>10. Changes</h2>
      <p>
        We may update this disclaimer at any time. The “Last updated” date at the top reflects
        the most recent revision. Continued use of Byte-Pulse after changes constitutes
        acceptance.
      </p>

      <hr className="my-8 border-white/10" />
      <p className="text-sm text-muted">
        Questions about this disclaimer? Reach the editorial team via{' '}
        <Link href="/contact">contact</Link> or at{' '}
        <a href="mailto:contact@byte-pulse.net">contact@byte-pulse.net</a>.
      </p>
    </div>
  );
}
