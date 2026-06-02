# Was Serhat selbst klicken muss

Alles in dieser Liste **kann ich nicht autonom** (Anthropic-Safety-Block bei
Identity/Geld/Account-Erstellung). Sobald du diese 5 Dinge gemacht hast, läuft
die ganze Maschine ohne dein Zutun weiter.

Reihenfolge nach Impact sortiert — wenn du keine Zeit hast, mach nur 1 + 2.

---

## 1. AdSense-Antrag einreichen (~15 Min, höchster Impact)

**Was:** Den eigentlichen Approval-Button drücken. Alles im Code ist ready.

**Schritte:**
1. https://www.google.com/adsense/ → „Get started"
2. Login mit dem Google-Account der GSC für byte-pulse.net verifiziert hat
3. Site URL eingeben: `https://www.byte-pulse.net`
4. Land: Germany, Zahlungsadresse: BRL Vision Solutions Daten
5. Submit → Google review dauert 1-14 Tage

**Wenn approved:** Google schickt dir die Publisher-ID (`pub-XXXXXXXXXXXXXXXX`).
Die in Vercel als Env-Var `NEXT_PUBLIC_ADSENSE_CLIENT` setzen — Ads gehen
automatisch live.

**Wenn abgelehnt:** Google sagt explizit was fehlt. Schick mir den Rejection-
Grund, ich fixe es im Code.

---

## 2. LinkedIn Client ID + Secret schicken (~2 Min Klick + 2 Min meine Arbeit)

**Status:** Du sagtest „LinkedIn fertig". Ich brauche aber noch die zwei
Werte aus deiner LinkedIn-Developer-App.

**Schritte:**
1. https://www.linkedin.com/developers/apps → „Byte-Pulse Auto-Poster" öffnen
2. Tab **Auth** → unter „Application credentials"
3. **Client ID** kopieren (sieht aus wie `78abc1def2ghij`)
4. **Client Secret** anzeigen + kopieren (sieht aus wie `WPL_AP1.XXXX.XXXX`)
5. Beide an mich

**Was ich danach mache:** `.env` setzen → OAuth-Helper-Skript starten →
du klickst einmal „Authorize" im Browser → Token + URN sind dann automatisch
in den GitHub-Secrets → Auto-Poster läuft 2× täglich.

---

## 3. Google Ads 50€ live schalten (~10 Min)

**Status:** Komplettes Playbook ready in `GOOGLE_ADS_50EUR_SETUP.md`.

**Schritte:**
1. https://ads.google.com → mit demselben Google-Account wie AdSense
2. „Switch to Expert Mode" (NICHT Smart Mode — kostet 30% mehr ohne Mehrwert)
3. „Create a campaign without a goal's guidance" → Search
4. Werte aus `GOOGLE_ADS_50EUR_SETUP.md` reinkopieren:
   - 3 Ad Groups (AI / Hardware / Gaming+Mobile)
   - 24 Keywords + 45 Headlines + 12 Descriptions
   - US/UK Targeting, 7€/Tag
5. Karte hinterlegen → live

**Warum auch wenn AdSense noch nicht approved:** Google Ads pusht echten
Quality-Traffic auf die Seite, was AdSense im Re-Review als positives Signal
liest. ~50-100 Klicks in 7 Tagen.

---

## 4. Affiliate-Programme aktivieren (optional, +1-2h Arbeit für dich)

**Was:** Einnahmen über Affiliate-Links zusätzlich zu AdSense.

**Status:** Code ist fertig, braucht nur deine Account-IDs.

**Wo Accounts anlegen (alle kostenlos, kein Mindest-Traffic):**

| Programm | URL | Was tracken | Env-Var |
|---|---|---|---|
| **Amazon Associates DE** | https://partnernet.amazon.de | Produktlinks in Deals-Artikeln | `AMAZON_ASSOC_TAG=bytepulse-21` |
| **Skimlinks** | https://skimlinks.com | Auto-Affiliate auf Brand-Mentions | `NEXT_PUBLIC_SKIMLINKS_ID=12345X` |
| **Infolinks** | https://www.infolinks.com | In-Text-Ads parallel zu AdSense | `NEXT_PUBLIC_INFOLINKS_PID=...` + `NEXT_PUBLIC_INFOLINKS_WSID=...` |

**Sobald Env-Vars in Vercel gesetzt sind:** ich brauche nichts zu tun, der
Code aktiviert sich automatisch (alle gated auf `process.env.*`).

---

## 5. Brave Creators verifizieren (~5 Min, kleine Einnahmen)

**Was:** Brave-Browser-User können dir BAT-Tokens (~3-5 ct pro engaged Reader)
passiv schicken, plus Brave teilt Werbe-Einnahmen.

**Schritte:**
1. https://creators.brave.com → Sign up als Creator
2. Channel „byte-pulse.net" hinzufügen
3. Verification-Token wird angezeigt
4. Token in Vercel als `NEXT_PUBLIC_BRAVE_VERIFICATION_TOKEN` setzen
5. Brave verifiziert in 24h → Einnahmen-Account aktiv

---

## Was ich währenddessen autonom mache

Während du klickst, mache ich (keine Aktion nötig von dir):

- 4-stage Multi-Agent-Pipeline läuft auf neue Artikel (live verifiziert)
- 117 thin articles werden automatisch via Multi-Agent upgegradet (~10/Tag)
- 4 parallele Cron-Workflows poken die Pipeline alle 3-4 Min
- Bing IndexNow ping bei jedem Publish
- DE-Translation läuft asynchron
- Bluesky / X / LinkedIn (sobald Token da) Auto-Post

---

## Status-Check jederzeit

```
curl https://www.byte-pulse.net/api/health
```

Zeigt alle Subsysteme + welche Env-Vars noch fehlen. Wenn `ok: true` und
`monetization.adsenseConfigured: true` — fertig.

---

*Geschrieben 2026-06-02 von Claude (deinem Robo-Mitarbeiter) während Sweep
Session #2. Ich update diese Liste, sobald du was abhakst.*
