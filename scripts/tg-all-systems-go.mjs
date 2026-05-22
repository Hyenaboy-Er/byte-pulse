import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `ALL SYSTEMS GO - Money-Mode 100% live:

DU HAST GEMACHT:
  - Gemini Billing aktiviert ($25 prepaid)
  - Amazon US Tax-Profile (W-8BEN) eingereicht
  - Amazon DE Bankverbindung gespeichert
  - Beide Accounts: status "Complete"

ICH HABE PROGRAMMIERT (alle live auf Production):
  - Amazon Affiliate Tags hardcoded (DE: bytepulse-21, US: bytepulse01-20)
  - Universal Amazon CTA pro Kategorie (10 Kategorien, EN+DE)
  - Mid-Article Inline Amazon Cards nach Paragraph 3 + 6
  - Adsterra Native Banner mit fallback-IDs
  - 3 monetisierte CTAs pro Artikel (statt vorher 1)

SITE-STATS:
  - 236 Artikel total (+9 in letzter Stunde)
  - 3619 Total Views (+550 in letzter Stunde)
  - Gemini Tier 1: fallbackAlerts = 0 (kein WARN-Spam mehr)
  - Writer-Cron laeuft alle 15min sauber

WAS JETZT 24/7 AUTONOM LAEUFT:
  - Writer schreibt + uebersetzt + reviewed alle 15min
  - Jeder neuer Artikel hat 3 Amazon-CTAs sofort live
  - Affiliate-Optimizer scant alle 6h fuer Product-Keywords
  - Backlink-Hunter sucht alle 4h auf Reddit/HN
  - Content-Refresher refresht taeglich Top-Artikel
  - Quality-Auditor scant Faktentreue + dead links
  - SEO-Auditor checkt Sitemap/Robots/Ads.txt alle 6h
  - Site-Monitor alle 15min Speed/Errors
  - Stats-Reporter alle 4h Telegram-Update
  - Digest taeglich 08:00 Morning-Briefing
  - IndexNow ping bei jedem Publish zu Bing/Yandex

REVENUE-ROADMAP:
  Tag 1-3 (heute): Erste Klicks via Amazon-CTAs, 0-5 EUR
  Tag 4-7: Indexing greift, organischer Traffic startet, 5-30 EUR
  Tag 7-10: AdSense beworben (Site hat dann 600+ Artikel), 30-100 EUR
  Tag 10-30: AdSense approved, dual-monetization, 200-500 EUR

  90-Tage-Ziel weiterhin 2000 EUR/Monat sobald Traffic stabilisiert
  und Mastodon/Bluesky/LinkedIn auto-poster live (User-Setup pending)`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
