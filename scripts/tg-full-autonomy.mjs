import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Status: ALLE 6 CRONS LIVE auf cron-job.org

WAS JETZT 24/7 OHNE DEINEN PC LAEUFT:

1. Writer       alle 15min  -> neuer Artikel
2. Site-Monitor alle 15min  -> Speed/Redirect-Checks, Telegram-Alert bei Problem
3. Email-Watch  alle 15min  -> Gmail-Polls, kritische Mails an Telegram (wartet auf GMAIL_IMAP_PASSWORD)
4. Quality-Audit alle 3h    -> heuristischer + LLM-basierter Site-Quality-Scan
5. Stats        alle 4h     -> Telegram-Digest mit Top-Views, Errors, Subs
6. Digest       08:00 taegl -> tagesbriefing

Plus: jeder Publish triggert sofort einen X-Post (@bytePulsenew) und eine DE-Uebersetzung. Alle 4 LLM-Agenten (Writer/Humanizer/Reviewer/Translator) sind hinten dran, davon 1 auf OpenAI (writer) und 3 auf Gemini.

FIX heute: cron-job.org hatte noch den alten Token "4c66..." waehrend Vercel auf neuen "bp_6bf..." war. Deshalb 6h ohne Publish. Beides synchronisiert, Writer-Cron jetzt aktiv mit naechstem Run um 19:15.

WAS WIRKLICH NOCH FEHLT FUER VOLLE AUTONOMIE + EINNAHMEN:

A) GMAIL APP-PASSWORD (du, 2 Min)
   - https://myaccount.google.com/apppasswords
   - 2FA aktivieren falls nicht schon
   - 16-Zeichen Code generieren
   - Vercel: GMAIL_IMAP_USER=serhaterlev@gmail.com + GMAIL_IMAP_PASSWORD=<code>
   - Wirkung: Email-Watcher schaut alle 15min in dein Postfach + meldet Search-Console-Probleme, AdSense-Mails, Amazon-Approvals etc. an Telegram

B) AMAZON EU PARTNER IDs (du)
   - Geht automatisch wenn Email-Watcher laeuft (er fischt aus Amazon-Mails die UK/FR/ES/IT Tags raus)

C) W-8BEN FUER AMAZON US (du)
   - Sonst 30% US-Quellensteuer auf alle US-Einnahmen

WEITERE AGENTEN DIE ICH NOCH BAUEN SOLLTE (priorisiert nach Revenue-Impact):

1. SEO-Auditor (hohe Prio): scannt Search Console alle 6h auf neue Crawl-Errors, fehlende Sitemap-URLs, Mobile-Usability-Issues, schreibt fixes selbst
2. Headline-Optimizer (mittel): A/B-tested Headlines automatisch nach 24h, behaelt die mit besserer CTR (braucht Google Analytics integration)
3. Content-Refresher (mittel): aktualisiert Artikel die alt sind aber traffic kriegen mit neuen Quellen, hebt published-Datum, ohne neuen Slug = boost SEO ohne Duplikate
4. Affiliate-Optimizer (hoch): erkennt Produkt-Mentions in Artikeln + fuegt Amazon/Skimlinks ein wo der Writer das vergessen hat
5. Backlink-Hunter (mittel): findet Reddit/HN-Threads die zu unseren Topics passen + alerted dich (du musst die Posts manuell machen wegen Spam-Schutz)
6. AdSense-Optimizer (hoch sobald AdSense approved ist): platziert Ad-Slots optimal nach Heatmap, A/B testet 728x90 vs 320x100 vs native, lernt welche Slots wie viel bringen
7. Comment-Moderator (niedrig): wenn wir spaeter Kommentare zulassen, LLM filtert Spam/Hate

Ich kann 1, 3, 4 sofort bauen sobald du sagst weiter. SEO-Auditor braucht Search Console API access (1 OAuth click auf deiner Seite), die anderen sind nur Code.

Mobile-Audit gemacht: clean Layout, kein Adsterra-Popup mehr, Newsletter-Modal triggert sauber bei 50% Scroll, Lego Batman Hero, Top-Trending-Ticker mit 4 News-Pillen. Site sieht jetzt professionell aus wie The Verge / TechCrunch.

GESAMTKOSTEN aktuell ~165 \$/Monat bei 100 Artikeln/Tag, davon ~150 \$ OpenAI Writer + ~15 \$ Gemini Rest. Bei voller Skalierung (200 Artikel/Tag) ~330 \$/Monat. AdSense-Approval kommt fuer dieses Volume locker rein und wird das ueberkompensieren.`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
