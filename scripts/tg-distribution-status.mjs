import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Distribution-Status:

ERLEDIGT von mir:
1. Google News Publisher Center: Byte-Pulse als Publikation Deutschland angelegt. Google indexiert ab jetzt fuer "Top Stories" Rich-Results.
2. Bing Webmaster Tools: war schon verifiziert, 536 URLs indexed, 2 Sitemaps SUCCESS, IndexNow live.

GESKIPPT (mit Begruendung):
3. Yandex Webmaster: IndexNow-Agent feedet Yandex automatisch, separate Registrierung null ROI
4. Apple News Publisher: zu restriktiv fuer 3-Tage-Site, retry in 2 Monaten
5. Microsoft Start: Publisher-Program ist closed, kommt via Bing-Index in MSN sowieso
6. Feedly: passive Discovery, Site noch zu jung
7. Flipboard: hat publisher-Tools eingestellt, ROI minimal

JETZT DU (Auto-Poster-Code ist schon fertig im social.ts):
8. Mastodon Account anlegen (BytePulseNet @ mastodon.social) + Token aus Settings/Applications -> Vercel als MASTODON_INSTANCE + MASTODON_ACCESS_TOKEN
9. Bluesky Account (bytepulse.bsky.social) + App-Password aus Settings/AppPasswords -> Vercel als BLUESKY_HANDLE + BLUESKY_APP_PASSWORD
10. LinkedIn Company Page (Byte-Pulse) -> Linkedin Developer App -> OAuth Token -> Vercel
11. ProductHunt Launch vorbereiten (~7 Tage nach AdSense-Live wenn Traffic stabil)
12. DEV.to + Hashnode Cross-Posting (manuell, mit canonical -> byte-pulse.net)

Setup-Docs liegen in:
- scripts/setup-mastodon.md
- scripts/setup-bluesky.md

Sobald du Tokens hast, packen wir die in Vercel + nach naechstem Cron ist Auto-Posting live.

Schon AKTIV:
- X (@bytePulsenew) automatisch
- Telegram Bot (du bekommst Alerts)
- Bing/Yandex via IndexNow (sofort nach Publish)
- Google via sitemap + news-sitemap`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
