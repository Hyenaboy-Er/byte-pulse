import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Gemini ist live in Production.

provider: gemini
writer: gemini-2.5-flash
humanizer: gemini-2.5-flash
reviewer: gemini-2.5-flash-lite
translator: gemini-2.5-flash-lite

Erster komplett auf Gemini publizierter Artikel:
"Debian 14 Mandates Reproducible Builds for Testing Branch"
https://www.byte-pulse.net/article/debian-14-mandates-reproducible-builds-for-testing-branch

Kosten neu: ca 0,40 \$/Tag = ~12 \$/Monat bei 100 Artikeln/Tag
(vorher mit GPT-4o: ~15-25 \$/Tag = ~500 \$/Monat)
=> Die 50 \$ OpenAI reichen jetzt als Failover ueber Monate hin.

Kleiner Hick: kurz war eine non-www<->www Redirect-Schleife aktiv weil meine middleware mit Vercels Edge-Layer gekaempft hat. Hotfix gepusht, Site laeuft sauber - 1 Redirect-Hop von byte-pulse.net auf www.byte-pulse.net dann 200.

Naechstes was wir brauchen damit alles autopilot ist:
1) Gmail App-Passwort -> Email-Watcher springt an
2) Amazon EU Partner-IDs (UK FR ES IT) in deinen Inbox checken
3) W-8BEN fuer Amazon US`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
