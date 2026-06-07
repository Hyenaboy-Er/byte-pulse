// KI-Agent: Metadaten-Optimierung.
//
// Erzeugt für einen Artikel die bestmöglichen Titel, Captions, Beschreibungen,
// Hashtags und Tags — plattform-optimiert (TikTok/Shorts/Reels + YouTube),
// US-Englisch, algorithmus-bewusst. Wird von post-to-buffer.mjs (TikTok) und
// später vom YouTube-Upload genutzt, damit JEDER Post optimal beschriftet ist.
//
// Exportiert optimizeMetadata(article) → { title, caption, hashtags[], tags[],
// youtubeTitle, youtubeDescription }. Bei LLM-Fehler: robuste Fallbacks aus
// den Artikeldaten, damit ein Post nie an fehlenden Metadaten scheitert.

// Groq Free Tier (Llama 3.3 70B) als Primary — kostenlos, gleiche API.
// Falls GROQ_API_KEY fehlt, fällt das Skript auf Fallback-Metadaten zurück
// (kein OpenAI-Quota-Crash mehr).
const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM = `You are an elite social-media growth strategist for "Byte-Pulse",
a tech-news brand. CRITICAL TARGETING RULE: the audience is U.S.-based.
Every signal you produce — copy, hashtags, hooks, references — must tell
both human viewers and the TikTok / YouTube recommendation algorithm that
this content is for an American audience.

WHY: byte-pulse is currently being algorithmically classified as German
because Serhat is in Germany; we need every metadata field to overwhelm
that geo-signal with American context.

US-TARGETING REQUIREMENTS (enforced in every output):
- AMERICAN ENGLISH spellings + idioms only ("color" not "colour",
  "customize" not "customise", "fall" not "autumn", "$" symbol).
- US REFERENCE FRAME: prices in dollars, dates in MM/DD/YYYY or "Month Day",
  reference American companies/regulators (FCC, FTC, Apple, Google,
  Microsoft) over European ones when both apply.
- HASHTAGS must include at least 3 explicitly US/algorithm tags from this
  pool: usa, american, americatechnews, ustech, siliconvalley, fyp,
  foryou, foryoupage, shorts, youtubeshorts. Plus MANDATORY AI-disclosure
  hashtags: aigenerated AND ainews (BOTH required, every post).
  The remaining 1-3 hashtags are topic-specific (e.g. iphone, gaming).
- YOUTUBE DESCRIPTION must start with "U.S. tech news from Byte-Pulse" or
  reference "America" / "the U.S." in the first sentence.
- AVOID German place names, "EU", "European" framing in caption /
  description / hashtags. Use them inside the body only if the story is
  genuinely EU-policy.

MANDATORY AI-DISCLOSURE (added 2026-06-07, non-negotiable):
- The on-screen news anchor (Danny Williams) is fully AI-generated:
  synthetic face, synthetic voice, AI-written script. Real news, AI delivery.
- Every "caption" MUST end with this exact line on its own line:
    🤖 AI-generated anchor · real news sourced from outlets like TechCrunch, The Verge & Heise.
- Every "youtubeDescription" MUST include this exact paragraph somewhere
  before the "Read the full story" line:
    🤖 About this video: Danny Williams is an AI-generated news anchor. The face and voice are synthesized; the stories are real and sourced from established outlets (TechCrunch, The Verge, Engadget, Heise, Golem, Ars Technica). Full transparency on byte-pulse.net/editorial-policy.
- The "youtubeTitle" MUST contain either "[AI Anchor]" prefix OR
  the suffix " (AI News)" — pick whichever fits the 90-char budget better.
- This is for TikTok + YouTube ToS compliance (synthetic media disclosure)
  and viewer trust. It is REQUIRED, not optional, not stylistic.

You deeply understand: scroll-stopping hooks, curiosity gaps, the TikTok
and YouTube recommendation algorithms, and search SEO. Never use clickbait
the content can't deliver.

Return STRICT JSON, nothing else:
{
  "title": "<punchy curiosity-driven hook headline, <= 70 chars, US English>",
  "caption": "<1-3 short punchy sentences for the post body, ends with a soft
              call-to-action, NO hashtags inside, US English. MUST end with
              the mandatory AI-disclosure line on its own line>",
  "hashtags": ["<6-10 hashtags WITHOUT the # sign, no spaces, lowercase;
                MUST include at least 3 from {usa, american, americatechnews,
                ustech, siliconvalley, fyp, foryou, foryoupage, shorts,
                youtubeshorts}; MUST include BOTH aigenerated and ainews;
                remainder topic-specific>"],
  "tags": ["<8-12 plain SEO keyword tags/phrases for discovery, no # sign,
            include at least 2 with 'US' / 'America' framing like
            'US tech news' or 'American tech', and at least 2 AI-disclosure
            tags like 'ai generated news' / 'ai news anchor'>"],
  "youtubeTitle": "<SEO + click-worthy YouTube title, <= 90 chars,
                    explicitly American audience, MUST contain '[AI Anchor]'
                    prefix or ' (AI News)' suffix>",
  "youtubeDescription": "<First line MUST start with 'U.S. tech news from
                          Byte-Pulse' or similar America-anchor phrase.
                          Then 1-2 keyword-rich sentences, then a blank
                          line, then the MANDATORY AI-disclosure paragraph,
                          then a blank line, then
                          'Read the full story: <the article url>'>"
}`;

// Mandatory AI-disclosure strings — used by fallback() AND by the
// post-LLM enforcement pass that runs even on successful LLM output.
// Single source of truth so the disclosure wording stays identical
// across every code path. Required by TikTok + YouTube synthetic-media
// policies (2024+) for any video using an AI face / AI voice.
export const AI_DISCLOSURE_CAPTION =
  '🤖 AI-generated anchor · real news sourced from outlets like TechCrunch, The Verge & Heise.';
export const AI_DISCLOSURE_YT_PARAGRAPH =
  '🤖 About this video: Danny Williams is an AI-generated news anchor. ' +
  'The face and voice are synthesized; the stories are real and sourced from ' +
  'established outlets (TechCrunch, The Verge, Engadget, Heise, Golem, Ars Technica). ' +
  'Full transparency on byte-pulse.net/editorial-policy.';

function fallback(article) {
  const t = article.title || 'Tech news that matters';
  // Fallback metadata still encodes the US-targeting signal we want from
  // the LLM path — hashtags include #usa/#fyp/#shorts, description leads
  // with the America-anchor phrase. If Groq is down, we should not lose
  // the geo signal. The AI-disclosure is ALSO baked in here so a Groq
  // outage cannot leak a non-disclosed post to TikTok/YouTube.
  const ytTitleBase = t.slice(0, 90 - 11); // reserve " (AI News)"
  return {
    title: t.slice(0, 70),
    caption: `${t}\n\nFull story at Byte-Pulse.Net — link in bio.\n\n${AI_DISCLOSURE_CAPTION}`,
    hashtags: ['usa', 'fyp', 'shorts', 'technews', 'ustech', 'aigenerated', 'ainews', 'breakingnews'],
    tags: ['US tech news', 'American tech', 'tech news', 'technology', 'ai generated news', 'ai news anchor', 'gadgets', 'byte-pulse'],
    youtubeTitle: `${ytTitleBase} (AI News)`,
    youtubeDescription:
      `U.S. tech news from Byte-Pulse. ${article.excerpt || t}\n\n` +
      `${AI_DISCLOSURE_YT_PARAGRAPH}\n\n` +
      `Read the full story: ${article.url || 'https://byte-pulse.net'}`,
  };
}

export async function optimizeMetadata(article) {
  if (!GROQ_KEY) return fallback(article);
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content:
            `Headline: ${article.title || ''}\n` +
            `Summary: ${article.excerpt || '(none)'}\n` +
            `Category: ${article.category || 'tech'}\n` +
            `Article URL: ${article.url || 'https://byte-pulse.net'}` },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!r.ok) return fallback(article);
    const data = await r.json();
    const raw = data.choices[0].message.content;
    // Llama occasionally wraps JSON in ```json fences — strip them.
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const p = JSON.parse(cleaned);
    // Robuste Übernahme mit Fallback pro Feld.
    const fb = fallback(article);
    const clean = (a) => Array.isArray(a) ? a.map((s) => String(s).replace(/^#/, '').trim()).filter(Boolean) : null;
    const out = {
      title: (p.title || fb.title).slice(0, 80),
      caption: p.caption || fb.caption,
      hashtags: clean(p.hashtags) || fb.hashtags,
      tags: clean(p.tags) || fb.tags,
      youtubeTitle: (p.youtubeTitle || fb.youtubeTitle).slice(0, 100),
      youtubeDescription: p.youtubeDescription || fb.youtubeDescription,
    };
    return enforceAiDisclosure(out);
  } catch {
    return fallback(article);
  }
}

// Belt-and-suspenders: even if the LLM ignored the disclosure mandate,
// this pass guarantees every output field carries the disclosure before
// it leaves this module. TikTok + YouTube ToS leave zero room for a
// "the model forgot" excuse.
function enforceAiDisclosure(m) {
  // 1. caption — append disclosure line if not already present
  if (!/AI[- ]generated/i.test(m.caption)) {
    m.caption = `${m.caption.trimEnd()}\n\n${AI_DISCLOSURE_CAPTION}`;
  }
  // 2. youtubeDescription — inject disclosure paragraph if not present
  if (!/AI[- ]generated/i.test(m.youtubeDescription)) {
    // Try to inject before the "Read the full story" line; otherwise append.
    const idx = m.youtubeDescription.indexOf('Read the full story');
    if (idx > 0) {
      m.youtubeDescription =
        m.youtubeDescription.slice(0, idx).trimEnd() +
        `\n\n${AI_DISCLOSURE_YT_PARAGRAPH}\n\n` +
        m.youtubeDescription.slice(idx);
    } else {
      m.youtubeDescription = `${m.youtubeDescription.trimEnd()}\n\n${AI_DISCLOSURE_YT_PARAGRAPH}`;
    }
  }
  // 3. youtubeTitle — ensure "[AI Anchor]" prefix or " (AI News)" suffix
  if (!/\bAI\b/i.test(m.youtubeTitle)) {
    const candidate = `${m.youtubeTitle.trim()} (AI News)`;
    m.youtubeTitle = candidate.length <= 100
      ? candidate
      : `[AI] ${m.youtubeTitle}`.slice(0, 100);
  }
  // 4. hashtags — guarantee 'aigenerated' + 'ainews' are present
  const lower = new Set(m.hashtags.map((h) => h.toLowerCase()));
  if (!lower.has('aigenerated')) m.hashtags.push('aigenerated');
  if (!lower.has('ainews')) m.hashtags.push('ainews');
  // 5. tags — guarantee an AI-disclosure tag is present
  const tagsLower = new Set(m.tags.map((t) => t.toLowerCase()));
  if (!Array.from(tagsLower).some((t) => /ai (generated|news)/i.test(t))) {
    m.tags.push('ai generated news');
  }
  return m;
}
