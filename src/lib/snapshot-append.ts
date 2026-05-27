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

export async function appendArticleToSnapshot(a: SnapshotArticle): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: 'GITHUB_TOKEN_FOR_COMMITS not set' };

  try {
    // Pull both files in parallel.
    const [snap, idx] = await Promise.all([
      getFile('data/articles-snapshot.json'),
      getFile('data/articles-index.json'),
    ]);

    const snapList = JSON.parse(snap.content) as SnapshotArticle[];
    const idxList = JSON.parse(idx.content) as Omit<SnapshotArticle, 'content'>[];

    // Skip if already present (re-run safety).
    if (snapList.some((x) => x.slug === a.slug)) {
      return { ok: true };
    }

    // Snapshot has full content; index drops it.
    const { content, ...rest } = a;
    snapList.unshift(a);
    idxList.unshift(rest);

    // Keep memory reasonable — cap snapshot at 1500, index at 1500 too.
    const snapCapped = snapList.slice(0, 1500);
    const idxCapped = idxList.slice(0, 1500);

    const newSnap = JSON.stringify(snapCapped);
    const newIdx = JSON.stringify(idxCapped);

    const msg = `chore: append article ${a.slug} to snapshot [skip ci]`;

    // Sequential PUT (one PUT per blob; can't batch via Contents API).
    await putFile('data/articles-snapshot.json', newSnap, snap.sha, msg);
    // refetch idx sha since first PUT may have touched the tree, but contents API
    // is file-scoped so the idx.sha is still valid here. Best effort:
    await putFile('data/articles-index.json', newIdx, idx.sha, msg);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: (e?.message ?? String(e)).slice(0, 240) };
  }
}
