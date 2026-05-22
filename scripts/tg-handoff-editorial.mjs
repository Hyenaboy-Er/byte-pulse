import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `editorial@byte-pulse.net STATUS - Handoff

==== AUTONOM ERLEDIGT ====
- Alle 15 Code-Stellen hello@ -> editorial@ umgestellt
  (privacy EN/DE, impressum, contact EN/DE, editorial-policy,
   affiliate-disclosure, layout.tsx Organization-Schema)
- Site ist bereit fuer editorial@ - sobald die Route in Cloudflare
  steht, gehen die Mails an dein Gmail.

==== WAS DU IN 30 SEK MACHEN MUSST ====
Cloudflare Dashboard hing dauerhaft beim Laden (SPA bricht ab,
JS laedt, aber API-Calls starten nicht). Hab in 3 Tabs + Hard-Reload
+ neuer Tab probiert - kein Erfolg.

Mach das selber, dauert wirklich 30 Sek:

1. https://dash.cloudflare.com/?to=/:account/:zone/email/routing/routes
   (oder Sidebar -> E-Mail-Adresse -> E-Mail-Weiterleitung)

2. Klick "Adresse erstellen" / "Create address"

3. Custom address: editorial   (links vor dem @)
   Destination: serhaterlev@gmail.com
   -> "Erstellen und fortfahren"

4. Cloudflare schickt jetzt eine Mail an serhaterlev@gmail.com
   -> Diese oeffnen, "Verify email" Link klicken.

5. Zurueck auf Cloudflare -> "Email routing aktivieren" (falls
   noch nicht aktiv). Cloudflare schreibt automatisch die MX +
   SPF DNS-Records rein.

==== DEPLOY DANACH ====
Sag mir Bescheid wenn das laeuft - dann committe ich den
hello->editorial Swap + push -> Vercel deployed -> Impressum
und alle Footer zeigen die neue Adresse.

==== NEBENBEI ====
Falls Dashboard bei dir auch haengt: Inkognito-Tab + neu einloggen
hilft meistens.`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
