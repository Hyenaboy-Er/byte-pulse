# Byte-Pulse

Fully-automated bilingual (EN/DE) tech news magazine. Seven AI agents pull RSS, write original English articles, humanize the language, fact-check, translate to German, and continuously monitor what's been published.

**Live:** https://byte-pulse.net (after deploy)

## The seven agents

| # | Agent | Job |
|---|---|---|
| 1 | Keyword-Research | Pull trends from Hacker News, Reddit (9 subs), Google Suggest |
| 2 | Researcher | Full-text scrape of source URLs (Mozilla Readability) |
| 3 | Writer | 1000–1500-word English article (GPT-4o, fact-strict) |
| 4 | Humanizer | Strip AI tells, US-conversational tone |
| 5 | Reviewer | 7-axis quality + plagiarism + factuality (GPT-4o-mini) |
| 6 | Translator | EN→DE, cached in DB, on every publish |
| 7 | Monitor | Audit links, images, AI smell, factuality |

## Schedule

- **Writer**: every 15 min (max 96 articles/day)
- **Translator**: triggered on every publish
- **Monitor light**: hourly :15
- **Monitor full** (with GPT fact-check): daily 08:00 Europe/Berlin
- **Homepage cache**: 60 sec

## Local development

```bash
npm install
npx prisma db push        # SQLite at ./dev.db
npm run dev               # http://localhost:3000
npm run agent:run         # one-shot agent test
npm run agent:loop        # continuous (in second terminal)
npm run fill              # generate N articles + DE translations (env TARGET_ARTICLES=12)
npm run monitor:run       # one-shot monitor
```

Required env (`.env`):

```
OPENAI_API_KEY=sk-proj-...
DATABASE_URL=file:./dev.db
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME=Byte-Pulse
CRON_SECRET=local-dev-secret
```

## Production deploy (Vercel + Turso)

### 1. Database — Turso (free tier)

1. Sign up at https://turso.tech
2. Install CLI: `irm get.tur.so/install.ps1 | iex` (Windows) or `curl -sSfL https://get.tur.so/install.sh | bash`
3. `turso auth login`
4. Create DB: `turso db create byte-pulse`
5. Get URL: `turso db show byte-pulse --url`            → `libsql://...`
6. Get token: `turso db tokens create byte-pulse`        → eyJ...

### 2. Push schema to Turso

Local with the Turso URL temporarily set:

```bash
DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=eyJ... npx prisma db push
```

### 3. Vercel

1. Sign up at https://vercel.com (login with GitHub)
2. Import this repo
3. Set environment variables:
   - `OPENAI_API_KEY` — same as local
   - `DATABASE_URL` — Turso libsql URL
   - `DATABASE_AUTH_TOKEN` — Turso token
   - `NEXT_PUBLIC_SITE_URL=https://byte-pulse.net`
   - `NEXT_PUBLIC_SITE_NAME=Byte-Pulse`
   - `CRON_SECRET` — long random string (use `openssl rand -hex 32`)
4. Deploy

### 4. Domain

- In Vercel project: Settings → Domains → add `byte-pulse.net`
- Copy the Vercel target (e.g. `cname.vercel-dns.com`)
- In Cloudflare DNS: add CNAME `@ → cname.vercel-dns.com` (or Vercel IPs as A records)
- Wait 1-5 min for SSL cert

### 5. Cron (already configured in `vercel.json`)

Vercel will auto-run:
- `*/15 * * * *` → `/api/cron` (writer)
- `15 * * * *`   → `/api/admin/monitor` (light audit)

Both endpoints check `Authorization: Bearer $CRON_SECRET`.

### 6. Google Search Console + News

1. **Search Console** (https://search.google.com/search-console): add property `https://byte-pulse.net`, verify via DNS (Cloudflare TXT record), submit `sitemap.xml` and `news-sitemap.xml`.
2. **News Publisher Center** (https://publishercenter.google.com): create publication, point to `byte-pulse.net`, submit news-sitemap. Approval 2-6 weeks.

## Architecture

```
src/
  app/
    page.tsx                       Home (EN)
    article/[slug]/page.tsx        Article detail (EN)
    category/[slug]/page.tsx       Category (EN)
    de/                            Mirror tree (DE)
      page.tsx
      article/[slug]/page.tsx      On-demand translates if not cached
      category/[slug]/page.tsx
      newsletter/about/privacy/search/feed.xml
    admin/
      page.tsx                     Stats, agent logs, run buttons
      MonitorPanel.tsx             Last audit, Remove flagged
      TrendsPanel.tsx              HN+Reddit+Google trends, refresh
      RunButton.tsx                Manual writer run
    api/
      cron/route.ts                Auth-gated writer trigger (Vercel cron)
      admin/run /monitor /trends /unpublish
      newsletter/                  Subscribe + send
      og/[slug]/route.ts           SVG OG image
    sitemap.ts                     Standard sitemap (EN + DE)
    news-sitemap.xml/route.ts      Google News sitemap (last 48h)
    robots.ts                      robots.txt with Googlebot-News allow
    feed.xml/route.ts              RSS feed (EN)
  components/
    ArticleCard ArticleBody Header Footer LangSwitcher
    Markdown AdSlot StickyAdBar NewsletterForm
  lib/
    db.ts                          Prisma + libSQL adapter (Turso in prod)
    openai.ts                      Chat helpers + JSON extractor
    rss.ts sources.ts              13 RSS feeds + dedupe
    categories.ts                  10 categories
    i18n.ts                        UI strings EN/DE
    ogimage.ts slugify.ts readingTime.ts newsletter.ts
    agents/
      keyword-research.ts          Trends signal
      researcher.ts                Mozilla Readability
      writer.ts                    Strict-fact prompt
      humanizer.ts                 AI_PHRASES_EN list
      reviewer.ts                  7-axis + Plag + Fact
      translator.ts                EN→DE, DB-cached
      monitor.ts                   Daily audit
      orchestrator.ts              Pipeline + revise loop
  scripts/
    run-agents.ts cron-local.ts fill.ts run-monitor.ts reset.ts
prisma/
  schema.prisma
vercel.json                        Cron config
```

## Cost estimate (per month at 96 articles/day)

- Hosting (Vercel Hobby): **0€**
- Database (Turso free 9GB): **0€**
- OpenAI (writer + humanizer + reviewer + translator + monitor): **~50–80 €**
- **Total: ~50–80 €/month**

Revenue projection (12 months): AdSense + affiliate + newsletter sponsorship typically reaches 800–2000 €/month with consistent SEO + Google News inclusion.
