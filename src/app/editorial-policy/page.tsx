// Editorial Policy — Google's E-E-A-T evaluators look for this exact page.
// Substack, TechCrunch, The Verge all publish one. Covers: who writes, how,
// fact-check pipeline, correction policy, AI disclosure, advertising
// boundaries, complaints process.

import Link from 'next/link';

export const metadata = {
  title: 'Editorial Policy',
  description: 'How Byte-Pulse sources, drafts, fact-checks and publishes — full editorial standards.',
  alternates: { canonical: '/editorial-policy' },
  robots: { index: true, follow: true },
};

export default function EditorialPolicy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-4xl font-display font-extrabold tracking-tight">Editorial Policy</h1>
      <p className="text-sm text-muted mb-8">Last updated: 12 May 2026 · Reviewed regularly</p>

      <p>
        Byte-Pulse is a bilingual tech news magazine. We publish coverage of artificial intelligence,
        gaming, hardware, mobile, software, security, EVs, science, crypto and web platforms. This
        page sets out the editorial standards we hold ourselves to.
      </p>

      <h2>Who we are</h2>
      <p>
        Byte-Pulse is operated by BRL Vision Solutions, a German company based in Leverkusen
        (full company details in our <Link href="/impressum">Impressum</Link>). The editorial team
        is a small group of specialist editors — see <Link href="/authors">Editorial Team</Link>{' '}
        for bylines and expertise areas.
      </p>

      <h2>How a story is made</h2>
      <ol>
        <li>
          <strong>Sourcing.</strong> Our researcher pipeline monitors a curated whitelist of trusted
          tech sources (The Verge, TechCrunch, Heise, Golem, 9to5Mac, Engadget, Android Police,
          Reuters, AP, Hacker News, Reddit, official company blogs). Every story is anchored to at
          least one cited primary source.
        </li>
        <li>
          <strong>Drafting.</strong> A first draft is written from the source material with our own
          editorial angle — typically a European perspective and what the news means for the reader.
          We use AI tools to accelerate this step.
        </li>
        <li>
          <strong>Fact-check.</strong> An automated reviewer cross-checks every claim against the
          cited source. Stories that fail the factuality threshold (numbers don&apos;t match, claims
          unsupported, sources missing) are blocked from publishing.
        </li>
        <li>
          <strong>Editor review.</strong> The editor responsible for the category signs off on the
          article. The byline on the published piece is that editor — they take responsibility for
          accuracy, framing and tone.
        </li>
        <li>
          <strong>Translation.</strong> Stories are translated to German (or English, if the source
          was German) by a native-fluent translation model and reviewed for idiomatic accuracy.
        </li>
        <li>
          <strong>Quality monitoring.</strong> After publication our quality-auditor agent re-checks
          articles daily for dead links, broken images, hallucinated facts, and signs of low-quality
          drafting. Failures trigger a correction or unpublish.
        </li>
      </ol>

      <h2>AI tooling — what we use, what we don&apos;t</h2>
      <p>
        We use AI assistance throughout the editorial pipeline. Specifically:
      </p>
      <ul>
        <li><strong>Drafting:</strong> we use OpenAI GPT-4 and Google Gemini to produce a first draft from the source.</li>
        <li><strong>Fact-check:</strong> Gemini verifies every quantitative claim against the source URL.</li>
        <li><strong>Translation:</strong> Gemini translates between English and German.</li>
        <li><strong>Headline optimisation:</strong> AI helps surface stronger headline phrasings, which a human editor approves.</li>
      </ul>
      <p>
        We do <strong>not</strong>:
      </p>
      <ul>
        <li>Fabricate quotes or attribute statements to people who didn&apos;t say them.</li>
        <li>Invent product names, prices, dates, or company decisions.</li>
        <li>Publish AI-generated images of real people or events.</li>
        <li>Re-publish another outlet&apos;s reporting wholesale — every article links to the original.</li>
      </ul>

      <h2>Sources and citations</h2>
      <p>
        Every article links to its primary source(s) at the bottom of the piece. Where we synthesise
        across multiple sources, all are linked. If we add background or context that came from our
        team&apos;s general knowledge rather than the cited source, we mark it as such
        (&quot;Background:&quot; or &quot;Context:&quot;).
      </p>

      <h2>Corrections policy</h2>
      <p>
        If we make a factual error, we correct it. Visible corrections:
      </p>
      <ul>
        <li>The article&apos;s &quot;Updated&quot; timestamp is visible in the byline.</li>
        <li>For material corrections (anything affecting the headline or a numerical claim), we add
            a &quot;Correction:&quot; note at the bottom of the piece explaining what changed and when.</li>
        <li>You can report errors any time to{' '}
            <a href="mailto:corrections@byte-pulse.net">corrections@byte-pulse.net</a>. We aim to
            confirm receipt within 24 hours and act within 48 hours where the error is straightforward.</li>
      </ul>

      <h2>Independence from advertisers</h2>
      <p>
        Byte-Pulse earns revenue through display ads (Google AdSense and similar) and affiliate links
        (mainly Amazon, see our <Link href="/affiliate-disclosure">Affiliate Disclosure</Link>).
      </p>
      <p>
        Advertisers and affiliate partners <strong>do not see articles before publication</strong> and{' '}
        <strong>have no influence on editorial coverage</strong>. We will publish negative coverage
        of an advertiser if the story warrants it; we will not publish positive coverage of a
        product solely because it&apos;s linked in our affiliate programs.
      </p>
      <p>
        Sponsored content, if we ever publish any, is clearly labelled &quot;Sponsored&quot; or
        &quot;Anzeige&quot; at the top of the piece.
      </p>

      <h2>Complaints and disputes</h2>
      <p>
        If you have a complaint about an article that goes beyond a simple factual correction —
        defamation concern, copyright claim, takedown request — email{' '}
        <a href="mailto:hello@byte-pulse.net">hello@byte-pulse.net</a>. We follow German Telemedia
        and EU Digital Services Act standards for complaint handling.
      </p>

      <h2>Open contact</h2>
      <p>
        Press / partnership enquiries: <a href="mailto:press@byte-pulse.net">press@byte-pulse.net</a><br />
        Factual corrections: <a href="mailto:corrections@byte-pulse.net">corrections@byte-pulse.net</a><br />
        Privacy / legal: <a href="mailto:hello@byte-pulse.net">hello@byte-pulse.net</a>
      </p>
    </div>
  );
}
