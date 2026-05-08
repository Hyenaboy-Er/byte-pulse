// Push schema SQL to Turso. One-shot init script.
// Run: DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... tsx src/scripts/turso-init.ts <path-to-sql-file>
import { createClient } from '@libsql/client';
import { readFileSync } from 'fs';

(async () => {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.DATABASE_AUTH_TOKEN;
  if (!url || !authToken) {
    console.error('Missing DATABASE_URL or DATABASE_AUTH_TOKEN');
    process.exit(1);
  }
  const sqlPath = process.argv[2];
  if (!sqlPath) { console.error('Usage: tsx turso-init.ts <sql-file>'); process.exit(1); }

  const client = createClient({ url, authToken });
  const sql = readFileSync(sqlPath, 'utf8');

  // Strip all comment-only lines, then split on semicolons.
  const cleaned = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
  const statements = cleaned.split(/;\s*(?:\n|$)/).map((s) => s.trim()).filter((s) => s.length > 0);

  console.log(`Running ${statements.length} statements against ${url}…`);
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await client.execute(stmt);
      const head = stmt.split('\n')[0].slice(0, 70);
      console.log(`  [${i + 1}/${statements.length}] OK: ${head}`);
    } catch (err) {
      console.error(`  [${i + 1}/${statements.length}] FAIL: ${(err as Error).message}`);
      console.error(`    Statement: ${stmt.slice(0, 200)}`);
      process.exit(1);
    }
  }
  console.log('\n✓ Schema applied to Turso.');
  process.exit(0);
})();
