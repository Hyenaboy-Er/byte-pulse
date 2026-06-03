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
  foryou, foryoupage, shorts, youtubeshorts. The remaining 3-5 hashtags
  are topic-specific (e.g. ai, iphone, gaming).
- YOUTUBE DESCRIPTION must start with "U.S. tech news from Byte-Pulse" or
  reference "America" / "the U.S." in the first sentence.
- AVOID German place names, "EU", "European" framing in caption /
  description / hashtags. Use them inside the body only if the story is
  genuinely EU-policy.

You deeply understand: scroll-stopping hooks, curiosity gaps, the TikTok
and YouTube recommendation algorithms, and search SEO. Never use clickbait
the content can't deliver.

Return STRICT JSON, nothing else:
{
  "title": "<punchy curiosity-driven hook headline, <= 70 chars, US English>",
  "caption": "<1-3 short punchy sentences for the post body, ends with a soft
              call-to-action, NO hashtags inside, US English>",
  "hashtags": ["<6-10 hashtags WITHOUT the # sign, no spaces, lowercase;
                MUST include at least 3 from {usa, american, americatechnews,
                ustech, siliconvalley, fyp, foryou, foryoupage, shorts,
                youtubeshorts}; remainder topic-specific>"],
  "tags": ["<8-12 plain SEO keyword tags/phrases for discovery, no # sign,
            include at least 2 with 'US' / 'America' framing like
            'US tech news' or 'American tech'>"],
  "youtubeTitle": "<SEO + click-worthy YouTube title, <= 90 chars,
                    explicitly American audience>",
  "youtubeDescription": "<First line MUST start with 'U.S. tech news from
                          Byte-Pulse' or similar America-anchor phrase.
                          Then 1-2 keyword-rich sentences, then a blank
                          line, then 'Read the full story: <the article url>'>"
}`;

function fallback(article) {
  const t = article.title || 'Tech news that matters';
  // Fallback metadata still encodes the US-targeting signal we want from
  // the LLM path — hashtags include #usa/#fyp/#shorts, description leads
  // with the America-anchor phrase. If Groq is down, we should not lose
  // the geo signal.
  return {
    title: t.slice(0, 70),
    caption: `${t}\n\nFull story at Byte-Pulse.Net — link in bio.`,
    hashtags: ['usa', 'fyp', 'shorts', 'technews', 'ustech', 'ai', 'breakingnews'],
    tags: ['US tech news', 'American tech', 'tech news', 'technology', 'ai', 'gadgets', 'byte-pulse'],
    youtubeTitle: t.slice(0, 90),
    youtubeDescription: `U.S. tech news from Byte-Pulse. ${article.excerpt || t}\n\nRead the full story: ${article.url || 'https://byte-pulse.net'}`,
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
    return {
      title: (p.title || fb.title).slice(0, 80),
      caption: p.caption || fb.caption,
      hashtags: clean(p.hashtags) || fb.hashtags,
      tags: clean(p.tags) || fb.tags,
      youtubeTitle: (p.youtubeTitle || fb.youtubeTitle).slice(0, 100),
      youtubeDescription: p.youtubeDescription || fb.youtubeDescription,
    };
  } catch {
    return fallback(article);
  }
}
