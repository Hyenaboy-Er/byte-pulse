// Crawl the public live site and build a static JSON snapshot of every
// article. Used as a fallback when the production DB is read-blocked
// (Turso free-plan quota exhausted). The snapshot keeps Google Search
// happy — same URLs, same content, same metadata — until the quota
// resets and the DB becomes the source of truth again.
//
// Output: data/articles-snapshot.json  (full content)
//         data/articles-index.json     (lite, for listings — no body)
//
// Idempotent: re-running overwrites the snapshot. Safe to retry on flakes.

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = 'https://www.byte-pulse.net';
const CONCURRENCY = 10;
const MAX_RETRIES = 3;
const SITEMAP_URL = `${SITE}/sitemap.xml`;

async function fetchText(url, attempt = 1) {
  try {
    const r = await fetch(url, { redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } catch (e) {
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, 500 * attempt));
      return fetchText(url, attempt + 1);
    }
    throw e;
  }
}

function decodeHtmlEntities(s) {
  if (!s) return s;
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x2F;/g, '/')
    .replace(/&#xa0;/g, ' ');
}

function extractMeta(html, key) {
  const re = new RegExp(`<meta\\s+(?:name|property)="${key}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re);
  return m ? decodeHtmlEntities(m[1]) : '';
}

function extractJsonLd(html) {
  const blocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]+?)<\/script>/g)];
  for (const b of blocks) {
    try {
      const d = JSON.parse(b[1]);
      const arr = Array.isArray(d) ? d : [d];
      for (const e of arr) {
        if (e && e['@type'] === 'NewsArticle') return e;
      }
    } catch {}
  }
  return null;
}

function extractArticleBody(html) {
  // Build markdown-ish from the rendered HTML inside the main article container.
  // Strategy: find <article ...> ... </article>, strip nav/aside/footer/script/style/svg,
  // walk paragraphs + headings + lists in order.
  let m = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/);
  let inner = m ? m[1] : html;

  // Remove non-content blocks
  inner = inner.replace(/<script[\s\S]*?<\/script>/g, '');
  inner = inner.replace(/<style[\s\S]*?<\/style>/g, '');
  inner = inner.replace(/<svg[\s\S]*?<\/svg>/g, '');
  inner = inner.replace(/<nav[\s\S]*?<\/nav>/g, '');
  inner = inner.replace(/<aside[\s\S]*?<\/aside>/g, '');
  inner = inner.replace(/<footer[\s\S]*?<\/footer>/g, '');
  inner = inner.replace(/<form[\s\S]*?<\/form>/g, '');

  // Walk top-level paragraphs and headings in document order
  const blocks = [...inner.matchAll(/<(h2|h3|h4|p|ul|ol|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/g)];
  const out = [];
  for (const [_, tag, raw] of blocks) {
    const text = decodeHtmlEntities(raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (!text || text.length < 4) continue;
    if (text.toLowerCase().startsWith('subscribe')) continue;
    if (text.toLowerCase().startsWith('newsletter')) continue;
    if (tag === 'h2') out.push(`## ${text}`);
    else if (tag === 'h3') out.push(`### ${text}`);
    else if (tag === 'h4') out.push(`#### ${text}`);
    else if (tag === 'blockquote') out.push(`> ${text}`);
    else out.push(text);
  }
  return out.join('\n\n');
}

function slugFromUrl(url) {
  const m = url.match(/\/article\/([^/?#]+)/);
  return m ? m[1] : null;
}

function categoryFromSection(section) {
  if (!section) return 'tech';
  return String(section).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tech';
}

async function parseArticle(url) {
  const html = await fetchText(url);
  const ld = extractJsonLd(html) || {};
  const slug = slugFromUrl(url);

  // Image (resolve through og-proxy back to the original where possible)
  const ogImage = extractMeta(html, 'og:image') || (ld.image?.url ?? '');
  // The og-proxy URL has the real source URL as ?url=…
  let imageUrl = ogImage;
  const proxyMatch = ogImage.match(/[?&]url=([^&]+)/);
  if (proxyMatch) {
    try { imageUrl = decodeURIComponent(proxyMatch[1]); } catch {}
  }

  const title = decodeHtmlEntities(ld.headline || extractMeta(html, 'og:title') || '');
  const excerpt = decodeHtmlEntities(ld.description || extractMeta(html, 'description') || '');
  const publishedAt = ld.datePublished || extractMeta(html, 'article:published_time') || null;
  const updatedAt = ld.dateModified || extractMeta(html, 'article:modified_time') || publishedAt;
  const category = categoryFromSection(ld.articleSection);
  const content = extractArticleBody(html);
  const author = ld.author?.name || 'Byte-Pulse Editorial';
  const wordCount = ld.wordCount || content.split(/\s+/).length;

  return {
    id: slug, // synthetic id from slug — fine for read-only fallback
    slug,
    title,
    subtitle: null,
    excerpt,
    content,
    category,
    tags: '[]',
    imageUrl: imageUrl || null,
    imageCredit: null,
    sourceUrl: '',
    sourceName: 'Byte-Pulse',
    originalTitle: null,
    qualityScore: 100, // snapshotted = trusted
    status: 'published',
    views: 0,
    publishedAt,
    createdAt: publishedAt,
    updatedAt,
    author,
    wordCount,
  };
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let idx = 0;
  let done = 0;
  const start = Date.now();
  async function next() {
    while (idx < items.length) {
      const i = idx++;
      try {
        results[i] = await worker(items[i], i);
      } catch (e) {
        results[i] = { __error: e.message, url: items[i] };
      }
      done++;
      if (done % 20 === 0 || done === items.length) {
        const rate = done / ((Date.now() - start) / 1000);
        console.log(`  [${done}/${items.length}] ${rate.toFixed(1)} req/s`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, next));
  return results;
}

async function main() {
  console.log('Fetching sitemap…');
  const sitemap = await fetchText(SITEMAP_URL);
  const urls = [...new Set(
    [...sitemap.matchAll(/<loc>([^<]+\/article\/[^<]+)<\/loc>/g)].map(m => m[1])
  )];
  console.log(`${urls.length} article URLs`);

  const articles = await runPool(urls, parseArticle);

  const ok = articles.filter(a => a && !a.__error && a.slug);
  const failed = articles.filter(a => a && a.__error);
  console.log(`OK: ${ok.length}   Failed: ${failed.length}`);
  if (failed.length) {
    console.log('First 5 failures:');
    failed.slice(0, 5).forEach(f => console.log(' ', f.url, '→', f.__error));
  }

  // Sort by publishedAt desc
  ok.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  const outDir = path.join(process.cwd(), 'data');
  await mkdir(outDir, { recursive: true });
  const fullPath = path.join(outDir, 'articles-snapshot.json');
  const indexPath = path.join(outDir, 'articles-index.json');

  await writeFile(fullPath, JSON.stringify(ok));
  // Index: drop body content for fast listing
  const index = ok.map(({ content, ...rest }) => rest);
  await writeFile(indexPath, JSON.stringify(index));

  const stat = (await readFile(fullPath)).length;
  const istat = (await readFile(indexPath)).length;
  console.log(`Wrote ${fullPath} (${(stat / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Wrote ${indexPath} (${(istat / 1024).toFixed(1)} KB)`);
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
