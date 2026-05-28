// Auto-append newly-created articles to data/articles-snapshot.json and
// data/articles-index.json via the GitHub Contents API. The commit triggers
// a Vercel re-deploy, and within ~3 minutes the article is live on the site
// through the snapshot-fallback layer — even while the Turso DB stays
// read-blocked. Once Turso reads come back, this layer becomes a no-op
// (the DB path will simply succeed first and the snapshot becomes a backup).
//
// Why this is safe-enough:
//   * Writer-Poke is a serial cron (1 article per 30 min) — no concurrent
//     commits stomping each other.
//   * The commit message includes the slug, so a stuck duplicate is easy to
//     spot in the git log.
//   * Errors are non-fatal — the article stays in Turso regardless.
//
// Env:
//   GITHUB_TOKEN_FOR_COMMITS — PAT with "Contents: read+write" scope on the repo.
//   GITHUB_REPO              — owner/repo, default "Hyenaboy-Er/byte-pulse".
//   GIT_BRANCH               — default "main".

const REPO = process.env.GITHUB_REPO || 'Hyenaboy-Er/byte-pulse';
const BRANCH = process.env.GIT_BRANCH || 'main';
const TOKEN = process.env.GITHUB_TOKEN_FOR_COMMITS;

type SnapshotArticle = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  imageUrl: string | null;
  imageCredit: string | null;
  sourceUrl: string;
  sourceName: string;
  originalTitle: string | null;
  qualityScore: number;
  status: string;
  views: number;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  author?: string;
  wordCount?: number;
};

async function gh(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
}

// PUT a file's new content, providing the previous sha for conflict-detection.
async function putFile(path: string, content: string, sha: string, message: string): Promise<void> {
  const r = await gh(`/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
      branch: BRANCH,
    }),
  });
  if (!r.ok) {
    const txt = (await r.text()).slice(0, 220);
    throw new Error(`PUT ${path}: ${r.status} ${txt}`);
  }
}

async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const r = await gh(`/repos/${REPO}/contents/${path}?ref=${BRANCH}`);
  if (!r.ok) throw new Error(`GET ${path}: ${r.status}`);
  const j = await r.json();
  // GitHub returns base64 even with newlines — decode straight.
  const content = Buffer.from(j.content, 'base64').toString('utf-8');
  return { content, sha: j.sha };
}

// Cap on data/articles-recent.json: keep at most this many newest articles.
// Sized to stay safely under GitHub's 1 MB Contents-API file limit
// (~6 KB per article × 130 ≈ 780 KB, room for richer content).
const RECENT_CAP = 130;

export async function appendArticleToSnapshot(a: SnapshotArticle): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: 'GITHUB_TOKEN_FOR_COMMITS not set' };

  try {
    // articles-recent.json is a separate, small append-only file. The main
    // articles-snapshot.json (4+ MB) exceeds GitHub Contents-API's hard 1 MB
    // file limit, so PUTs there fail silently. articles-source.ts reads
    // recent FIRST, then falls back to the big snapshot — so a new article
    // appearing only in `recent` is fully visible on the site.
    let recentList: SnapshotArticle[] = [];
    let recentSha: string | null = null;
    try {
      const recent = await getFile('data/articles-recent.json');
      recentSha = recent.sha;
      recentList = JSON.parse(recent.content) as SnapshotArticle[];
    } catch (e: any) {
      // File doesn't exist yet — first run will create it.
      if (!String(e?.message ?? '').includes('404')) throw e;
    }

    if (recentList.some((x) => x.slug === a.slug)) {
      return { ok: true };
    }

    recentList.unshift(a);
    const capped = recentList.slice(0, RECENT_CAP);
    const newJson = JSON.stringify(capped);
    if (newJson.length > 950_000) {
      // Should not happen with cap=130, but safeguard.
      return { ok: false, error: `recent json too large: ${newJson.length} bytes` };
    }

    const msg = `chore: append ${a.slug} to recent [skip ci]`;

    if (recentSha) {
      await putFile('data/articles-recent.json', newJson, recentSha, msg);
    } else {
      // First-time create — Contents API treats omitted sha as "create new".
      const r = await gh(`/repos/${REPO}/contents/data/articles-recent.json`, {
        method: 'PUT',
        body: JSON.stringify({
          message: msg,
          content: Buffer.from(newJson).toString('base64'),
          branch: BRANCH,
        }),
      });
      if (!r.ok) throw new Error(`create recent.json: ${r.status} ${(await r.text()).slice(0, 220)}`);
    }

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: (e?.message ?? String(e)).slice(0, 240) };
  }
}
