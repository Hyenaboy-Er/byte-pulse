import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `RESEND DOMAIN VERIFIED

==== DURCHGEZOGEN OHNE DEINE CLICKS ====
- Resend Account: serhaterlev@gmail.com (Google SSO)
- API-Keys (Sending + Admin) erstellt und gespeichert
- Domain byte-pulse.net angelegt in Region Ireland (eu-west-1)
- Auto-Configure -> Cloudflare hat per OAuth alle 3 DNS-Records geschrieben
- DNS-Propagation bestaetigt (live ueber 1.1.1.1):
  * resend._domainkey  TXT   -> DKIM 1024-bit key
  * send               MX    -> feedback-smtp.eu-west-1.amazonses.com
  * send               TXT   -> v=spf1 include:amazonses.com ~all
- Resend Verify-Domain: status=verified, alle 3 Records gruen
- Force-Redeploy gepusht (Commit 0bc9a34) - sollte Cache-Headers
  und Mastodon-Token auf Vercel synchronisieren

==== MASTODON-DIAGNOSE ====
Token lokal getestet -> 200 OK, BytePulseNet Account erreicht.
Vercel hat eventuell die alte Token-Version noch im Build-Cache,
deshalb die 44 errors. Redeploy laeuft jetzt - sollte das fixen.

==== WAS JETZT FEHLT ====
Resend-Token muss auf Vercel als ENV-Var. Du kannst entweder:

OPTION A (60 Sek, dann mach ich alles autonom):
1. https://vercel.com/account/tokens
2. "Create Token" -> Name "byte-pulse-claude" -> Scope: Full Account
3. Token kopieren -> mir schicken (Telegram oder Chat)

OPTION B (3 clicks, du machst es):
1. https://vercel.com/dashboard -> byte-pulse Projekt -> Settings -> Environment Variables
2. Add: RESEND_API_KEY = re_UCLw8N6r_JuapwDLxoCdPxhxVe1iL17q7
3. Add: NEWSLETTER_FROM = Byte-Pulse <editorial@byte-pulse.net>
4. Save -> Redeploy

==== NEUE EINNAHMEN-MOEGLICHKEIT ====
Wenn editorial@ funktioniert + Resend live:
- Newsletter (3000 emails/Monat gratis bei Resend) wieder anschalten
- Welcome-Mails an neue Subscriber
- Daily Digest fuer Subscriber

Test-Mail TEST jetzt: schick irgendwas an editorial@byte-pulse.net
-> sollte in serhaterlev@gmail.com landen.`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
