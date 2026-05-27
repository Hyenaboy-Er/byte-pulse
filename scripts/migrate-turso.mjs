// One-off migration runner for Turso (libsql) that survives the Prisma-CLI
// libsql:// limitation. Idempotent: only adds missing additive columns.
// Run via build step (Vercel has DATABASE_URL + DATABASE_AUTH_TOKEN env vars).
import { createClient } from '@libsql/client';

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;

if (!url) {
  console.log('[migrate] DATABASE_URL not set — skipping migration');
  process.exit(0);
}
if (!url.startsWith('libsql:')) {
  console.log('[migrate] DATABASE_URL is not libsql — skipping (local SQLite handled by Prisma)');
  process.exit(0);
}

const client = createClient({ url, authToken });

// Each migration: { table, column, type, notes }
// Only additive, nullable changes go here. Destructive changes need
// review and a different code path.
const migrations = [
  { table: 'Article', column: 'originalTitle', type: 'TEXT' },
];

try {
  for (const m of migrations) {
    const cols = await client.execute(`PRAGMA table_info("${m.table}")`);
    const names = cols.rows.map((r) => r.name);
    if (names.includes(m.column)) {
      console.log(`[migrate] ${m.table}.${m.column} already exists — skip`);
    } else {
      const sql = `ALTER TABLE "${m.table}" ADD COLUMN "${m.column}" ${m.type}`;
      await client.execute(sql);
      console.log(`[migrate] OK: ${sql}`);
    }
  }
  console.log('[migrate] done');
} catch (e) {
  console.error('[migrate] FATAL:', e.message);
  process.exit(1);
} finally {
  client.close();
}
