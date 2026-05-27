// READ-ONLY production DB probe. No writes. No prints of credentials.
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url?.startsWith('libsql:')) {
  console.error('Refusing to run: DATABASE_URL is not a libsql:// URL.');
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  const cols = await client.execute("PRAGMA table_info(Article)");
  const colNames = cols.rows.map(r => r.name);
  console.log('Article columns:', colNames.join(', '));
  console.log('Has originalTitle?', colNames.includes('originalTitle'));

  const minimal = await client.execute('SELECT id, slug, title FROM Article LIMIT 1');
  console.log('Minimal SELECT works, sample:', minimal.rows[0]);

  // Try the same select the news-sitemap does (with originalTitle if schema sees it)
  try {
    const full = await client.execute('SELECT id, originalTitle FROM Article LIMIT 1');
    console.log('SELECT originalTitle works → schema HAS the column');
  } catch (e) {
    console.log('SELECT originalTitle FAILS →', e.message);
  }

  const count = await client.execute("SELECT COUNT(*) as c FROM Article WHERE status='published'");
  console.log('Total published articles in PROD:', count.rows[0].c);
} catch (e) {
  console.error('Query error:', e.message);
} finally {
  client.close();
}
