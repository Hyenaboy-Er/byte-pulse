import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `MONEY-MODE LIVE auf Production:

GEMINI BILLING ($25 prepaid) - aktiv. fallbackAlerts: 0. Kein WARN-Spam mehr.

AMAZON CTA AUF JEDEM ARTIKEL - vorher 0 Affiliate-Links, jetzt verifiziert auf 4 Kategorien live:
  Gardena/Hardware -> amazon.com/s?k=NVMe%20SSD%202TB&tag=bytepulse01-20
  Pixel/AI -> tag=bytepulse01-20 (AI Productivity Tools)
  Checkmarx/Security -> tag=bytepulse01-20 (YubiKey 5C)
  Debian/Software -> tag=bytepulse01-20 (Programming Books)
  Plus 6 weitere Kategorien (gaming/mobile/crypto/science/ev/web)
  DE-Articles bekommen amazon.de/s?...&tag=bytepulse-21

ADSTERRA NATIVE - Component hardcoded mit Default-IDs, rendert nach Cookie-Accept

WICHTIG fuer dich:
  bytepulse-21 (DE) und bytepulse01-20 (US) sind PLATZHALTER!
  Wenn dein Amazon-PartnerNet-Tag anders ist, schick mir den richtigen
  und ich ueberschreibe in 30 Sekunden. Falsch konfiguriert verlierst
  du Provisionen.

WAS JETZT 24/7 LAEUFT (kein PC noetig):
  - Writer mit Gemini Tier 1 (alle 15min)
  - Universal Amazon CTA auf jedem neuen Artikel
  - Affiliate-Optimizer scant alle 6h fuer Product-Keywords
  - Backlink-Hunter sucht alle 4h Reddit/HN Threads
  - Content-Refresher refresht taeglich Top-Artikel

REVENUE-PROGNOSE bei aktuellem Traffic (3066 views):
  Diese Woche: ~5-15 EUR (zu wenig Traffic noch)
  In 30 Tagen: ~50-150 EUR (wenn Indexing + SEO greift)
  In 90 Tagen: ~300-800 EUR (mit AdSense ab Tag 10)`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
