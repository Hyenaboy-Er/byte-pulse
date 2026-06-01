// LinkedIn-OAuth-Helper — führt den einmaligen 3-Legged-OAuth-Flow durch,
// um Access Token + Author URN zu bekommen, die der linkedin-poster braucht.
//
// VORHER manuell auf https://www.linkedin.com/developers/apps:
//   1. "Create app" → Company Page = deine eigene oder eine Test-Page wählen
//   2. Tab "Auth" → "Authorized redirect URLs for your app" →
//      http://localhost:3001/callback   eintragen
//   3. Tab "Products" → "Share on LinkedIn"  und  "Sign In with LinkedIn using OpenID Connect"
//      → "Request access" klicken (beide werden i.d.R. sofort freigeschaltet)
//   4. Tab "Auth" → Client ID + Client Secret in dein lokales .env eintragen als:
//        LINKEDIN_CLIENT_ID=...
//        LINKEDIN_CLIENT_SECRET=...
//
// DANN:    node --env-file=.env scripts/linkedin-oauth-setup.mjs
//          Browser öffnet sich, du logst dich ein und autorisierst,
//          das Skript holt Access Token + Author URN und gibt sie aus.
//          Trag die beiden als GitHub Secrets ein:
//            LINKEDIN_ACCESS_TOKEN=...
//            LINKEDIN_AUTHOR_URN=urn:li:person:...
//
// Token läuft 60 Tage. Renewal-Reminder kommt automatisch über Telegram.

import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const CLIENT_ID     = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT      = 'http://localhost:3001/callback';
const SCOPES        = 'openid profile w_member_social';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET müssen in .env stehen.');
  console.error('Siehe Kommentar am Skript-Anfang für Setup-Schritte.');
  process.exit(1);
}

const state = randomBytes(16).toString('hex');
const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT);
authUrl.searchParams.set('scope', SCOPES);
authUrl.searchParams.set('state', state);

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost:3001');
  if (u.pathname !== '/callback') {
    res.writeHead(404).end('Not found');
    return;
  }
  const code = u.searchParams.get('code');
  const returnedState = u.searchParams.get('state');
  if (returnedState !== state) {
    res.writeHead(400).end('State mismatch — try again.');
    process.exit(1);
  }
  if (!code) {
    res.writeHead(400).end('No code in callback.');
    process.exit(1);
  }

  // Tausche code gegen access_token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    res.writeHead(400).end('Token exchange failed: ' + JSON.stringify(tokenData));
    console.error('Token exchange failed:', tokenData);
    process.exit(1);
  }

  // Hole Person URN aus userinfo
  const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const user = await userRes.json();
  const authorUrn = `urn:li:person:${user.sub}`;

  const html = `<!doctype html><html><body style="font-family:system-ui;padding:40px;max-width:680px;margin:auto">
<h1>✅ Connected to LinkedIn</h1>
<p>Trag diese beiden Werte als GitHub Secrets ein:</p>
<pre style="background:#0d1117;color:#c9d1d9;padding:18px;border-radius:8px;overflow:auto">
LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}
LINKEDIN_AUTHOR_URN=${authorUrn}
</pre>
<p>Token läuft in <b>${Math.round((tokenData.expires_in || 0)/86400)} Tagen</b> ab. Du kannst dieses Fenster jetzt schließen.</p>
</body></html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);

  console.log('');
  console.log('=== Trag diese GitHub Secrets ein ===');
  console.log(`LINKEDIN_ACCESS_TOKEN=${tokenData.access_token}`);
  console.log(`LINKEDIN_AUTHOR_URN=${authorUrn}`);
  console.log(`(Token läuft in ${Math.round((tokenData.expires_in || 0)/86400)} Tagen ab.)`);
  setTimeout(() => process.exit(0), 1000);
});

server.listen(3001, () => {
  console.log(`Listening on ${REDIRECT}`);
  console.log(`Öffne im Browser:\n  ${authUrl.toString()}\n`);
  // Versuche Browser automatisch zu öffnen
  const opener = process.platform === 'win32' ? ['cmd', '/c', 'start', authUrl.toString()]
    : process.platform === 'darwin' ? ['open', authUrl.toString()]
    : ['xdg-open', authUrl.toString()];
  spawn(opener[0], opener.slice(1), { stdio: 'ignore', detached: true }).unref();
});
