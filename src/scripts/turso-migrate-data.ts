// Copies all data from local SQLite (./dev.db) to a Turso libSQL database.
// Usage: TARGET_URL=libsql://... TARGET_TOKEN=... tsx turso-migrate-data.ts
import { createClient } from '@libsql/client';
import Database from 'better-sqlite3';

(async () => {
  const targetUrl = process.env.TARGET_URL;
  const targetToken = process.env.TARGET_TOKEN;
  if (!targetUrl || !targetToken) {
    console.error('Missing TARGET_URL or TARGET_TOKEN');
    process.exit(1);
  }

  const turso = createClient({ url: targetUrl, authToken: targetToken });

  // We use direct SQLite read to avoid Prisma's libsql adapter restriction at this script level.
  // The local dev.db is plain SQLite.
  const dbPath = process.env.SOURCE_DB ?? 'dev.db';
  const sqlite = new Database(dbPath, { readonly: true });

  const tables = ['Article', 'SeenSource', 'NewsletterSubscriber', 'AgentLog', 'Translation'];
  for (const table of tables) {
    const rows = sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, any>[];
    console.log(`${table}: ${rows.length} rows`);
    if (!rows.length) continue;

    const cols = Object.keys(rows[0]);
    const placeholders = cols.map(() => '?').join(',');
    const colList = cols.map((c) => `"${c}"`).join(',');
    const stmt = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})`;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const values = cols.map((c) => row[c] === undefined ? null : row[c]);
      try {
        await turso.execute({ sql: stmt, args: values });
      } catch (err) {
        console.warn(`  row ${i + 1} failed: ${(err as Error).message}`);
      }
    }
    console.log(`  ✓ ${rows.length} rows copied to ${table}`);
  }
  console.log('\nDone.');
  process.exit(0);
})();
