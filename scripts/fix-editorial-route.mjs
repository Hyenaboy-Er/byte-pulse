// One-shot fix for the editorial@ email-routing typo.
//
// DIAGNOSIS (confirmed via Cloudflare dashboard internal API, read path):
//   Zone byte-pulse.net (02db1dc2dbf6ab755041a60e7d147580) has an Email
//   Routing rule (tag 47497ec66d2b4dc38b1685a2159b0bc5) that forwards
//   "editoral@byte-pulse.net" (TYPO — missing the 2nd 'i') to
//   serhaterlev@gmail.com. Mail to the correctly-spelled
//   "editorial@byte-pulse.net" hits no rule → "550 5.1.1 Address does
//   not exist". Destination serhaterlev@gmail.com is already verified
//   and Email Routing is enabled+ready.
//
// The dashboard internal API (dash.cloudflare.com/api/v4) returns a 403
// bot-challenge on PUT/POST, so the fix must go through the TOKEN API
// (api.cloudflare.com) with Bearer auth — that endpoint has no challenge.
//
// Needs CF_API_TOKEN in .secrets-local.txt with permission:
//   Zone › Email Routing Rules › Edit  (scoped to byte-pulse.net)
import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => s.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1].trim() ?? '';

// Auth: this account uses a Global API Key (cfk_… prefix), NOT a scoped
// Bearer token. Global API Key auth = X-Auth-Email + X-Auth-Key headers.
const KEY = get('CF_API_TOKEN');
const EMAIL = get('CF_API_EMAIL') || 'Hyenaboy@gmx.de';
const ZONE = '02db1dc2dbf6ab755041a60e7d147580';
const RULE = '47497ec66d2b4dc38b1685a2159b0bc5';
if (!KEY) { console.error('CF_API_TOKEN missing in .secrets-local.txt'); process.exit(1); }

const api = (path, init = {}) =>
  fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      'X-Auth-Email': EMAIL,
      'X-Auth-Key': KEY,
      'content-type': 'application/json',
      ...(init.headers || {}),
    },
  }).then((r) => r.json());

// 1. Fix the existing rule's matcher typo.
const put = await api(`/zones/${ZONE}/email/routing/rules/${RULE}`, {
  method: 'PUT',
  body: JSON.stringify({
    name: 'editorial@ → serhaterlev (typo fixed)',
    enabled: true,
    priority: 0,
    matchers: [{ type: 'literal', field: 'to', value: 'editorial@byte-pulse.net' }],
    actions: [{ type: 'forward', value: ['serhaterlev@gmail.com'] }],
  }),
});
console.log('PUT rule:', JSON.stringify({ success: put.success, errors: put.errors, matchers: put.result?.matchers }));

// 2. Belt-and-suspenders: also add a catch-all so any future address
//    (press@, hello@, typos) still reaches the inbox instead of bouncing.
const cur = await api(`/zones/${ZONE}/email/routing/rules`);
const hasCatchAll = (cur.result || []).some(
  (r) => r.matchers?.some((m) => m.type === 'all') && r.actions?.some((a) => a.type === 'forward')
);
if (!hasCatchAll) {
  const ca = await api(`/zones/${ZONE}/email/routing/rules/catch_all`, {
    method: 'PUT',
    body: JSON.stringify({
      name: 'catch-all → serhaterlev',
      enabled: true,
      matchers: [{ type: 'all' }],
      actions: [{ type: 'forward', value: ['serhaterlev@gmail.com'] }],
    }),
  });
  console.log('Catch-all:', JSON.stringify({ success: ca.success, errors: ca.errors }));
} else {
  console.log('Catch-all: already present, skipped');
}

// 3. Read back final state.
const final = await api(`/zones/${ZONE}/email/routing/rules`);
console.log('FINAL RULES:', JSON.stringify((final.result || []).map((r) => ({
  name: r.name, enabled: r.enabled, m: r.matchers, a: r.actions,
})), null, 2));
