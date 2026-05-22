import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const msg = `Pipeline ist wieder voll aktiv.

Was es war: Gemini 2.5 Flash hat versteckte "thinking tokens" - das Modell denkt intern 3000-5000 Tokens BEVOR es JSON ausgibt. Mit max_tokens=5000 wurde der Output mitten in der Antwort abgeschnitten. Mit 8000 lief Vercel ins 60s Function-Timeout. Catch-22.

Loesung: Writer auf OpenAI, Rest auf Gemini.
  defaultProvider: gemini
  writer:          openai  <- neue per-Role-Override
  humanizer:       gemini
  reviewer:        gemini
  translator:      gemini

Gerade verifiziert:
- Lego Batman Game Leak Article publiziert in 70s, Quality 78
- https://www.byte-pulse.net/article/lego-batman-game-leak-sparks-spoiler-fears
- LLM_WRITER_PROVIDER=openai im Vercel Env aktiv

Kostenrechnung neu:
- Writer (OpenAI GPT-4o) etwa 0.05 \$ pro Artikel = teuerste Single-Call
- Humanizer + Reviewer + Translator (Gemini Flash) zusammen ca. 0.005 \$ pro Artikel
- 100 Artikel/Tag * (0.05 + 0.005) = 5.50 \$/Tag = 165 \$/Monat
- Statt vorher ca. 500 \$/Monat all-OpenAI bei gleicher Qualitaet

Wenn Gemini Pro mit echter thinking-budget Control verfuegbar wird, koennen wir den Writer auch zurueck auf Gemini, dann waeren wir wieder bei den ~15 \$/Monat. Bis dahin: stabil + zuverlaessig + cron-friendly mit dem aktuellen Setup.

Site selbst:
- Mobile fast wieder (Adsterra Social Bar weg, Modals lazy)
- home-en 156KB / 1.7s cold, 450ms warm
- Site-Monitor pollt 3 Targets / kommt mit Alerts auf Telegram
- X-Auto-Posts laufen (@bytePulsenew)`;

const res = await fetch(`https://api.telegram.org/bot${get('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ chat_id: get('TELEGRAM_CHAT_ID'), text: msg, disable_web_page_preview: true }),
});
console.log(res.status);
