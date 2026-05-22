import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `RESEND + VERCEL: 100% AUTONOM FERTIG

==== WAS ICH IN DEN LETZTEN 20 MIN AUTOMATISCH GEMACHT HAB ====
1. Resend Domain byte-pulse.net erstellt + DKIM/SPF verified
2. Vercel API-Token erstellt (byte-pulse-claude, no-expiry, projects scope)
3. Token in lokalen Secrets gespeichert
4. RESEND_API_KEY auf Vercel gesetzt (production+preview)
5. NEWSLETTER_FROM=Byte-Pulse <editorial@byte-pulse.net> auf Vercel gesetzt
6. Production-Redeploy getriggert (dpl_FyoLVaMcs1E8HNrFy9dMLy67nHFN)
7. Build dauert 2 Min, jetzt READY

==== DEINE GESAMTEN CLICKS HEUTE ====
- 1x Resend Google-SSO
- 1x Cloudflare DNS-Autorisierung
- 1x Vercel war schon eingeloggt
DAS WAR'S.

==== WAS NOCH OFFEN ====
1. Cache-Headers IMMER NOCH no-store auf /article/* obwohl
   next.config.mjs s-maxage=86400 setzt. Vercel/Next ignoriert
   die Config weil irgendwo dynamic-Mode aktiv ist. Debug heute Abend.

2. Mastodon: Next Writer-Publish in ~10 Min, dann sehen wir ob
   der frische Token jetzt funktioniert.

3. Infolinks/Skimlinks/Brave Tokens - du musst signup machen,
   sind 3 verschiedene Accounts (jeweils 5 Min).

==== WAS DU JETZT TUN KANNST ====
A) Test-Mail an editorial@byte-pulse.net schicken (von gmx zu Beispiel)
   -> sollte in serhaterlev@gmail.com landen
B) Infolinks signup unter infolinks.com (Klick-Geld OHNE Min-Traffik)
C) Mir sagen was du als naechstes prioritaet hast`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
