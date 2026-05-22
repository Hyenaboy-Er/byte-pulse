import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Pipeline-Health-Report

Was eben war:
- Gemini Free Tier (10 RPM / 250 Req pro Tag) ist seit ~10:00 leer
- Jeder Writer-Call krachte mit 429 -> Pipeline produzierte 0 Artikel in 9 Versuchen
- Schwerwiegender Bug fuer dich gewesen weaere wenn ich's nicht erwischt haette

Was gerade live ist:
- llmChat() faengt 429 vom Gemini ab und routed automatisch zu OpenAI
- Erste 2 Artikel nach Deploy schon durch: "Pixel Take a Message" + "C++ Devs Embrace AI"
- Beide voll durch writer/humanizer/reviewer/translator/social geflossen
- Du wirst alle 30 Min einen Telegram-Alert bekommen wenn der Fallback feuert (also tagsueber jetzt staendig bis du eine der Optionen waehlst)

Du hast 2 Optionen:
1) Gemini Billing aktivieren (1 Klick): aistudio.google.com -> Abrechnung einrichten -> Karte hinterlegen
   - Unser Volumen ~12 \$/Monat total
   - 25-50x billiger als reines OpenAI
   - Limits gehen von 250/Tag auf 1 Mio/Min hoch
2) Nichts machen
   - Pipeline laeuft trotzdem (OpenAI federt ab)
   - Dein 50\$-OpenAI-Guthaben wird in ~10 Tagen weg sein
   - Wenn das auch leer ist, ALLE Provider down -> Pipeline still

Empfehlung: Option 1, JETZT. Dauert eine Minute. Karte hinterlegen reicht, der tatsaechliche Verbrauch ist Kleingeld.

Status Dedup: 1 Debian-Artikel auf Homepage (war 7). Off-Topic-Filter und Pick-Retry-Loop sind drin. Picker rotiert sauber, publiziert vielfaeltig.`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
