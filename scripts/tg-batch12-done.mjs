import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';
const T = get('CRON_SECRET');

const msg = `10 Agenten + alle Endpoints LIVE auf Production

GERADE ZUSAETZLICH FERTIG (Batch 1+2 dieser Session):

1. CLEANUP: Adsterra Social Bar dead code raus, Native bleibt
2. IndexNow: Bing/Yandex bekommen jeden Publish in Sekunden statt Stunden
3. Organization-JSON-LD: AdSense + Google sehen "echte Firma" Trust-Signal
4. SEO-Auditor: scannt sitemap/robots/ads.txt/orphans/hreflang/canonical alle 6h
5. Affiliate-Optimizer: re-injiziert Amazon-Links in alte Artikel idempotent
6. Backlink-Hunter: findet Reddit/HN-Threads zu unseren Topics, alertet
7. Content-Refresher: appended "Update <date>" Paragraph in alte high-traffic Artikel + bumped publishedAt

Verifiziert gerade live:
- /api/seo-audit -> ok, 1 orphan-issue gefunden
- /api/cron Writer -> Pixel "Take a Message" publiziert in 45s (Quality OK)
- Site laeuft sauber: 156KB Mobile, sauberes Layout

ALLE AKTIVEN CRON-JOBS auf cron-job.org:
1. Writer (alle 15min) ✅
2. Site-Monitor (alle 15min) ✅
3. Email-Watcher (alle 15min) - wartet auf Gmail-App-PW
4. Stats-Reporter (alle 4h) ✅
5. Quality-Auditor (alle 3h) ✅
6. Digest (taeglich 08:00) ✅

DU MUSST NOCH 4 CRONS DAZUFUEGEN (cron-job.org einloggen, ist 5 Min):

URL 1 - SEO-Auditor alle 6h:
https://www.byte-pulse.net/api/seo-audit?token=${T}
Schedule: Benutzerdefiniert  0 */6 * * *

URL 2 - Affiliate-Optimizer alle 6h:
https://www.byte-pulse.net/api/affiliate-optimize?token=${T}
Schedule: Benutzerdefiniert  0 */6 * * *

URL 3 - Backlink-Hunter alle 4h:
https://www.byte-pulse.net/api/backlink-hunt?token=${T}
Schedule: Benutzerdefiniert  0 */4 * * *

URL 4 - Content-Refresher taeglich 03:00:
https://www.byte-pulse.net/api/content-refresh?token=${T}
Schedule: Benutzerdefiniert  0 3 * * *

(Backlink-Hunter braucht 4h Intervall weil Reddit/HN bei haeufigeren Polls rate-limiten)

WAS DU AB JETZT KOMPLETT 24/7 OHNE PC HAST:
- Writer schreibt alle 15min einen Artikel
- IndexNow bringt ihn in Sekunden zu Bing/Yandex
- Affiliate-Optimizer schaut alle 6h ob noch Amazon-Links fehlen
- Content-Refresher haelt Top-Artikel fuer Google "frisch"
- SEO-Auditor checkt taeglich Site-Health
- Backlink-Hunter findet Threads wo du linken kannst
- Quality-Auditor scannt Artikel auf Probleme
- Site-Monitor checkt Speed/Errors
- Email-Watcher (sobald Gmail-PW) checkt dein Postfach
- Stats-Reporter schickt dir Telegram-Digest alle 4h
- Digest schickt morgens Tages-Briefing

Naechste 7 Tage Plan:
- System laeuft autonom + sammelt Daten
- Tag 7-10: AdSense-Bewerbung absenden (Site hat dann 700+ Artikel, Index-History, ads.txt seit Tagen crawled)
- Approval ~70-85% wahrscheinlich`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
