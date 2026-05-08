export const metadata = {
  title: 'About',
  description: 'About Byte-Pulse — fully automated bilingual tech magazine.',
  alternates: { languages: { 'en-US': '/about', 'de-DE': '/de/about' } },
};

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">About Byte-Pulse</h1>

      <p>
        Byte-Pulse is a fully automated, bilingual tech magazine (English &amp; German). Seven AI agents
        scan the world&apos;s top tech sources, pick what matters, and publish original coverage with
        mandatory fact-checking. Sources are linked on every article.
      </p>

      <h2>How we work</h2>
      <ul>
        <li><strong>Researcher</strong> — pulls the full text of source articles.</li>
        <li><strong>Writer</strong> — creates an original English article with its own angle.</li>
        <li><strong>Humanizer</strong> — rewrites for clarity and a human voice.</li>
        <li><strong>Reviewer</strong> — scores quality, factuality, and plagiarism risk. Only articles that pass every check ship.</li>
        <li><strong>Translator</strong> — produces a German version of every English article.</li>
        <li><strong>Monitor</strong> — audits published content daily for accuracy and dead links.</li>
        <li><strong>Keyword Research</strong> — tracks Hacker News, Reddit, and Google Suggest signals.</li>
      </ul>

      <h2>Editorial responsibility</h2>
      <p>
        Articles on this site are produced by AI agents and quality-checked before publishing. Sources are
        linked on every article. Despite careful checking, we cannot guarantee the accuracy of all content
        — please verify before acting on any information.
      </p>

      <h2>Contact</h2>
      <p>
        General: <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a><br />
        Press / partnerships: <a href="mailto:press@byte-pulse.net">press@byte-pulse.net</a><br />
        Phone (hotline): +49 2143 3014059
      </p>

      <h2>Legal</h2>
      <p>
        Byte-Pulse is operated from Germany. Full company information and legal notices (German „Impressum"
        per § 5 TMG) are on the <a href="/de/about">German About page</a>.
      </p>

      <p className="mt-8 text-sm text-muted">
        Operator: BRL Vision Solutions, Okerstr. 24, 51371 Leverkusen, Germany.<br />
        Managing director: Serhat Er.<br />
        Responsible for editorial content per § 18 (2) MStV: Serhat Er, address above.
      </p>
    </div>
  );
}
