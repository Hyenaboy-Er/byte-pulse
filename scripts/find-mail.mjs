// Search ACROSS ALL Gmail folders (Spam, All Mail, Promotions) — not just
// INBOX. Owner-authorised. Finds mail that Gmail filtered out of INBOX.
import { readFileSync } from 'node:fs';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

const sec = readFileSync(new URL('../.secrets-local.txt', import.meta.url), 'utf8');
const get = (k) => (sec.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim();
const client = new ImapFlow({
  host: 'imap.gmail.com', port: 993, secure: true,
  auth: { user: get('GMAIL_IMAP_USER'), pass: get('GMAIL_IMAP_PASSWORD') },
  logger: false,
});
const term = (process.argv[2] || 'brave').toLowerCase();

await client.connect();
const boxes = [];
for await (const mb of await client.list()) boxes.push(mb.path);
console.log('Folders:', boxes.join(' | '), '\n');

for (const path of boxes) {
  let lock;
  try {
    lock = await client.getMailboxLock(path);
    // search by from OR subject OR body text containing the term
    let seqs = [];
    try { seqs = await client.search({ or: [{ from: term }, { subject: term }, { body: term }] }); }
    catch { seqs = []; }
    if (seqs && seqs.length) {
      console.log(`### ${path} — ${seqs.length} hit(s)`);
      for (const seq of seqs.slice(-4)) {
        const msg = await client.fetchOne(seq, { source: true });
        const p = await simpleParser(msg.source);
        console.log(`  ${p.date?.toISOString?.()||'?'} | ${p.from?.text||''}`);
        console.log(`  SUBJ: ${p.subject||''}`);
        const body = (p.text||'').replace(/\s+/g,' ').trim();
        // surface any verify/login/confirm link
        const link = (body.match(/https?:\/\/[^\s)>\]]+/g)||[]).find(u=>/brave|verify|login|confirm|token|magic/i.test(u));
        console.log(`  TEXT: ${body.slice(0,260)}`);
        if (link) console.log(`  LINK: ${link}`);
        console.log('');
      }
    }
  } catch (e) { /* skip unreadable */ }
  finally { if (lock) lock.release(); }
}
await client.logout();
