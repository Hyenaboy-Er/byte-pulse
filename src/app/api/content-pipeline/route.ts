// Trigger für die Homepage-Content-Pipeline (3-Agenten-Team).
//
// POST /api/content-pipeline?token=CRON_SECRET
//   Body: { "kind": "landing"|"about"|"privacy"|"editorial-policy"
//                   |"seo-meta"|"hero"|"newsletter-copy"|"free-text",
//           "brief": "was erzeugt werden soll",
//           "context": "optional: bestehender Text / Constraints / Fakten" }
//
// Antwort: das komplette PipelineResult — draft, review (verdict/score/issues),
// final, improved, independenceWeak. Ein Aufruf = alle 3 Stufen automatisch.
//
// Geschützt mit CRON_SECRET (gleiches Muster wie /api/cron) — kein offener
// Endpunkt, da er LLM-Kosten verursacht.

import { NextResponse } from 'next/server';
import { runContentPipeline, type ContentJob, type ContentKind } from '@/lib/agents/homepage-content-pipeline';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_KINDS: ContentKind[] = [
  'landing', 'about', 'privacy', 'editorial-policy',
  'seo-meta', 'hero', 'newsletter-copy', 'free-text',
];

function authed(req: Request, url: URL): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // lokal ohne Secret erlaubt
  const auth = req.headers.get('authorization');
  return auth === `Bearer ${expected}` || url.searchParams.get('token') === expected;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!authed(req, url)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: Partial<ContentJob>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body.kind || !VALID_KINDS.includes(body.kind as ContentKind)) {
    return NextResponse.json(
      { ok: false, error: `kind must be one of: ${VALID_KINDS.join(', ')}` },
      { status: 400 },
    );
  }
  if (!body.brief || body.brief.trim().length < 5) {
    return NextResponse.json({ ok: false, error: 'brief is required (min 5 chars)' }, { status: 400 });
  }

  try {
    const result = await runContentPipeline({
      kind: body.kind as ContentKind,
      brief: body.brief,
      context: body.context,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    // Häufigster Fall: GEMINI_API_KEY fehlt → Reviewer kann nicht laufen.
    return NextResponse.json(
      { ok: false, error: (e as Error).message.slice(0, 300) },
      { status: 500 },
    );
  }
}

// GET = kurze Selbstauskunft, damit man den Endpunkt im Browser prüfen kann.
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'homepage-content-pipeline',
    stages: ['generate (lead)', 'review (Gemini, independent)', 'improve'],
    usage: 'POST with { kind, brief, context? } + ?token=CRON_SECRET',
    validKinds: VALID_KINDS,
  });
}
