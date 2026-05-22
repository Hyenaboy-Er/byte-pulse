import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `MASTODON-AUTO-POSTER LIVE

Setup komplett (autonom von mir gemacht):
  - Account @BytePulseNet@mastodon.social (du hast registriert)
  - App "Byte-Pulse Auto-Poster" mit write:statuses + write:media
  - Display Name: Byte-Pulse
  - Bio: Tech news that matters - AI/gaming/hardware/mobile, EN+DE, 30min
  - Website-Link: https://www.byte-pulse.net
  - Vercel: MASTODON_INSTANCE + MASTODON_ACCESS_TOKEN gesetzt
  - Redeploy getriggert

LIVE-TEST: erfolgreich getooted via API
  https://mastodon.social/@BytePulseNet/116561980278752996

ORCHESTRATOR: schon verkabelt (Step 7 broadcastNewArticle)
  Jeder Writer-Run ruft postToMastodon() auf

NAECHSTER AUTO-TOOT: 15:30 Uhr (naechster Writer-Cron)

Schau mal vorbei: https://mastodon.social/@BytePulseNet

Bluesky + LinkedIn als naechste Schritte (nicht heute).`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
