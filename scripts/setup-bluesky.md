# Bluesky Auto-Poster Setup

Code is already in `src/lib/social.ts` (function `postToBluesky`). Just needs:

## Step 1 — Account creation
URL: https://bsky.app/
- Click "Sign up"
- Email: serhaterlev@gmail.com
- Username: claim `bytepulse.bsky.social` (or `bytepulsenet.bsky.social` if taken)
- Password: (set your own)
- Confirm email
- Profile: display name "Byte-Pulse", avatar from /icon.svg, bio
  "Tech news that matters — AI, gaming, hardware, mobile. Bilingual EN/DE,
  updated every 15 min. https://www.byte-pulse.net"

## Step 2 — App-specific password (NOT account password)
1. Logged in, go to https://bsky.app/settings/app-passwords
2. Click "Add App Password"
3. Name: `Byte-Pulse Auto-Poster`
4. Copy the generated 19-char password (looks like `abcd-efgh-ijkl-mnop`)

## Step 3 — Set Vercel env vars
- `BLUESKY_HANDLE` = `bytepulse.bsky.social` (your full handle, no @)
- `BLUESKY_APP_PASSWORD` = the 19-char app password (NOT your account login password)

## Step 4 — Test
After Vercel redeploys, the next Writer-cron publish will fire a Bluesky post.
Verify at https://bsky.app/profile/bytepulse.bsky.social
