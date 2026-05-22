// One-off inbox reader — owner-authorised. Connects to the user's own
// Gmail via the IMAP app-password already configured, pulls the most
// recent messages (sender, date, subject, text snippet) so we can triage
// what actually matters (Skimlinks, AdSense, Bing/Google, payments…).
import { readFileSync } from 'node:fs';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const sec = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => (sec.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const user = get('GMAIL_IMAP_USER');
const pass = get('GMAIL_IMAP_PASSWORD');

const N = Number(process.argv[2] || 35);
const client = new ImapFlow({
  host: 'imap.gmail.com', port: 993, secure: true,
  auth: { user, pass }, logger: false,
});

await client.connect();
const lock = await client.getMailboxLock('INBOX');
try {
  const status = await client.status('INBOX', { messages: true });
  const total = status.messages || 0;
  const start = Math.max(1, total - N + 1);
  console.log(`INBOX total=${total} — showing ${start}:${total}\n`);
  for await (const msg of client.fetch(`${start}:${total}`, { envelope: true, source: true })) {
    const env = msg.envelope || {};
    const from = (env.from || []).map((a) => `${a.name || ''} <${a.address}>`).join(', ');
    const date = env.date ? new Date(env.date).toISOString().slice(0, 16).replace('T', ' ') : '?';
    let snippet = '';
    try {
      const parsed = await simpleParser(msg.source);
      snippet = (parsed.text || parsed.subject || '').replace(/\s+/g, ' ').trim().slice(0, 320);
    } catch { snippet = '(body parse failed)'; }
    console.log(`#${msg.seq} | ${date} | ${from}`);
    console.log(`  SUBJ: ${env.subject || '(no subject)'}`);
    console.log(`  TEXT: ${snippet}`);
    console.log('');
  }
} finally {
  lock.release();
  await client.logout();
}
