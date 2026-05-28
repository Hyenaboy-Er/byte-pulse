// Temporary debug — verify the snapshot-sync environment is set up correctly.
// Protected by CRON_SECRET. Will be removed once the pipeline is confirmed.
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('token') !== process.env.CRON_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = process.env.GITHUB_TOKEN_FOR_COMMITS;
  const repo = process.env.GITHUB_REPO || 'Hyenaboy-Er/byte-pulse';
  const branch = process.env.GIT_BRANCH || 'main';

  // Try a real read against the snapshot file to see if the token actually
  // has permission.
  let probeResult: any = null;
  if (token) {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${repo}/contents/data/articles-snapshot.json?ref=${branch}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
          },
        },
      );
      probeResult = { status: r.status, ok: r.ok };
      if (!r.ok) {
        probeResult.body = (await r.text()).slice(0, 240);
      } else {
        const j: any = await r.json();
        probeResult.fileSize = j.size;
        probeResult.sha = j.sha?.slice(0, 8);
      }
    } catch (e: any) {
      probeResult = { error: (e?.message ?? String(e)).slice(0, 200) };
    }
  }

  return NextResponse.json({
    tokenSet: !!token,
    tokenLen: token?.length ?? 0,
    tokenPrefix: token?.slice(0, 6) ?? '',
    repo,
    branch,
    probe: probeResult,
  });
}
