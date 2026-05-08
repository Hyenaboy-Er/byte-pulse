// Fetches the og:image / twitter:image from a source URL.
// Best-effort: returns null on any failure.

const OG_RE = /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/i;
const OG_RE_REVERSE = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src)["']/i;

export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const ctrl = AbortSignal.timeout(8000);
    const res = await fetch(url, {
      signal: ctrl,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 TechPulsBot/1.0',
        'accept': 'text/html,application/xhtml+xml',
        'accept-language': 'de,en;q=0.8',
      },
    });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 200_000);
    const m = html.match(OG_RE) ?? html.match(OG_RE_REVERSE);
    if (!m) return null;
    let img = m[1].trim();
    if (img.startsWith('//')) img = 'https:' + img;
    if (img.startsWith('/')) {
      const u = new URL(url);
      img = `${u.protocol}//${u.host}${img}`;
    }
    if (!img.startsWith('http')) return null;
    return img;
  } catch {
    return null;
  }
}
