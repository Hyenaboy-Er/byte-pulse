import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `COMMUNITY-BOT IST LIVE - 4 REPLIES GEPOSTET

==== ERSTER LAUF SMOKE-TEST ====
postsScanned: 30
repliesFound: 4  (4 Kommentare die NIEMAND beantwortet hat)
generated: 4
posted: 4
errors: 0

==== DIE 4 REPLIES (LIVE AUF MASTODON) ====
1. An @numodular: "That's a fair question! It seems xAI is
   operating within existing regulations, but so..."

2. An @migtorr: "Ah, thanks for pointing that out! You're
   right, we should have included a direct link to..."

3. An @Kurosetii: "That's a strong take! It's definitely
   true that Google's data practices are a..."

4. An @proscience: "That's a strong take! It's definitely
   a complex situation balancing innovation with..."

Schau dir die Replies an: https://mastodon.social/@BytePulseNet
-> alle 4 sind als REPLY mit @mention sichtbar.

==== AUTONOME WIEDERHOLUNG ====
Sobald du den Cron auf cron-job.org anlegst, antwortet der Bot
automatisch alle 15 Min auf neue Kommentare. URL:
https://byte-pulse.net/api/community-reply?token=<CRON_SECRET>

==== NOCH OFFEN ====
1. Email Forwarding: byte-pulse.net hat IMMER NOCH 0 MX-Records.
   Cloudflare Email Routing musst du aktivieren (Dashboard hängt
   bei mir, geht nur von deinem Browser):
   https://dash.cloudflare.com/e594536d40fde2562fcb512b48fa5f18/byte-pulse.net/email/routing/overview

2. Cache-Headers Bug: Middleware-Fix hat nicht geholfen,
   irgendwas anderes markiert die Pages als dynamic. Investigiere
   weiter — kein Blocker, nur Performance-Optimization.`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
