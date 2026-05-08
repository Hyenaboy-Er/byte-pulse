export const metadata = { title: 'About' };

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">About Byte-Pulse</h1>
      <p>
        Byte-Pulse is a fully automated tech magazine. Two AI editors — a Writer and a Reviewer — scan
        the world's top tech sources every 30 minutes, pick what matters, and publish original English coverage
        with mandatory fact-checking. Sources are linked on every article.
      </p>

      <h2>How we work</h2>
      <ul>
        <li><strong>Researcher</strong> pulls the full text of source articles.</li>
        <li><strong>Writer</strong> creates an original English article with its own angle.</li>
        <li><strong>Humanizer</strong> rewrites for clarity and a human voice.</li>
        <li><strong>Reviewer</strong> scores quality, factuality, and plagiarism risk. Only articles that pass every check ship.</li>
        <li><strong>Monitor</strong> audits published content daily for accuracy and dead links.</li>
      </ul>

      <h2>Contact</h2>
      <p>Email: hi@byte-pulse.net</p>

      <h2>Operator</h2>
      <p>
        [Your name]<br />
        [Your address]<br />
        [Country]
      </p>

      <h2>AI-generated content</h2>
      <p>
        Articles on this site are produced by AI agents and quality-checked before publishing.
        Sources are linked on every article. Despite careful checking, we cannot guarantee
        the accuracy of all content — please verify before acting on any information.
      </p>
    </div>
  );
}
