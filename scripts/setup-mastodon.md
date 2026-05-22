# Mastodon Auto-Poster Setup

Code is already in `src/lib/social.ts` (function `postToMastodon`). Just needs:

## Step 1 — Account creation
URL: https://mastodon.social/auth/sign_up
- Username: `BytePulseNet`
- Email: serhaterlev@gmail.com
- Password: (set your own)
- Confirm email
- Profile: display name "Byte-Pulse", avatar from /icon.svg, bio
  "Tech news that matters — AI, gaming, hardware, mobile. Bilingual EN/DE,
  updated every 15 min. https://www.byte-pulse.net"

## Step 2 — App access token
1. Logged in, go to https://mastodon.social/settings/applications
2. Click "New application"
3. Application name: `Byte-Pulse Auto-Poster`
4. Application website: `https://www.byte-pulse.net`
5. Scopes — leave defaults (read, write, follow are sufficient; the only
   one needed is `write:statuses`)
6. Submit
7. Click into the just-created app → scroll to "Your access token" →
   copy the 64-char string (looks like `aB3cD...`)

## Step 3 — Set Vercel env vars
- `MASTODON_INSTANCE` = `mastodon.social`
- `MASTODON_ACCESS_TOKEN` = the 64-char token from step 2

## Step 4 — Test
After Vercel redeploys, the next Writer-cron publish will fire a toot.
Verify at https://mastodon.social/@BytePulseNet (or whatever username chosen).
