// Instagram-Adapter für Personal-Accounts via interner Mobile-App-API.
//
// Hintergrund: Meta lässt offizielles API-Posting nur für Business / Creator
// Accounts zu. Für Personal-Accounts gibt es keinen legalen Auto-Post-Weg.
// Diese Lösung benutzt die selbe API, die deine Instagram-Handy-App benutzt
// (über `instagram-private-api` Library) — Meta unterscheidet nicht zwischen
// "App von dir" und "App von uns mit gleichen Endpunkten", solange sich das
// Verhalten menschlich genug anfühlt.
//
// Risiko ist real: Account-Sperre wenn Meta es erkennt. Mitigations:
//   * Session-Persistenz → wir loggen nur 1× ein, nicht pro Post
//   * Hartes Tageslimit (default 3, env-anpassbar)
//   * Qualitäts-Gate strenger als bei Bluesky (default ≥ 80) → nur Top-Cut
//   * Zufälliger Delay 30-90s vor jedem Post → menschliches Timing
//   * Wenn kein Bild: skip (IG braucht Media)
//
// Setup:
//   IG_USERNAME=          # der Personal-Account-Username
//   IG_PASSWORD=          # Login-Passwort (2FA muss aus sein, sonst klappt's nicht)
//   INSTAGRAM_MIN_QUALITY=80      # Optional: Score-Schwelle
//   INSTAGRAM_DAILY_CAP=3         # Optional: max Posts/24h
//
// Empfehlung: **Burner-Account** verwenden, nicht den Haupt-IG-Account, falls
// Meta den Account sperrt.

import { prisma } from '../db';
import { SITE } from '../site';

export type ChannelResult = { channel: string; ok: boolean; error?: string };
export type IgTarget = {
  url: string;
  title: string;
  excerpt: string;
  category?: string;
  tags?: string[];
  imageUrl?: string | null;
  qualityScore?: number;
};

const MIN_QUALITY = Number(process.env.INSTAGRAM_MIN_QUALITY ?? 80);
const DAILY_CAP = Number(process.env.INSTAGRAM_DAILY_CAP ?? 3);

async function loadSession(username: string): Promise<unknown | null> {
  const row = await prisma.agentLog.findFirst({
    where: { agent: 'ig-session', action: username },
    orderBy: { createdAt: 'desc' },
  });
  if (!row?.meta) return null;
  try { return JSON.parse(row.meta); } catch { return null; }
}

async function saveSession(username: string, state: unknown) {
  await prisma.agentLog.create({
    data: {
      agent: 'ig-session', action: username, status: 'ok',
      message: `IG session refreshed`,
      meta: JSON.stringify(state),
    },
  }).catch(() => null);
}

async function postsLast24h(username: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600_000);
  return prisma.agentLog.count({
    where: {
      agent: 'instagram-personal',
      action: username,
      status: 'success',
      createdAt: { gte: since },
    },
  });
}

export async function postToInstagramPersonal(t: IgTarget): Promise<ChannelResult> {
  const username = process.env.IG_USERNAME;
  const password = process.env.IG_PASSWORD;
  if (!username || !password) return { channel: 'instagram', ok: false, error: 'IG_USERNAME/IG_PASSWORD missing' };

  // Quality-Gate: viel strenger als Bluesky. IG verträgt 1-3 Posts/Tag
  // algorithmus-freundlich. Nur Reviewer-Top-Cut darf raus.
  if ((t.qualityScore ?? 100) < MIN_QUALITY) {
    return { channel: 'instagram', ok: false, error: `skipped: qualityScore ${t.qualityScore} < ${MIN_QUALITY}` };
  }

  // IG braucht zwingend ein Bild — ohne kein Post möglich.
  if (!t.imageUrl) {
    return { channel: 'instagram', ok: false, error: 'skipped: no image (IG requires media)' };
  }

  // Hartes Tageslimit gegen Bot-Erkennung.
  const today = await postsLast24h(username);
  if (today >= DAILY_CAP) {
    return { channel: 'instagram', ok: false, error: `skipped: daily cap reached (${today}/${DAILY_CAP})` };
  }

  try {
    // Dynamic import — Library ist schwer (~30MB), nur laden wenn wirklich gepostet wird.
    const { IgApiClient } = await import('instagram-private-api');
    const ig = new IgApiClient();
    ig.state.generateDevice(username);

    // Session-Restore versuchen — verhindert fresh login (löst Bot-Flag aus).
    const saved = await loadSession(username);
    let needsLogin = true;
    if (saved) {
      try {
        await ig.state.deserialize(saved as string);
        // Cheap probe: currentUser() — bei abgelaufener Session wirft.
        await ig.account.currentUser();
        needsLogin = false;
      } catch {
        needsLogin = true;
      }
    }

    if (needsLogin) {
      await ig.simulate.preLoginFlow();
      await ig.account.login(username, password);
      // simulate.postLoginFlow läuft als Side-Effect Promise im Hintergrund weiter,
      // wir warten nicht drauf um nicht zu blocken.
      ig.simulate.postLoginFlow().catch(() => null);
      const state = await ig.state.serialize() as { constants?: unknown };
      delete state.constants;
      await saveSession(username, state);
    }

    // Bild als Buffer holen — IG-API braucht Raw-Bytes.
    const imgUrl = t.imageUrl.startsWith('/')
      ? `${SITE.url}${t.imageUrl}`
      : t.imageUrl;
    const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(20_000) });
    if (!imgRes.ok) throw new Error(`image fetch ${imgRes.status}`);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    if (imgBuf.byteLength > 8 * 1024 * 1024) throw new Error('image > 8MB, IG rejects');

    // Caption-Format: Titel + Excerpt + Hashtags + Link-in-Bio-Hint.
    // IG erlaubt 2200 Zeichen, wir bleiben drunter. Hashtags am Ende, nicht im Body.
    const tagBlock = (t.tags ?? []).slice(0, 8)
      .map((s) => `#${s.replace(/\s+/g, '').toLowerCase()}`)
      .join(' ');
    const caption = [
      t.title,
      '',
      t.excerpt,
      '',
      '🔗 Full story: byte-pulse.net (link in bio)',
      '',
      tagBlock,
    ].filter(Boolean).join('\n').slice(0, 2200);

    // Menschlicher Delay 30-90s vor dem Post, damit Meta keine Bot-Cadence sieht.
    const delay = 30_000 + Math.floor(Math.random() * 60_000);
    await new Promise((r) => setTimeout(r, delay));

    const result = await ig.publish.photo({ file: imgBuf, caption });

    await prisma.agentLog.create({
      data: {
        agent: 'instagram-personal',
        action: username,
        status: 'success',
        message: `posted ${t.url}`,
        meta: JSON.stringify({ mediaId: (result as { media?: { id?: string } }).media?.id }),
      },
    }).catch(() => null);

    return { channel: 'instagram', ok: true };
  } catch (e) {
    const msg = (e as Error).message.slice(0, 200);
    await prisma.agentLog.create({
      data: {
        agent: 'instagram-personal', action: username, status: 'error',
        message: msg,
      },
    }).catch(() => null);
    return { channel: 'instagram', ok: false, error: msg };
  }
}
