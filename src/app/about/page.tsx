export const metadata = {
  title: 'About',
  description: 'About Byte-Pulse — bilingual tech news magazine.',
  alternates: { languages: { 'en-US': '/about', 'de-DE': '/de/about' } },
};

export default function About() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12 prose-tech">
      <h1 className="text-3xl font-display font-extrabold mb-6">About Byte-Pulse</h1>

      {/* Founder spotlight — E-E-A-T signal: real human, real photo, real
          credentials, real social profiles. */}
      <section className="not-prose flex flex-col sm:flex-row items-start gap-5 mb-8 p-5 rounded-2xl bg-bg-card border border-white/5">
        <img
          src="/authors/serhat-er.jpg"
          alt="Serhat Er, Founder & Editor-in-Chief of Byte-Pulse"
          className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-2 ring-accent/30 shrink-0"
          loading="eager"
        />
        <div>
          <div className="text-xs uppercase tracking-wider text-accent font-bold">
            Founder &amp; Editor-in-Chief
          </div>
          <h2 className="font-display font-extrabold text-2xl mt-0.5 mb-2">Serhat Er</h2>
          <p className="text-white/85 leading-relaxed mb-3">
            I founded Byte-Pulse because European tech coverage rarely lands in US blogs
            in time. I run the editorial direction, review every AI and security story
            personally, and sign off on each article before publish. Based in Leverkusen.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.linkedin.com/in/serhat-er-brlvision/"
              target="_blank"
              rel="noopener noreferrer me"
              className="px-3 py-1.5 rounded-full bg-accent hover:bg-accent-hover text-xs font-semibold transition"
            >
              LinkedIn
            </a>
            <a
              href="/author/serhat-er"
              className="px-3 py-1.5 rounded-full border border-white/15 hover:border-white/40 text-xs font-semibold transition"
            >
              Author page
            </a>
            <a
              href="mailto:editorial@byte-pulse.net"
              className="px-3 py-1.5 rounded-full border border-white/15 hover:border-white/40 text-xs font-semibold transition"
            >
              editorial@byte-pulse.net
            </a>
          </div>
        </div>
      </section>

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
