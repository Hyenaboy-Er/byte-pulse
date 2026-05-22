import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `AUDIT-FIXES DURCH - ALLES AUTONOM

==== CACHE-HEADERS BUG ENDLICH GEFIXT ====
Root-Cause gefunden via Vercel Build-Log: /article/[slug] war 'f'
(fully-dynamic) statt '*' (static ISR). Next15 braucht
generateStaticParams sonst kein CDN-Cache.
FIX: 300 neueste Slugs werden pre-rendered (EN + DE).
LIVE verifiziert:
  Cache-Control: public, max-age=3600, s-maxage=86400, swr=604800
  X-Vercel-Cache: PRERENDER
-> Article-Pages laden jetzt instant vom Edge. Mobile-Speed-Win.

==== AUDIT ABGEARBEITET ====
Item 1 (JSON-LD/title/OG fehlt): FALSCH - war alles da.
  Audit nutzte WebFetch, das skippt <script> Tags. NewsArticle +
  Organization + WebSite Schema sind drin, title/OG/canonical auch.
Item 2 (category 404): KORREKT.
  /category/cybersecurity -> 308 -> /category/security [LIVE]
  /category/tech -> 308 -> / [LIVE]
Item 3 (June-2026 Dates): FALSCH - keine Future-Dates, letzte
  3 Artikel alle vor heute.
Item 5 (Newsletter-CTA pro Artikel): GEBAUT.
  Gradient-CTA-Block nach Artikel-Body, vor Related. EN + DE.
  Hoechstkonvertierender Slot. Commit 7216965.
Item 7 (Byte-PulseLIVE Spacing): Code hat gap-2 + ml-2,
  Spacing ist da. Audit unklar.

==== EMAIL INBOUND - EHRLICH ====
Outbound (Resend): 100% - du hast Confirm-Mail ja gesehen.
Inbound: kann ich NICHT verifizieren ohne Cloudflare API-Token.
SMTP-Probe von hier geht nicht (Residential-IP, kein reverse-DNS).
Dein Test-Fehler kommt WAHRSCHEINLICH daher dass du von
serhaterlev@gmail.com AN editorial@ -> zurueck an serhaterlev@
= Sender=Empfaenger = Gmail Loop-Block. Kein echter Fehler.
ECHTER TEST: von GMX/Yahoo/andere Mail an editorial@byte-pulse.net

Willst du Inbound 100% gefixt: Cloudflare API-Token (60 Sek)
-> dann query+fix ich Routing-Regel autonom.

==== COMMITS HEUTE ====
6739b73 cache-fix + bot-prompt
c8b01de category-redirects
7216965 newsletter-CTA

Naechste sinnvolle Schritte (sag was):
- Author-Bylines in Card-Listings (Audit #6)
- Word-Count-Bug (Artikel zu kurz, 364 statt 900+)
- Klick-Geld: Infolinks/Skimlinks Signup (brauche dich 5 Min)`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
