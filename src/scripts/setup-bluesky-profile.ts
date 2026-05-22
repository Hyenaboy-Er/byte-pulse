// One-shot Bluesky profile setup via AT Protocol.
//
// Why a script instead of clicking through bsky.app: Bluesky's web client
// hardens its file picker against scripted automation (no persistent file
// input, no DOM ref to inject Files into). The atproto API has no such
// barrier — same JWT we already use for posting can also set displayName,
// description, avatar and banner via putRecord on the profile collection.
//
// Run once locally: `npx tsx src/scripts/setup-bluesky-profile.ts`
// Re-run after editing DISPLAY_NAME/DESCRIPTION below to update the profile.
//
// Reads creds from .env (BLUESKY_HANDLE + BLUESKY_APP_PASSWORD).

import 'dotenv/config';

const HANDLE = process.env.BLUESKY_HANDLE;
const APP_PW = process.env.BLUESKY_APP_PASSWORD;

if (!HANDLE || !APP_PW) {
  console.error('Set BLUESKY_HANDLE + BLUESKY_APP_PASSWORD in .env first.');
  process.exit(1);
}

// ── Profile content. Edit, re-run script, profile updates. ────────────────
const DISPLAY_NAME = 'Byte-Pulse';
const DESCRIPTION =
  '🤖 Tech news that matters — AI, gaming, hardware, security.\n' +
  "Curated 24/7 from the world's top sources. What's worth your time.\n" +
  '🌐 byte-pulse.net';

// Source URLs for avatar + banner — both are dynamic Next.js endpoints on the
// live site, so they always reflect the current brand. Avatar is 180×180,
// banner is the OG image 1200×630 (Bluesky will letterbox to 3:1 — acceptable
// for first-iteration; we can ship a dedicated 3000×1000 banner later).
const AVATAR_URL = 'https://www.byte-pulse.net/apple-icon';
const BANNER_URL = 'https://www.byte-pulse.net/opengraph-image';

const PDS = 'https://bsky.social';

async function createSession() {
  const res = await fetch(`${PDS}/xrpc/com.atproto.server.createSession`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: HANDLE, password: APP_PW }),
  });
  if (!res.ok) throw new Error(`session failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<{ accessJwt: string; did: string }>;
}

async function uploadBlob(jwt: string, url: string, label: string) {
  console.log(`fetching ${label} from ${url} …`);
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`${label} fetch failed: ${imgRes.status}`);
  const contentType = (imgRes.headers.get('content-type') ?? 'image/png').split(';')[0].trim();
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  console.log(`  ${label}: ${bytes.byteLength} bytes, ${contentType}`);
  const up = await fetch(`${PDS}/xrpc/com.atproto.repo.uploadBlob`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': contentType },
    body: bytes as unknown as BodyInit,
  });
  if (!up.ok) throw new Error(`${label} upload failed: ${up.status} ${await up.text()}`);
  const { blob } = (await up.json()) as { blob: unknown };
  return blob;
}

async function putProfile(jwt: string, did: string, record: Record<string, unknown>) {
  const res = await fetch(`${PDS}/xrpc/com.atproto.repo.putRecord`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repo: did,
      collection: 'app.bsky.actor.profile',
      rkey: 'self',
      record,
    }),
  });
  if (!res.ok) throw new Error(`putRecord failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`Logging in as ${HANDLE} …`);
  const { accessJwt, did } = await createSession();
  console.log(`  DID: ${did}`);

  const avatarBlob = await uploadBlob(accessJwt, AVATAR_URL, 'avatar');
  const bannerBlob = await uploadBlob(accessJwt, BANNER_URL, 'banner');

  console.log('writing profile record …');
  const result = await putProfile(accessJwt, did, {
    $type: 'app.bsky.actor.profile',
    displayName: DISPLAY_NAME,
    description: DESCRIPTION,
    avatar: avatarBlob,
    banner: bannerBlob,
  });
  console.log('done.', result);
  console.log(`\nView at https://bsky.app/profile/${HANDLE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
