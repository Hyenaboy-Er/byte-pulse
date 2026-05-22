// OAuth1-signed read of our X timeline. The Bearer token isn't behaving on
// the new X API, but our OAuth1 user-context creds (the same that post tweets)
// can also read.
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';

const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

const consumerKey = get('X_API_KEY');
const consumerSecret = get('X_API_SECRET');
const accessToken = get('X_ACCESS_TOKEN');
const accessTokenSecret = get('X_ACCESS_TOKEN_SECRET');

function percent(s) { return encodeURIComponent(s).replace(/[!*'()]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase()); }

async function oauth1Get(url) {
  const u = new URL(url);
  const params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };
  for (const [k, v] of u.searchParams) params[k] = v;
  const baseString = 'GET&' + percent(`${u.origin}${u.pathname}`) + '&' + percent(
    Object.keys(params).sort().map(k => `${percent(k)}=${percent(params[k])}`).join('&')
  );
  const signingKey = `${percent(consumerSecret)}&${percent(accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  const oauthHeader = 'OAuth ' + Object.keys(params).filter(k => k.startsWith('oauth_')).concat(['oauth_signature']).map(k => `${percent(k)}="${percent(k === 'oauth_signature' ? signature : params[k])}"`).join(', ');
  return fetch(url, { headers: { Authorization: oauthHeader } });
}

// 1. Find own user id
const meRes = await oauth1Get('https://api.x.com/2/users/me');
const me = await meRes.json();
console.log('me:', JSON.stringify(me));
const id = me?.data?.id;
const username = me?.data?.username;
if (!id) process.exit(1);

// 2. Get timeline
const tlRes = await oauth1Get(`https://api.x.com/2/users/${id}/tweets?max_results=10`);
const tl = await tlRes.json();
console.log(`\n@${username} last tweets:`);
for (const t of tl.data ?? []) {
  console.log(`  - ${t.text?.slice(0, 100)}`);
}
console.log(`\nTotal returned: ${tl.data?.length ?? 0}`);
if (tl.meta) console.log('meta:', JSON.stringify(tl.meta));
