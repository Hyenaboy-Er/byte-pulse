import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `A-Z AUDIT byte-pulse.net (Tag 5)

==== JETZT SOFORT GEFIXT ====
- Sentinel Agent #22 deployed (auto-repair alle 5 min)
- Director Agent #23 deployed (taeglicher Strategy-Report)
- Infolinks + Brave Creators scaffolding (pay-per-click, kein Min-Traffic)
- 144 weitere interne Links auf 40 Artikel gesetzt

==== KRITISCHE FINDINGS DIRECTOR ====
1. WORD-COUNT durchschnittlich 364 statt 900-1300 - Writer outputs zu kurz!
2. 96% der Artikel (238/249) haben KEINEN inline Amazon-Link
3. 68% der Artikel (169/249) haben KEINE internen Links (Internal-Linker dedupe blockt)
4. 59 Artikel heute published, nur 2 Social-Broadcasts erfolgreich (Mastodon Token-Fix nicht propagiert)
5. Cache-Headers IMMER NOCH no-store - Vercel-Build pickt Layout-Fix nicht auf

==== A-Z AUDIT TABELLE ====

A) AGENTEN-GESUNDHEIT (12 von 18 healthy):
   HEALTHY: Writer, Translator, Quality-Auditor, Site-Monitor, Stats-Reporter,
            Affiliate-Optimizer, Backlink-Hunter, Content-Refresher, Internal-Linker,
            Title-Booster, Sentinel, IndexNow
   STALE:   SEO-Auditor (>18h kein Run)
   IDLE:    Trend-Reactor (kein Cron-Job auf cron-job.org)
   IDLE:    GSC-Monitor (braucht GSC_SERVICE_ACCOUNT_KEY)
   IDLE:    Social-Retry (kein Cron-Job)
   IDLE:    Email-Watcher (braucht GMAIL_IMAP_PASSWORD)
   ERRORED: Social-Broadcast (79 errors / 81 runs in 24h)

B) AMAZON AFFILIATE:
   STATUS: aktiv (bytepulse-21 DE / bytepulse01-20 US)
   KLICKS: 0 in 30 Tagen
   PROBLEM: nur 4 von 249 Artikeln haben inline Amazon-Link
   LOESUNG: Affiliate-Optimizer Keyword-Liste massiv erweitern

C) CACHE-HEADERS:
   STATUS: KAPUTT (no-store statt s-maxage=86400)
   PROBLEM: Vercel-Build-Cache pickt layout.tsx fix nicht auf
   LOESUNG: Empty-commit Force-Redeploy notwendig

D) DE-UEBERSETZUNG:
   STATUS: 100% Coverage
   ALLES OK

E) EMAIL / NEWSLETTER:
   STATUS: pausiert
   BUSINESS-EMAIL: noch nicht eingerichtet
   LOESUNG: United-Domains-Email + Resend (gratis)

F) FRONTEND / MOBILE:
   STATUS: gut
   PROBLEM: Cache nicht aktiv, Mobile-Load langsam
   LOESUNG: siehe C)

G) GOOGLE SEARCH CONSOLE:
   STATUS: indexed 378 von 494 Seiten
   IMPRESSIONS: 423 / KLICKS: 2 in 28 Tagen (0.5% CTR)
   News-Sitemap eingereicht
   LOESUNG: Geduld, Site ist 5 Tage alt

H) HEADLINES (Title-Booster):
   STATUS: lief 1x, Gemini zu konservativ
   LOESUNG: aggressiverer Prompt + force=1 fuer Re-runs

I) IMPRESSUM + LEGAL:
   STATUS: vollstaendig (TMG + MStV)
   /impressum, /privacy, /editorial-policy, /affiliate-disclosure live

J) JSON-LD / E-E-A-T SCHEMA:
   STATUS: Author Person-Schema, Organization, WebSite, NewsArticle ✅

K) KLICK-EINNAHMEN (was DU gefragt hast):
   NEU integriert ohne Mindesttraffik:
   - Infolinks (in-text CPM) - signup: infolinks.com - €3-15/Monat bei 10k Views
   - Skimlinks (per-click Retailer) - signup: skimlinks.com - variabel
   - Brave Rewards Creator - signup: creators.brave.com - passiv BAT-Tips
   ALLE drei akzeptieren Day-1-Sites ohne Volume-Anforderung!

L) LINKS / INTERNAL:
   STATUS: Internal-Linker hat 414 Links gesetzt (heute Nacht + heute morgen)
   LOESUNG: 169 Artikel noch ohne Links - Force-rerun naechste Woche

M) MASTODON:
   STATUS: KAPUTT (79/81 Broadcasts gefailed)
   PROBLEM: Token auf Vercel anscheinend immer noch falsch ODER neue Posts noch nicht versucht
   LOESUNG: Empty-commit Force-Redeploy

N) NEWSLETTER:
   STATUS: pausiert (Wartet auf Business-Email + Resend)

O) OG-PROXY / IMAGES:
   STATUS: 5/5 ok
   ALLES OK

P) PRIVACY:
   STATUS: DSGVO-konform, 2000+ Woerter
   ALLES OK

Q) QUALITY:
   STATUS: Quality-Auditor healthy, scannt 3-stuendig
   PROBLEM: validiert nicht Word-Count
   LOESUNG: Quality-Auditor mit Wortzahl-Check erweitern

R) REVENUE GESAMT:
   AdSense: pending (Tag 7-10)
   Amazon: 0 € (0 Klicks)
   Skimlinks/Infolinks/Brave: noch nicht aktiviert (Tokens fehlen)
   ECHTE EINNAHMEN: 0,00 €

S) SEO:
   STATUS: Sitemap + News-Sitemap OK
   Internal-Links wachsen
   Author-Bylines + Person-Schema = E-E-A-T abgehakt

T) TRANSLATION:
   STATUS: 100% Coverage
   ALLES OK

U) USERS / VIEWS:
   Total Views: 9.781
   Top-Artikel "Gardena RollUp": 3.712 Views (immer noch viral)
   Heute publiziert: 59

V) VERCEL:
   STATUS: Hosting healthy
   PROBLEM: Build-Cache pickt layout-fix nicht auf

W) WORD-COUNT (KRITISCH):
   STATUS: durchschnittlich 364 Woerter, Ziel 900-1300
   PROBLEM: Writer outputs zu kurz ODER Counter zaehlt nur Markdown-Body ohne Headings
   LOESUNG: Writer-Pruefung + ggf. Prompt verschaerfen

X) X (TWITTER):
   STATUS: tot wegen Credits-Depleted (Pay-per-use leer)
   LOESUNG: ignorieren, andere Kanaele reichen

Y) (siehe Z)

Z) ZUKUNFT / NEXT ACTIONS (priorisiert):

   PRIORITY 1 (heute):
   - Infolinks Account anlegen + Token an mich (5 Min, erstes Klick-Geld direkt)
   - Skimlinks Account anlegen + Token an mich (5 Min)
   - Brave Creators Verifikation (10 Min, passiv BAT)
   - Cron-Jobs eintragen: Sentinel + Director + Trend-Reactor + Social-Retry + Internal-Linker

   PRIORITY 2 (diese Woche):
   - Business-Email bei United-Domains aktivieren
   - Resend-Account (gratis 3000/Monat)
   - Newsletter wieder anschalten
   - AdSense bewerben Tag 7-10 (Samstag)

   PRIORITY 3 (Code-Fix in nachfolgender Session):
   - Mastodon-Token Vercel-Redeploy erzwingen
   - Cache-Headers Force-Redeploy
   - Writer Word-Count investigieren (warum 364 statt 1000?)
   - Affiliate-Optimizer Keyword-Liste expandieren

==== CONS DE BENUTZER ABER NICHT KLAR WAS ZU TUN ====
- Bluesky Account anlegen: bsky.app
- Threads Account: threads.net
- LinkedIn Company Page
- Pinterest Account
- (alles optional, in dieser Reihenfolge)`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
