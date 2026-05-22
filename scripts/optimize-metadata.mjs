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

const OPENAI_KEY = process.env.OPENAI_API_KEY;

const SYSTEM = `You are an elite social-media growth strategist for "Byte-Pulse",
a tech-news brand targeting a US / English-speaking audience. Given one tech
article, produce the HIGHEST-PERFORMING metadata for short-form video
(TikTok / Reels / Shorts) and for YouTube.

You deeply understand: scroll-stopping hooks, curiosity gaps, the TikTok and
YouTube recommendation algorithms, and search SEO. Never use clickbait that the
content can't deliver. US English only.

Return STRICT JSON, nothing else:
{
  "title": "<punchy curiosity-driven hook headline, <= 70 chars>",
  "caption": "<1-3 short punchy sentences for the post body, ends with a soft
              call-to-action, NO hashtags inside>",
  "hashtags": ["<6-10 hashtags WITHOUT the # sign, no spaces, lowercase; mix
                2-3 broad high-volume ones (technews, tech, ai) with topic-
                specific ones>"],
  "tags": ["<8-12 plain SEO keyword tags/phrases for discovery, no # sign>"],
  "youtubeTitle": "<SEO + click-worthy YouTube title, <= 90 chars>",
  "youtubeDescription": "<2-3 sentences, naturally keyword-rich, then a new line
                          with: Read the full story: <the article url>>"
}`;

function fallback(article) {
  const t = article.title || 'Tech news that matters';
  return {
    title: t.slice(0, 70),
    caption: `${t}\n\nFull story on Byte-Pulse.Net — link in bio.`,
    hashtags: ['technews', 'tech', 'ai', 'gadgets', 'breakingnews'],
    tags: ['tech news', 'technology', 'ai', 'gadgets', 'byte-pulse'],
    youtubeTitle: t.slice(0, 90),
    youtubeDescription: `${article.excerpt || t}\n\nRead the full story: ${article.url || 'https://byte-pulse.net'}`,
  };
}

export async function optimizeMetadata(article) {
  if (!OPENAI_KEY) return fallback(article);
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
    const p = JSON.parse(data.choices[0].message.content);
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
