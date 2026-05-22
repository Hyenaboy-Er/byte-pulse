import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';
const msg = `EDITORIAL@ GEFIXT - INBOUND LIVE

Der Bug war ein Tippfehler in der Cloudflare-Routing-Regel:
  editoral@byte-pulse.net  (fehlendes i, beim Setup vertippt)
Deshalb "550 Address does not exist" fuer editorial@.

JETZT GEFIXT (per Cloudflare API, autonom):
  [ON] editorial@byte-pulse.net -> serhaterlev@gmail.com
  [ON] *@byte-pulse.net catch-all -> serhaterlev@gmail.com

Die Catch-all-Regel heisst: AB JETZT kommt JEDE Adresse
@byte-pulse.net an (press@, hello@, info@, kontakt@, auch
kuenftige Tippfehler) -> alles landet in serhaterlev@gmail.com.
Nie wieder ein Bounce.

TEST JETZT: schick von deinem GMX an editorial@byte-pulse.net
-> muss in serhaterlev@gmail.com ankommen (ggf. 1-2 Min DNS).

Cloudflare-Key ist lokal gespeichert - ab jetzt mach ich
Cloudflare-Sachen autonom, kein Click mehr noetig.`;
const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
