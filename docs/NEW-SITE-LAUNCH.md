# New-Site Launch Runbook

Every painful thing we learned shipping byte-pulse.net, as a checklist so
site #2 is **one day, not two weeks**. Order matters.

## 0. What's already solved IN CODE (do NOT re-debug these)

These bugs cost days on byte-pulse and are fixed permanently in the codebase
— a clone inherits the fixes:

- **Writer length**: orchestrator has a length gate — <800w → 1 expand pass,
  <700w after that → not published. New articles are always substantial.
- **Humanizer compression**: length-preserving prompt + revert-to-draft guard.
- **Cache-Control no-store**: `generateStaticParams` on `/article/[slug]`
  (EN+DE) → ISR, CDN-cacheable. Don't remove it.
- **Affiliate junk**: `affiliateCtaFor(cat,lang,{title})` is title-aware +
  off-niche suppression. Nested-link bug fixed in `injectAmazonLinks`.
- **Off-niche filler**: orchestrator `OFFTOPIC_TERMS` + writer NICHE GUARD.
  Set `SITE_NICHE` per clone.
- **GFM tables** render in the custom Markdown component.
- **Markdown table / byline / Live-badge** rendering fixed.
- **Cron limit**: Vercel Hobby = 2 crons. Pattern: `/api/cron` (writer) +
  `/api/daily` fan-out that triggers newsletter, internal-linker,
  comparison, quality-upgrade, gsc-monitor, sentinel, quality/seo-auditor,
  title-booster, trend-reactor, social-retry. Reuse this — never rely on
  cron-job.org.

## 1. Central config (5 min)

Set in `src/lib/site.ts` defaults OR (preferred) as Vercel env vars:
`NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SITE_URL`, `SITE_APEX_DOMAIN`,
`NEXT_PUBLIC_SITE_TAGLINE`, `NEXT_PUBLIC_SITE_EMAIL`, `NEWSLETTER_FROM`,
`NEWSLETTER_BRAND`, `SITE_FOUNDER_NAME`, `SITE_FOUNDER_ROLE`, `SITE_NICHE`,
`MASTODON_INSTANCE`, `MASTODON_ACCOUNT_ID`, `RESEND_DOMAIN_ID`,
`CLOUDFLARE_ZONE_ID`, `VERCEL_PROJECT`.
Still site-specific by nature (real content, edit per business): legal
pages — impressum, privacy, about, editorial-policy, affiliate-disclosure.

## 2. Secrets needed (the access that unblocks autonomy)

In `.secrets-local.txt` (gitignored). With these, the rest is autonomous —
this is the lesson: get API tokens early, never click dashboards.
- `GITHUB_PAT`, `VERCEL_TOKEN`, `VERCEL_PROJECT`, `VERCEL_TEAM`
- `CF_API_TOKEN` + `CF_API_EMAIL` (Cloudflare Global API Key works)
- `RESEND_API_KEY` + `RESEND_ADMIN_KEY` + `RESEND_DOMAIN_ID`
- `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`
- `CRON_SECRET`, LLM provider key, `GSC_SERVICE_ACCOUNT_KEY` (optional)
- `MASTODON_ACCESS_TOKEN`, social tokens as available

## 3. Email — the biggest time-sink. Do exactly this:

1. Cloudflare Email Routing: create route `<inbox>@domain → your-gmail`.
   **TYPO RISK**: byte-pulse lost a day to `editoral@` vs `editorial@`.
   Verify the rule string char-for-char (API: GET
   `/zones/{zone}/email/routing/rules`).
2. Resend: add domain → get DKIM/SPF records → set in Cloudflare via API
   (or Resend Auto-Configure OAuth). Wait for `status: verified`.
3. **DMARC is NOT optional** (Resend marks it optional — it isn't). Add
   TXT `_dmarc`: `v=DMARC1; p=none; rua=mailto:<inbox>; fo=1`. Missing
   DMARC = guaranteed spam folder.
4. **List-Unsubscribe is mandatory** (Gmail/Yahoo Feb-2024). The
   newsletter code already sends per-subscriber `List-Unsubscribe` +
   `List-Unsubscribe-Post: One-Click` and has `/api/newsletter/unsubscribe`
   (RFC 8058). Just works if `RESEND_API_KEY` + domain verified.
5. Reputation is time, not a switch. First ~2 weeks some mail still spams;
   no fix exists — set honest expectations in signup copy.

## 4. SEO / discovery

- robots.txt already correct (only `/api/`, `/admin` blocked). The GSC
  "blocked by robots.txt" notice = the og-image API endpoints; harmless.
- sitemap.xml + news-sitemap.xml auto-generated. IndexNow agent pings
  Bing on publish.
- Bing Webmaster: add site (needs MS login) → import from GSC or DNS-verify
  via Cloudflare API. Bing has NO sandbox → ranks in weeks.
- GSC: add property (Google account) → service-account JSON →
  `GSC_SERVICE_ACCOUNT_KEY` on Vercel → add SA email as GSC user
  (the add-user widget resists automation — that one keystroke is manual).
- Microsoft publisher programs are all dead (pubCenter / Monetize Now /
  PubHub retired; Monetize = enterprise). Don't chase them.

## 5. Money

- AdSense: only after content matures (avg ≥800w, some real traffic,
  ~3-4 weeks age). Applying thin/new = rejection that flags the domain.
- Skimlinks + Brave = invisible, no quality cost, day-1 OK. Infolinks =
  NO (in-text ads tank UX + AdSense review).
- The lever is traffic × quality, compounding over months. No shortcut.

## 6. Honest law of this business

Quality + time beat volume + tricks. 12 good articles/day that rank beats
50 thin ones that don't. Verify live, never trust dashboards' marketing
copy. Get tokens, automate, don't click.
