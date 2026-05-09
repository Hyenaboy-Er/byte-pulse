export const metadata = {
  title: 'About',
  description: 'About Byte-Pulse — bilingual tech news magazine.',
  alternates: { languages: { 'en-US': '/about', 'de-DE': '/de/about' } },
};

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">About Byte-Pulse</h1>

      <p>
        Byte-Pulse is a bilingual (English &amp; German) tech news magazine. We track the
        most important sources in AI, gaming, hardware, mobile, software, security and EVs,
        pick what actually matters, and publish original coverage. Sources are linked on
        every article so you can read further at any time.
      </p>

      <h2>Editorial process</h2>
      <p>
        Every story goes through a multi-stage editorial pipeline before publishing:
      </p>
      <ul>
        <li><strong>Sourcing</strong> — we pull the full text of the original articles.</li>
        <li><strong>Writing</strong> — we craft an original English summary with our own angle.</li>
        <li><strong>Editing</strong> — language is polished for clarity and voice.</li>
        <li><strong>Quality review</strong> — scores for accuracy, originality and plagiarism risk. Only stories that pass every check ship.</li>
        <li><strong>Translation</strong> — every article is published in German as well.</li>
        <li><strong>Monitoring</strong> — published content is audited daily for accuracy and dead links.</li>
      </ul>

      <h2>Use of AI tooling (transparency notice)</h2>
      <p>
        To keep up with the speed of the tech industry we use AI-assisted tooling
        throughout the editorial pipeline (sourcing, drafting, translation, fact-checking).
        Every article is fact-checked against the linked source before publishing. Despite
        these safeguards, we cannot guarantee the accuracy of every detail — please verify
        before acting on any information. If you spot an error, mail us and we&apos;ll
        correct it.
      </p>

      <h2>Contact</h2>
      <p>
        General: <a href="mailto:hi@byte-pulse.net">hi@byte-pulse.net</a><br />
        Press / partnerships: <a href="mailto:press@byte-pulse.net">press@byte-pulse.net</a><br />
        Corrections: <a href="mailto:corrections@byte-pulse.net">corrections@byte-pulse.net</a><br />
        Phone (hotline): +49 2143 3014059
      </p>

      <h2>Legal</h2>
      <p>
        Byte-Pulse is operated from Germany. Full company information and legal notices
        (German „Impressum" per § 5 TMG) are on the <a href="/de/about">German About page</a>.
      </p>

      <p className="mt-8 text-sm text-muted">
        Operator: BRL Vision Solutions, Okerstr. 24, 51371 Leverkusen, Germany.<br />
        Managing director: Serhat Er.<br />
        Responsible for editorial content per § 18 (2) MStV: Serhat Er, address above.
      </p>
    </div>
  );
}
