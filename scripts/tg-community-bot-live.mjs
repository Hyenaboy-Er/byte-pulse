import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Agent #24 LIVE: COMMUNITY-REPLIES BOT

==== WAS ICH GERADE GEBAUT HAB ====
- /api/community-reply (Cron alle 15 Min)
- Holt unsere letzten 30 Mastodon-Posts
- Findet Replies die WIR noch nicht beantwortet haben
- Generiert mit Gemini eine 1-2 Satz Antwort (Kontext: Artikel + Kommentar)
- Postet die Antwort als Reply mit @mention
- Loggt jeden Reply in agentLog, antwortet nie 2x auf dasselbe

Direkt sichtbar: 2 unbeantwortete Kommentare auf unseren letzten 20 Posts.
Sobald Cron registriert: Bot antwortet automatisch innerhalb 15 Min.

==== AUCH GERADE GEFIXT ====
Cache-Headers Bug: Middleware setzte unbenutzten x-pathname Header,
was Next 15 dazu brachte ALLES als dynamic zu markieren -> no-store.
Header rausgeschmissen, nach Redeploy sollten Article-Pages endlich
public s-maxage=86400 zeigen + Edge-Cache aktiv.

==== EMAIL EDITORIAL@ - DRINGEND ====
Du sagst Mail kommt nicht an, ich habe DNS gecheckt:
byte-pulse.net hat NULL MX-Records.
Cloudflare Email Routing wurde nicht final aktiviert.

Was du machen musst (1 Min):
1. https://dash.cloudflare.com/e594536d40fde2562fcb512b48fa5f18/byte-pulse.net/email/routing/overview
2. Falls "Email Routing aktivieren" Button da -> KLICKEN
3. Wahrscheinlich Verify-Mail in serhaterlev@gmail.com - DEN LINK KLICKEN
4. Danach legt Cloudflare automatisch MX + SPF an

Pruefen: nslookup -type=mx byte-pulse.net 1.1.1.1
Sobald 3 *.mx.cloudflare.net Eintraege da sind ist Forwarding aktiv.

==== NEUER CRON-JOB EINTRAGEN ====
Geh auf cron-job.org und legen an:
  URL: https://byte-pulse.net/api/community-reply?token=<CRON_SECRET>
  Schedule: alle 15 Min

(Sentinel + Director + Trend-Reactor + Social-Retry sind auch noch
nicht in deinem cron-job.org Account. 5 Jobs anlegen, danach laufen
ALLE Agenten autonom.)

==== STATUS GESAMT ====
Agenten: 24 (alle Code da, 5 brauchen cron-Jobs)
Echte Einnahmen: 0 EUR (warten auf AdSense Tag 7-10, Klick-Sources fehlen)
Views: 9.834
DE Coverage: 100%`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
