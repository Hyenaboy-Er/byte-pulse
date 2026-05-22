import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `editorial@byte-pulse.net IST LIVE

==== DEPLOYED + VERIFIED ====
Commit 3f6bf08 -> Vercel -> Edge propagiert.

Geprueft (alle nur editorial@, NULL hello@):
- /impressum                 6x editorial@
- /privacy                  16x editorial@
- /de/privacy               15x editorial@
- /contact                   6x editorial@
- /de/contact                6x editorial@
- /editorial-policy         10x editorial@
- /affiliate-disclosure      6x editorial@
                            -----
                            65x editorial@byte-pulse.net live

==== TEST-MAIL ====
Schick eine Mail von Gmail an editorial@byte-pulse.net
-> Cloudflare leitet weiter -> landet in serhaterlev@gmail.com
Wenn das ankommt: Email-Setup 100% fertig.

==== NEXT (Priority-Reihenfolge) ====
1. (Priority 1) Cron-Jobs auf cron-job.org eintragen:
   - Sentinel  /api/sentinel    alle 5min
   - Director  /api/director    taeglich 07:00
   - Trend-Reactor /api/trend-react  alle 15min
   - Social-Retry  /api/social-retry alle 5min

2. (Priority 1) Klick-Geld aktivieren - du fehlst noch:
   - Infolinks Token (infolinks.com signup, 5 Min)
   - Skimlinks Token (skimlinks.com signup, 5 Min)
   - Brave Creators Token (creators.brave.com signup, 10 Min)
   -> Mir die 3 Tokens schicken, ich setze sie auf Vercel

3. (Priority 2) Resend Account
   - resend.com signup mit serhaterlev@gmail.com
   - API-Key an mich
   -> Newsletter wieder live, Sender = Byte-Pulse <editorial@byte-pulse.net>

4. (Priority 3) Was ICH in der Zwischenzeit angehe:
   - Word-Count-Bug (avg 364 statt 900-1300)
   - Affiliate-Optimizer Keyword-Liste erweitern
   - Cache-Headers final fixen (immer noch max-age=0)
   - Internal-Linker force-flag fuer alte Artikel`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
