// Affiliate Disclosure — FTC/EU compliant disclosure of our affiliate
// relationships. Required by Amazon Associates Operating Agreement (we must
// disclose), AdSense policy (no hidden commercial relationships), and EU
// consumer protection law.

import Link from 'next/link';

export const metadata = {
  title: 'Affiliate Disclosure',
  description: 'Byte-Pulse uses affiliate links to fund the site. This page explains how, with whom, and what it means for you.',
  alternates: { canonical: '/affiliate-disclosure' },
  robots: { index: true, follow: true },
};

export default function AffiliateDisclosure() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-4xl font-display font-extrabold tracking-tight">Affiliate Disclosure</h1>
      <p className="text-sm text-muted mb-8">Last updated: 12 May 2026</p>

      <p>
        Byte-Pulse participates in several affiliate marketing programs. This means we may earn a
        small commission when you click certain links on our site and purchase a product or service
        from the merchant. <strong>This never costs you anything extra</strong> — the price you pay
        is identical to a non-affiliate visit.
      </p>

      <h2>The programs we participate in</h2>

      <h3>Amazon Associates</h3>
      <p>
        Byte-Pulse is a participant in the Amazon Services LLC Associates Program (Tracking ID{' '}
        <code>bytepulse01-20</code> for amazon.com) and the Amazon EU Associates Programme (Tracking
        ID <code>bytepulse-21</code> for amazon.de, amazon.co.uk, amazon.fr, amazon.it, amazon.es).
        Both are affiliate advertising programs designed to provide a means for sites to earn
        advertising fees by advertising and linking to Amazon.
      </p>
      <p>
        As required by the Amazon Associates Operating Agreement:
      </p>
      <blockquote>
        <em>
          &quot;As an Amazon Associate I earn from qualifying purchases.&quot;
        </em>
      </blockquote>

      <h3>Other affiliate networks</h3>
      <p>
        We may also link to products via the following networks. Where we do, the link is labelled
        as &quot;Sponsored&quot; or &quot;Anzeige&quot; on the article page:
      </p>
      <ul>
        <li><strong>Skimlinks</strong> — automatic affiliate routing across 50+ retailers</li>
        <li><strong>Awin</strong> — VPN, hosting, security software (e.g. NordVPN, Surfshark, Hostinger)</li>
        <li><strong>Impact, CJ Affiliate, PartnerStack</strong> — SaaS and tech tools</li>
      </ul>

      <h2>How we choose what to link</h2>
      <p>
        We link to products and services we believe are relevant to the story or genuinely useful to
        our readers. We do <strong>not</strong>:
      </p>
      <ul>
        <li>Insert affiliate links into articles purely because the commission is high.</li>
        <li>Write positive coverage about a product solely because we earn affiliate revenue from it.</li>
        <li>Hide affiliate relationships — every link goes through a labelled &quot;Sponsored · Amazon&quot;
            (or equivalent partner) card on the article page.</li>
      </ul>
      <p>
        Our <Link href="/editorial-policy">editorial policy</Link> requires that affiliate
        relationships have <strong>no influence</strong> on which stories we cover or what tone we
        take with them. We will publish negative coverage of an Amazon-sold product if the story
        warrants it.
      </p>

      <h2>What this means for you</h2>
      <ul>
        <li>You pay the <strong>same price</strong> whether you click an affiliate link or go to the
            merchant directly.</li>
        <li>You can <strong>opt out</strong> of every affiliate link by going to the merchant&apos;s
            site directly via search instead of clicking through ours.</li>
        <li>Our affiliate income funds the editorial team and keeps the site free to read — no
            paywall, no &quot;register to keep reading&quot; nag.</li>
      </ul>

      <h2>Display advertising</h2>
      <p>
        Separately from affiliate links, the site may display Google AdSense advertisements once
        the AdSense application is approved. Ads are clearly distinct from editorial content. See
        our <Link href="/privacy">Privacy Policy</Link> for how ad-related data is handled.
      </p>

      <h2>Questions</h2>
      <p>
        If you spot an affiliate link that isn&apos;t clearly labelled, or you have any other
        question about our commercial relationships, email{' '}
        <a href="mailto:hello@byte-pulse.net">hello@byte-pulse.net</a>. We&apos;ll investigate and
        respond.
      </p>
    </div>
  );
}
