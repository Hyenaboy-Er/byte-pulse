# Nacht-Audit 2026-05-18 (autonom, ~3 h) — ehrlicher Bericht

Du hast gesagt: arbeite ohne zu fragen, prüfe alles wie ein IT-Profi, mach alles
richtig, sei ehrlich. Hier ist der ungeschönte Stand.

## 1. Die harte Wahrheit (aus den Daten BEIDER Suchmaschinen)

Direkt aus Bing Webmaster Tools + Google Search Console gelesen — nicht geraten:

- **Bing:** 2.300 URLs „discovered", aber **0 indexiert**, **0 Impressionen,
  0 Klicks**. URL-Inspektion des Top-Artikels: *„not known to Bing"*.
- **Google (GSC):** **0 Zeilen / 0 Impressionen**. Sandbox + s. u.
- Die ~10.000 „Views" in der Seiten-Statistik sind **kein organischer
  Such-Traffic** — das sind Bots/Crawler/Direkt. Echte Leser aus Suche ≈ 0.

Das ist kein Agenten-Fehler. Ursachen: (a) ~3 Wochen alte Domain (Google-
Sandbox, unverhandelbar — Zeit), (b) zwei konkrete technische Bugs, die ich
gefunden und gefixt habe (unten), (c) härteste Nische + keine Backlinks.

## 2. Was ich gefunden & GEFIXT habe (alles live gepusht)

| Commit | Fix |
|---|---|
| `5f6e4fe` | news-sitemap/sitemap gaben **apex-URLs** aus (NEXT_PUBLIC_SITE_URL war leerer String, `??` greift bei `''` nicht) → 308-Redirect-Schleife. Jetzt sauber `www`. |
| `c65ffc6` | **Open-IndexNow ist kaputt** (HTTP 422 für diese Domain, jeder Ping). Ersetzt durch **Bing Webmaster URL-Submission-API** (funktioniert, HTTP 200). In Code verdrahtet: jeder Publish + täglicher Backfill. |
| `4b15144` | Gleicher leer-Env-Bug in **layout.tsx (Canonical/OG/hreflang der ganzen Seite), robots.ts (Sitemap-Direktive), feed.xml**. Canonical zeigte auf die redirectende Apex-Domain — ein bekannter Grund, warum Google/Bing **nicht indexieren**. Jetzt alles `www`. |

Zusätzlich **manuell sofort**: Bing-API-Key generiert (Bing Webmaster →
Einstellungen), **80 aktuelle www-URLs an Bing zur Indexierung übermittelt**
(HTTP 200, Quota 99→19). Key liegt in `.secrets-local.txt` +
Vercel-Env `BING_WEBMASTER_API_KEY`. Tägliche Quota 99 / Monat 1399 —
der Code drosselt sich selbst darauf, kann nie 400en.

## 3. Die ehrliche Geld-Korrektur (wichtig)

Ich habe dir früher gesagt „Adsterra ist live, zahlt pro Impression". **Das
war falsch — ich habe mich geirrt.** Verifiziert im Code:

- **Adsterra: ABGESCHALTET seit 2026-05-12** (`AdsterraNative` gibt `null`
  zurück). Grund war richtig: Adsterra wurde als Spam geflaggt, schadet
  SEO + AdSense. Env-Vars gesetzt ≠ Komponente aktiv — mein Fehler.
- **StickyAdBar:** AdSense-gated → rendert nichts (kein AdSense).
- **AdSense:** noch nicht beantragt/genehmigt.
- **Skimlinks:** lädt clientseitig (ok), zahlt aber nur bei Klick → Retailer.
- **Amazon-Affiliate-Links:** rendern korrekt (`tag=bytepulse01-20`).

**Realität: aktuell praktisch KEIN Display-Ad-Umsatz** (Adsterra bewusst aus,
AdSense fehlt). Einzige aktive Geldwege: Amazon + Skimlinks — beide brauchen
Traffic + Kaufabsicht. Bei ~0 organischem Traffic ≈ 0 €. Kein Bug — ehrliche
Konsequenz aus jung + kein Traffic.

## 4. Was nur DU kannst (ich darf keine Accounts anlegen)

- **Google Publisher Center** (publishercenter.google.com): Publikation
  „Byte-Pulse" anlegen + news-sitemap einreichen → News/Discover ist für ein
  News-Magazin der größte Hebel, der die Sandbox teilweise umgeht.
- **Skimlinks / Brave**: Account-Anmeldung (Tabs offen). Sobald angemeldet:
  IDs in Vercel-Env, ich verdrahte den Rest.
- AdSense: weiter ~2 Wochen warten (Domain-Reife), dann beantragen.

## 5. Ehrlicher Ausblick

Die zwei Bugs (Canonical/Sitemap → Redirect; IndexNow kaputt) waren echte,
behebbare Indexierungs-Blocker — die sind jetzt weg, und 80 URLs sind aktiv
bei Bing eingereicht. Das **beschleunigt** die Indexierung, aber:

**Es gibt keinen Schalter für „jetzt Geld".** Selbst perfekt technisch
braucht eine 3-Wochen-Domain in der härtesten Nische Wochen, bis Bing/Google
relevant Traffic schicken. Realistisch erste Indexierung in Bing: Tage nach
diesen Fixes (Submission aktiv). Erste nennenswerte Einnahmen: Wochen, nicht
Tage — über Bing-Traffic + Amazon, NICHT diese Woche. Wer was anderes sagt,
lügt.

Alles Kontrollierbare ist jetzt erledigt. Der Rest ist Zeit + die zwei
Anmeldungen oben.

## 6. LIVE verifiziert (nicht nur behauptet)

Direkt von der Live-Seite geprüft, nachdem die Fixes deployt waren:

- Homepage-Canonical: `https://www.byte-pulse.net` ✅ (vorher: redirectende
  Apex `byte-pulse.net` — der Indexierungs-Blocker, jetzt weg)
- robots.txt Sitemap-Direktiven: beide `https://www.byte-pulse.net/...` ✅
- news-sitemap `<loc>`: `https://www.byte-pulse.net/...` ✅
- Bing-API: 80 www-URLs eingereicht, HTTP 200, im Code automatisiert ✅
- Pipeline gesund: 568 Artikel, Writer lief vor < 1 h ✅

Der Canonical-/Robots-Fix wirkte sofort live (Vercel-Env
`NEXT_PUBLIC_SITE_URL` gesetzt) — die Code-Migration macht es nur dauerhaft
robust. Heißt: der größte technische Indexierungs-Blocker ist **jetzt**
behoben, nicht erst nach dem nächsten Deploy.
