// One-shot Telegram status briefing after major deploy.
import { readFileSync } from 'node:fs';

const secrets = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => secrets.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const token = get('TELEGRAM_BOT_TOKEN');
const chat = get('TELEGRAM_CHAT_ID');
if (!token || !chat) { console.error('missing telegram creds'); process.exit(1); }

const msg = `Byte-Pulse Live-Update — 3 neue Roboter sind drinne

1) SEO-Duplikat-Fix gepusht
- /de/article/X = noindex solange DE-Übersetzung fehlt
- sitemap.xml listet /de/article/X nur wenn Translation existiert
- middleware: 308-Redirect non-www → www, trailing-slash entfernen
- writer-dedup: 7-Tage-Fenster (statt 12h) + slug-prefix-Check
=> Google sollte in 5-7 Tagen die "Duplikat"-Warnung verlieren

2) Email-Watcher Agent gebaut
- /api/email-watch klassifiziert Mails (Vercel/Google/Amazon/AdSense/OpenAI…)
- kritische Mails kommen als Zusammenfassung in diesen Chat
- EmailSeen-Tabelle in Turso → kein Doppel-Alert möglich

DU MUSST EINMALIG:
a) Gmail 2FA an
b) https://myaccount.google.com/apppasswords → Mail → 16-Zeichen-Passwort kopieren
c) Vercel envs:
   GMAIL_IMAP_USER=serhaterlev@gmail.com
   GMAIL_IMAP_PASSWORD=<das-passwort>
d) cron-job.org neuen Job: GET https://www.byte-pulse.net/api/email-watch?token=<CRON_SECRET>  alle 30 Min

3) LLM-Provider-Abstraktion (OpenAI ↔ Gemini ↔ DeepSeek)
- Code unterstützt jetzt alle drei
- Gemini 2.5 Flash: 0,10 $/M input statt 5 $/M (GPT-4o) = 25-50x billiger
- Bei 100 Artikeln/Tag: ~10 $/Monat statt ~500 $/Monat

DU MUSST wenn du wechseln willst:
a) https://aistudio.google.com/apikey → Key holen (gratis)
b) Vercel: LLM_PROVIDER=gemini + GEMINI_API_KEY=...
c) Redeploy

4) CRON_SECRET in Vercel synchronisiert (war von local diverged)

Offen für dich:
• 50 $ OpenAI auffüllen ODER Gemini-Schlüssel einsetzen
• Gmail App-Passwort einrichten → Email-Watcher springt an
• Amazon EU Partner IDs in Inbox checken (UK FR ES IT)
• W-8BEN für Amazon US ausfüllen`;

const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: chat, text: msg, disable_web_page_preview: true }),
});
console.log(res.status, (await res.text()).slice(0, 200));
