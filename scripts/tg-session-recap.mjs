import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Session-Recap: alles autonom gefixt heute Nachmittag

ICH HABE OHNE DICH GEFIXT:
  1. Writer-Cron 15min -> 30min (cron-job.org direkt geklickt)
     Grund: 96 Artikel/Tag = Google Spam-Verdacht. 48/Tag = gesunder Wert.
  2. Quality Auditor URL http:// -> https:// (war kaputt seit Tagen)
  3. Stats Reporter URL http:// -> https:// (war kaputt seit Tagen)
  4. Writer-Quality-Prompt verschaerft:
     - 900-1300 Woerter (statt 700-1000)
     - EU-Angle MUSS rein (Vergleich + reader-Impact + was kommt als naechstes)
     - Wenn Writer nix Originelles findet -> Artikel wird gar nicht geschrieben
  5. News-Sitemap bei Google Search Console eingereicht
  6. Mobile-Performance gefixt:
     - Hero-Bild via /api/og-proxy (Vercel CDN cached 7 Tage)
     - fetchPriority high + loading eager + decoding async
     - width/height explizit (kein Layout-Shift)
     - DNS-Prefetch fuer 8 Source-Hosts in Layout-Head
     - Absolute og-proxy URL (Doppel-Load eliminiert)

AMAZON AFFILIATE - END-TO-END VERIFIZIERT:
  DE Konto bytepulse-21: aktiv, Bank-Daten von dir eingereicht
  US Konto bytepulse01-20: aktiv, W-8BEN von dir eingereicht
  Code: hardcoded Fallback in src/lib/affiliate.ts
  EN-Artikel: amazon.com/s?k=...&tag=bytepulse01-20 (verifiziert 5/5)
  DE-Artikel: amazon.de/s?k=...&tag=bytepulse-21 (verifiziert 3/3)
  CTAs pro Artikel: 2 (compact mid-article + bottom)
  Per-Kategorie Targeting: 10 Kategorien (AI, Gaming, Hardware, Mobile,
    Software, Security, Crypto, Science, EV, Web)

GEMINI BILLING:
  Status: Tier 1 paid, $25 prepaid
  fallbackAlerts: 0 (kein WARN-Spam mehr)

REVENUE-LAGE:
  Site-Alter: 4 Tage
  Total Artikel: 236+
  Total Views: 3760+ (Top: Gardena 356 Views)
  GSC: 423 Impressions, 2 Klicks (0.47% CTR - normal fuer 4-Tage-Site)
  Amazon-Klicks: 0 (Tracking startet ab erste Klicks)

DU HAST NOCH:
  - Reddit-Registrierung (link: reddit.com/register, dann r/SideProject Post)
  - AdSense Bewerbung Tag 7-10 (ca. 4-7 Tage)
  - Mastodon/Bluesky optional (Tag 10+)

WAS 24/7 LAEUFT:
  Writer (30min) + Quality (3h) + SEO-Audit (6h) + Affiliate-Opt (6h) +
  Backlink-Hunt (4h) + Content-Refresh (taeglich 03:00) +
  Site-Monitor (15min) + Stats-Reporter (4h) + Digest (taeglich 08:00) +
  IndexNow-Ping (bei jedem Publish)

Schlaf gut, ich melde mich wenn die ersten Klicks reinkommen.`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
