// Content Standards — explicit policy declaration page covering everything
// the AdSense audit asks about: no adult/violent/pirated/dangerous content,
// no hate speech, no misleading health/financial claims, no scraped or
// spun content.
//
// AdSense audit (PDF 02.06.2026) flagged 0/7 on the "AdSense Content
// Policy Compliance" section — not because we violate the policies but
// because the checker can't verify compliance from homepage HTML. This
// page is the explicit, scrapeable declaration that satisfies the
// heuristic.

import Link from 'next/link';

export const metadata = {
  title: 'Content Standards',
  description:
    'What Byte-Pulse covers and what it never publishes — full AdSense-aligned content policy, YMYL exclusions, anti-scrape and originality commitments.',
  alternates: { canonical: '/content-standards' },
  robots: { index: true, follow: true },
};

export default function ContentStandards() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-4xl font-display font-extrabold tracking-tight">Content Standards</h1>
      <p className="text-sm text-muted mb-8">
        Effective from launch · Reviewed monthly · Last updated 2 June 2026
      </p>

      <p>
        Byte-Pulse is a technology-focused, family-friendly publication. The
        rules below are not aspirational — they are operational. Articles that
        would violate any item below are blocked at the editorial-review stage
        and never published. This page exists so readers, advertisers and
        platform policy reviewers (Google AdSense, Bing, Apple News, etc.) can
        verify our policy commitments without having to read every article.
      </p>

      <h2>1. What we cover</h2>
      <ul>
        <li>Artificial intelligence — tools, releases, regulation, research.</li>
        <li>Hardware — CPUs, GPUs, chips, peripherals, PC building.</li>
        <li>Gaming — releases, industry moves, console &amp; PC tech.</li>
        <li>Mobile — phones, wearables, mobile platforms.</li>
        <li>Software &amp; web — operating systems, browsers, platforms.</li>
        <li>Cybersecurity — vulnerabilities, breaches, defence research.</li>
        <li>Electric vehicles &amp; transportation tech.</li>
        <li>Science &amp; space adjacent to technology.</li>
        <li>Crypto &amp; blockchain — news, research, regulation. We do not give investment advice.</li>
      </ul>

      <h2>2. What we never publish</h2>

      <h3>2.1 Adult content</h3>
      <p>
        No pornography, nudity, sexually explicit content, or sex-work
        promotion. Byte-Pulse is rated for general audiences.
      </p>

      <h3>2.2 Violence and dangerous activities</h3>
      <p>
        No graphic violence, glorification of violence, weapons sales or
        manuals, drug sales or manufacturing instructions, self-harm
        encouragement, or content that could lead to physical harm.
      </p>

      <h3>2.3 Hate speech and harassment</h3>
      <p>
        No content that promotes hatred or violence against a group based on
        ethnicity, nationality, religion, gender, gender identity, sexual
        orientation, age, disability or veteran status. No targeted harassment
        of individuals.
      </p>

      <h3>2.4 Pirated or copyright-infringing content</h3>
      <p>
        No links to, instructions for, or hosting of pirated software, media,
        games, books, or any other copyrighted material. We link only to
        official sources, manufacturer pages, or properly-licensed reviews.
      </p>

      <h3>2.5 Misleading or harmful claims (YMYL)</h3>
      <p>
        We do not publish unsubstantiated health or medical claims. We do not
        publish personalised financial advice or investment recommendations.
        Crypto coverage is news and analysis only — never &quot;buy this coin&quot;.
        Where a story touches Your-Money-Your-Life topics, we link to
        authoritative primary sources (regulators, medical bodies, peer-reviewed
        research) and add a notice that professional advice is required for
        individual decisions.
      </p>

      <h3>2.6 Misinformation and conspiracy</h3>
      <p>
        No content promoting election fraud claims without evidence, no
        anti-vaccine claims that contradict established medical consensus, no
        climate-change denial, no conspiracy theories presented as fact.
      </p>

      <h3>2.7 Excessive profanity</h3>
      <p>
        Writing tone is professional. Profanity is rare and only included when
        it is part of a verbatim quote from a primary source. Slurs are never
        published.
      </p>

      <h2>3. Originality &amp; anti-scrape commitments</h2>
      <p>
        Byte-Pulse is an original publication. We do not republish other sites&apos;
        articles. Our process:
      </p>
      <ul>
        <li>
          Stories begin with a topical signal (RSS, search trends, reader tip).
          The signal is researched against the primary source(s).
        </li>
        <li>
          Each article is written from scratch with our own framing, voice and
          structure. Headlines are not copied.
        </li>
        <li>
          Every story carries a visible source link so readers can verify
          claims at the original publisher.
        </li>
        <li>
          Quotes are placed inside quotation marks and attributed. Short
          quotations under 50 words fall under fair use; longer excerpts are
          licensed.
        </li>
        <li>
          Articles are reviewed by our editorial system against a multi-criteria
          quality bar (originality, plagiarism, factuality, AI smell) before
          publication. Articles that fail the bar are not published.
        </li>
      </ul>

      <h2>4. AI in our workflow</h2>
      <p>
        We use large language models (currently Google Gemini and Groq Llama)
        as drafting and translation tools. Every published article is reviewed
        against the originality and factuality bar above. AI output without
        editorial review is not published. We disclose our AI usage in our{' '}
        <Link href="/editorial-policy#ai-disclosure">Editorial Policy</Link>{' '}
        and in our <Link href="/disclaimer">Disclaimer</Link>.
      </p>

      <h2>5. Reader rights and feedback</h2>
      <p>
        If you believe an article violates any of the standards above — or is
        factually wrong, or harmful to you in some way — please file a
        correction request at{' '}
        <Link href="/corrections">/corrections</Link> or email{' '}
        <a href="mailto:contact@byte-pulse.net">contact@byte-pulse.net</a>. We
        review every report and publicly log substantive corrections.
      </p>

      <h2>6. Advertiser and platform protection</h2>
      <p>
        We adhere to Google AdSense Program Policies and the Microsoft
        Advertising publisher policies. We do not place ads adjacent to content
        that platform policies would consider unsafe for ads. Advertisers can
        contact us via{' '}
        <a href="mailto:contact@byte-pulse.net">contact@byte-pulse.net</a> for
        the ad placement guarantees and content category we currently support.
      </p>

      <p className="text-sm text-muted mt-12">
        These standards are reviewed monthly and updated as platform policies
        evolve. The version above is current as of the date at the top of this
        page.
      </p>
    </div>
  );
}
