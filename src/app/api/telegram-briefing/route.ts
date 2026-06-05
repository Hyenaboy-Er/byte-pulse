// Daily Telegram-Briefing — sammelt Reichweiten- und Pipeline-Zahlen aus
// externen Quellen (kein DB-Read), damit der Operator auch bei blockierter
// Turso-Quota ein verlässliches Tages-Update aufs Handy bekommt.
//
// Quellen:
//   - GitHub Commits (snapshot-sync = publizierte Artikel in 24h)
//   - Bing Webmaster API (Clicks / Impressions)
//   - Mastodon /accounts/:id  (Follower-Count, last_status_at)
//   - Bluesky public API (Follower-Count, Post-Count)
//
// Auth: CRON_SECRET (gleicher Pfad wie alle anderen Cron-Endpoints).
// Trigger: GitHub Actions cron 06:00 UTC = 08:00 Berlin.

import { NextResponse } from 'next/server';
import { tg } from '@/lib/telegram';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const REPO = process.env.GITHUB_REPO || 'Hyenaboy-Er/byte-pulse';
const GH_TOKEN = process.env.GITHUB_TOKEN_FOR_COMMITS;
const BING_KEY = process.env.BING_WEBMASTER_API_KEY;
const MASTODON_INSTANCE = process.env.MASTODON_INSTANCE;
const MASTODON_TOKEN = process.env.MASTODON_ACCESS_TOKEN;
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE || 'byte-pulse.bsky.social';

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 10_000): Promise<any | null> {
  try {
    const r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

async function publishedLast24h(): Promise<{ count: number; titles: string[] }> {
  if (!GH_TOKEN) return { count: 0, titles: [] };
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const url = `https://api.github.com/repos/${REPO}/commits?per_page=100&since=${since}`;
  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (!Array.isArray(data)) return { count: 0, titles: [] };
  const articleCommits = data.filter((c: any) => /chore: append .+ to recent/.test(c.commit?.message ?? ''));
  const titles = articleCommits.map((c: any) => {
    const m = (c.commit.message as string).match(/append (.+?) to recent/);
    return m ? m[1] : '';
  }).filter(Boolean).slice(0, 8);
  return { count: articleCommits.length, titles };
}

async function videoClipsLast24h(): Promise<number> {
  if (!GH_TOKEN) return 0;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const url = `https://api.github.com/repos/${REPO}/commits?per_page=100&since=${since}`;
  const data = await fetchJson(url, {
    headers: { Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json' },
  });
  if (!Array.isArray(data)) return 0;
  return data.filter((c: any) => /chore: record posted clip/.test(c.commit?.message ?? '')).length;
}

async function bingStats(): Promise<{ clicks7d: number; impressions7d: number } | null> {
  if (!BING_KEY) return null;
  const url = `https://ssl.bing.com/webmaster/api.svc/json/GetRankAndTrafficStats?siteUrl=https://www.byte-pulse.net&apikey=${BING_KEY}`;
  const data = await fetchJson(url);
  const rows = data?.d ?? [];
  if (!Array.isArray(rows)) return null;
  let c = 0, i = 0;
  for (const row of rows.slice(-7)) {
    c += row.Clicks ?? 0;
    i += row.Impressions ?? 0;
  }
  return { clicks7d: c, impressions7d: i };
}

async function mastodonStats(): Promise<{ followers: number; statuses: number; lastPost: string } | null> {
  if (!MASTODON_INSTANCE || !MASTODON_TOKEN) return null;
  const me = await fetchJson(`https://${MASTODON_INSTANCE}/api/v1/accounts/verify_credentials`, {
    headers: { Authorization: `Bearer ${MASTODON_TOKEN}` },
  });
  if (!me) return null;
  return {
    followers: me.followers_count ?? 0,
    statuses: me.statuses_count ?? 0,
    lastPost: (me.last_status_at ?? '').slice(0, 10),
  };
}

// Reichweite-Zahlen aus DB (2026-06-05 Serhat-Request: Briefing soll Views
// wieder zeigen). Best-effort — DB-read kann auf Turso quota-blockiert sein,
// dann liefern wir null und Briefing zeigt den Block aus statt zu crashen.
async function viewsStats(): Promise<{ totalViews: number; totalArticles: number; top5: Array<{ slug: string; title: string; views: number }> } | null> {
  try {
    const [agg, top5] = await Promise.all([
      prisma.article.aggregate({
        where: { status: 'published' },
        _sum: { views: true },
        _count: { _all: true },
      }),
      prisma.article.findMany({
        where: { status: 'published' },
        orderBy: { views: 'desc' },
        take: 5,
        select: { slug: true, title: true, views: true },
      }),
    ]);
    return {
      totalViews: agg._sum.views ?? 0,
      totalArticles: agg._count._all ?? 0,
      top5: top5.map((a) => ({ slug: a.slug, title: a.title, views: a.views ?? 0 })),
    };
  } catch {
    return null;
  }
}

async function blueskyStats(): Promise<{ followers: number; posts: number } | null> {
  const data = await fetchJson(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${BLUESKY_HANDLE}`);
  if (!data) return null;
  return { followers: data.followersCount ?? 0, posts: data.postsCount ?? 0 };
}

function escape(s: string): string {
  // Telegram HTML-mode: escape <, >, &
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  const url = new URL(req.url);
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const [pub, clips, bing, mast, bsky, views] = await Promise.all([
    publishedLast24h(),
    videoClipsLast24h(),
    bingStats(),
    mastodonStats(),
    blueskyStats(),
    viewsStats(),
  ]);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
  const lines: string[] = [];
  lines.push(`<b>Byte-Pulse Daily Briefing</b>  ·  ${dateStr}`);
  lines.push('');
  lines.push(`<b>Pipeline (last 24h)</b>`);
  lines.push(`  Articles published: <b>${pub.count}</b>`);
  lines.push(`  Video clips posted: <b>${clips}</b>`);

  // VIEWS / TRAFFIC — Hauptzahl die Serhat sehen will (2026-06-05).
  if (views) {
    lines.push('');
    lines.push(`<b>Traffic (all-time)</b>`);
    lines.push(`  Total views: <b>${views.totalViews.toLocaleString('de-DE')}</b>`);
    lines.push(`  Total articles published: <b>${views.totalArticles.toLocaleString('de-DE')}</b>`);
    if (views.top5.length) {
      lines.push('');
      lines.push(`<b>Top 5 by views</b>`);
      for (const a of views.top5) {
        const titleEsc = escape(a.title).slice(0, 60);
        lines.push(`  <b>${a.views.toLocaleString('de-DE')}</b> · <a href="https://www.byte-pulse.net/article/${a.slug}">${titleEsc}</a>`);
      }
    }
  }

  if (pub.titles.length) {
    lines.push('');
    lines.push(`<b>Today's slugs</b>`);
    for (const t of pub.titles.slice(0, 5)) {
      lines.push(`  • <a href="https://www.byte-pulse.net/article/${t}">${escape(t).slice(0, 70)}</a>`);
    }
  }

  lines.push('');
  lines.push(`<b>Reach</b>`);
  if (bing) lines.push(`  Bing 7d: ${bing.clicks7d} clicks / ${bing.impressions7d} impressions`);
  if (mast) lines.push(`  Mastodon: ${mast.followers} followers · ${mast.statuses} posts · last ${mast.lastPost}`);
  if (bsky) lines.push(`  Bluesky: ${bsky.followers} followers · ${bsky.posts} posts`);

  lines.push('');
  lines.push(`<i>Google Search Console + YouTube stats: check dashboard.</i>`);

  const text = lines.join('\n');
  const res = await tg(text, { html: true, silent: false });

  return NextResponse.json({
    ok: res.ok,
    error: res.error,
    sample: {
      pubCount: pub.count,
      clips,
      bing,
      mastodon: mast,
      bluesky: bsky,
      views,
    },
  });
}
