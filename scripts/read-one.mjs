// Fetch ONE specific message in full (verbatim proof). Owner-authorised.
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
const term = process.argv[2] || 'skimlinks';

await client.connect();
const lock = await client.getMailboxLock('INBOX');
try {
  const seqs = await client.search({ or: [{ from: term }, { subject: term }] });
  if (!seqs || !seqs.length) { console.log('NO MATCH for', term); }
  for (const seq of seqs.slice(-3)) {
    const msg = await client.fetchOne(seq, { source: true, envelope: true });
    const p = await simpleParser(msg.source);
    console.log('================ MESSAGE #' + seq + ' ================');
    console.log('From   :', p.from?.text || '');
    console.log('To     :', p.to?.text || '');
    console.log('Date   :', p.date?.toISOString?.() || '');
    console.log('Subject:', p.subject || '');
    console.log('--- FULL TEXT (verbatim) ---');
    console.log((p.text || '(no text part)').trim());
    console.log('================ END ================\n');
  }
} finally {
  lock.release();
  await client.logout();
}
