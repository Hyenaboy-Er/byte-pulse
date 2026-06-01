# Google Ads 50 € Kampagne für byte-pulse.net

**Erstellt:** 2026-06-01
**Cross-validated:** Gemini 2.5 Flash via PAL MCP
**Ziel:** AdSense-Approval-Score 73% → 90%+ über Quality-Traffic
**Sekundär:** Organische SEO-Hebel anstoßen (Engagement-Signale)

---

## Strategie auf einen Blick

| Parameter | Wert | Warum |
|---|---|---|
| Kampagnen-Typ | **Search** (nicht Perf-Max) | Präzises Intent-Matching → höchste Verweildauer = AdSense-Gold |
| Budget gesamt | 50 € | über ~7 Tage = 7 €/Tag |
| Tagesbudget | **7 € / Tag** | 7-Tage-Laufzeit liefert genug Daten für AdSense-Bot |
| Länder | **USA + UK** (PRIMÄR) | Englischer Content matched US/UK-Audience perfekt; höchste CPC = höchster AdSense-CPM |
| Sprache | Englisch | Site-Content ist Englisch |
| Erwartete Klicks | 50-100 | 0,50-1,00 € durchschnittlicher CPC bei long-tail Tech |

**Erwartung:** 50-100 echte Klicks in 7 Tagen + viele zusätzliche organische via SEO-Boost durch Quality-Signal.

---

## Schritt-für-Schritt: Setup (10 Min)

### 1) Google Ads Account anlegen
- Gehe auf https://ads.google.com mit dem **selben Google-Account wie AdSense**
- „Switch to Expert Mode" klicken (NICHT Smart Mode — kostet 30% mehr ohne Mehrwert)
- „Create a campaign without a goal's guidance" → **Search**

### 2) Kampagnen-Settings
- **Networks:** ✅ Search Network, ❌ Display Network (Display verbrennt das Budget)
- **Locations:** **United States** + **United Kingdom** (KEIN Deutschland — Bounce-Rate dort hoch bei englischen News)
- **Languages:** English
- **Audience segments:** ✅ Add → „In-market audiences" → „Consumer Electronics" + „Computers & Peripherals"
- **Budget:** 7 € pro Tag
- **Bidding:** **Maximize clicks** (manueller CPC nicht nötig bei diesem Budget)
- **Conversion goals:** Erstmal überspringen (Cookie-Banner-Probleme würden Daten verfälschen)

### 3) Ad-Groups (3 Gruppen, je 1 Ad-Set)

#### Ad Group 1: AI News
**Keywords (alle als "Phrase Match" eintragen):**
```
"latest AI news"
"AI tools 2026"
"new AI release"
"ChatGPT alternatives"
"Claude AI news"
"Gemini AI features"
"AI tool review"
"open source AI"
```

**Ad Headlines (15 — Google zeigt rotierend):**
```
1. Today's AI News, No Hype
2. AI Releases This Week
3. Real-World AI Tools Tested
4. ChatGPT, Claude, Gemini
5. AI News Without the Fluff
6. New AI Tools 2026
7. Practical AI Coverage
8. Byte-Pulse: AI News
9. Daily AI Updates
10. Independent AI Reviews
11. Free AI Tools Compared
12. AI Industry Insights
13. The AI Newsroom That Tests
14. AI News for Developers
15. AI Tools You Can Actually Use
```

**Ad Descriptions (4):**
```
1. Independent tech magazine covering AI tools, releases and real-world use cases. No hype, just signal.
2. Daily AI news with hands-on testing. Free to read, no paywall, no sponsored fluff.
3. From ChatGPT to Claude to Gemini — real comparisons and practical guides for developers and creators.
4. Byte-Pulse covers what works in AI today, not the next $20B funding round. Read it free.
```

**Final URL:** `https://www.byte-pulse.net/category/ai?utm_source=google&utm_medium=cpc&utm_campaign=adsense_warmup&utm_content=ai_group`

---

#### Ad Group 2: Hardware News
**Keywords:**
```
"latest CPU news"
"GPU reviews 2026"
"new graphics card"
"RTX 5090 review"
"Intel vs AMD"
"PC hardware news"
"Apple silicon news"
"chip industry news"
```

**Ad Headlines (15):**
```
1. Latest CPU & GPU News
2. PC Hardware Tested
3. RTX, Radeon, Apple Silicon
4. Hardware News Daily
5. Real GPU Benchmarks
6. Chip Industry Coverage
7. Byte-Pulse Hardware
8. New Hardware Releases
9. Intel vs AMD 2026
10. Hardware News No Hype
11. Hands-On PC Reviews
12. The Tech Newsroom
13. CPU/GPU Coverage Daily
14. Latest Chip Announcements
15. Hardware for Real Users
```

**Ad Descriptions:**
```
1. Independent hardware coverage. New CPUs, GPUs, chip industry moves — daily, free, no paywall.
2. Real benchmarks, no marketing decks. From RTX to Apple Silicon, we test what matters.
3. Byte-Pulse covers PC hardware for people who actually build, upgrade and decide. Read free.
4. Daily hardware news, weekly deep-dives. From Intel to AMD to Apple Silicon — covered.
```

**Final URL:** `https://www.byte-pulse.net/category/hardware?utm_source=google&utm_medium=cpc&utm_campaign=adsense_warmup&utm_content=hw_group`

---

#### Ad Group 3: Gaming/Mobile/Cross-Topic
**Keywords:**
```
"gaming news today"
"new game release"
"iPhone 17 review"
"smartphone news"
"PlayStation news"
"Xbox news"
"gaming hardware"
"mobile tech news"
```

**Ad Headlines (15):**
```
1. Daily Gaming News
2. Latest Console Updates
3. New Game Releases 2026
4. PlayStation, Xbox, PC
5. iPhone 17, Pixel, Samsung
6. Mobile Tech News
7. Byte-Pulse Gaming
8. Game Industry News
9. Smartphone Reviews
10. Gaming Hardware Daily
11. Real Game Coverage
12. Tech News for Gamers
13. Console & PC Gaming
14. Mobile + Gaming News
15. Tech Magazine, Free
```

**Ad Descriptions:**
```
1. Gaming + mobile tech news. New releases, console updates, smartphone reviews — daily.
2. PlayStation, Xbox, iPhone, Pixel — independent coverage with no console-war nonsense.
3. Byte-Pulse covers gaming and mobile for people who play AND work. Free, no paywall.
4. Daily tech news across gaming, mobile, hardware. The newsroom that doesn't just rewrite press releases.
```

**Final URL:** `https://www.byte-pulse.net/?utm_source=google&utm_medium=cpc&utm_campaign=adsense_warmup&utm_content=mixed_group`

---

### 4) Negative Keywords (auf Campaign-Level)

Diese verhindern, dass das Budget bei „free download"-Suchen verbrannt wird:

```
free download
torrent
crack
serial key
patch
wallpaper
ringtone
emulator download
job
hiring
career
salary
```

---

### 5) Conversion-Tracking (Optional, aber empfohlen)

Im Google-Ads-Account → Tools → Measurement → Conversions:
- **„Page view" Conversion** anlegen (kostet keine zusätzlichen Klicks)
- Tag generieren lassen, kopieren
- **Schicke mir den Tag** — ich baue ihn in `src/app/layout.tsx` ein

---

## Was du nicht selbst tust (kann ich)

| Task | Status |
|---|---|
| UTM-Parameter im byte-pulse-Code tracken | ✅ kann ich automatisch — sag Bescheid |
| Conversion-Tag in Layout einbauen | ✅ sobald du Tag kopiert hast |
| Vercel-Analytics-Filter für Google-Ads-Traffic | ✅ kann ich autonom |
| Tägliches Performance-Tracking (KPI-Report) | ✅ kann ich automatisch via Google-Ads-API einbauen — braucht aber API-Token |

---

## Erwartete Ergebnisse nach 7 Tagen

- 50-100 Klicks von US/UK-Tech-Audience
- ~30% davon mit ≥30 Sek Verweildauer (= AdSense-Engagement-Signal)
- 3-5 organische Backlinks durch erhöhte Visibility
- GSC-Impressions: +20-50% durch Quality-Score-Boost
- AdSense-Score-Schätzung: 73% → 80-85% (echter 90+ braucht 30 Tage)

**Reicht das für AdSense-Approval?** Wahrscheinlich noch nicht — Google will sehen, dass Traffic NICHT NUR aus Ads kommt. Aber die 50€ pushen die Quality-Signale, die organisch nachziehen.

---

## Wenn du keine Lust auf Account-Setup hast

**Alternative: Direct-Pay via mein Setup-Skript (wenn du mir Zugang gibst):**
- Du loggst dich 1× bei https://ads.google.com ein
- Klick „API-Zugriff anfordern" → Developer Token (kostet 0 €, dauert 1-3 Tage Approval)
- Sobald Token da, kann ich Campaign + Keywords + Ads vollautomatisch via Google-Ads-API anlegen

**Aktuelle Sperre:** Google Ads API braucht Manual-Approval, ich kann das nicht beschleunigen. Aber sobald approved → 100% Automatisierung.
