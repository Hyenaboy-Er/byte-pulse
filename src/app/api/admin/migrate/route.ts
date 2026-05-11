// One-shot migration runner. Reads a SQL file from prisma/migrations and applies
// every statement against the live Turso DB. Idempotent (uses CREATE TABLE IF
// NOT EXISTS). Auth-gated by CRON_SECRET.
//
//   GET /api/admin/migrate?file=email-seen&token=$CRON_SECRET

import { NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const ALLOWED_FILES = new Set(['email-seen', 'article-original-title']);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const auth = req.headers.get('authorization');
  const tokenFromQuery = url.searchParams.get('token');
  const expected = process.env.CRON_SECRET;
  if (!expected || (auth !== `Bearer ${expected}` && tokenFromQuery !== expected)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const file = url.searchParams.get('file') ?? '';
  if (!ALLOWED_FILES.has(file)) {
    return NextResponse.json({ ok: false, error: 'unknown migration file' }, { status: 400 });
  }

  const dbUrl = process.env.DATABASE_URL;
  const dbToken = process.env.DATABASE_AUTH_TOKEN;
  if (!dbUrl || !dbToken) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL or DATABASE_AUTH_TOKEN missing' }, { status: 500 });
  }

  let sql: string;
  try {
    sql = readFileSync(join(process.cwd(), 'prisma', 'migrations', `${file}.sql`), 'utf8');
  } catch (err) {
    return NextResponse.json({ ok: false, error: `read failed: ${(err as Error).message}` }, { status: 500 });
  }

  const statements = sql
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = createClient({ url: dbUrl, authToken: dbToken });
  const results: { stmt: string; ok: boolean; error?: string }[] = [];
  for (const stmt of statements) {
    try {
      await client.execute(stmt);
      results.push({ stmt: stmt.split('\n')[0].slice(0, 80), ok: true });
    } catch (err) {
      results.push({ stmt: stmt.split('\n')[0].slice(0, 80), ok: false, error: (err as Error).message });
    }
  }
  const failed = results.filter((r) => !r.ok);
  return NextResponse.json({ ok: failed.length === 0, applied: results.length, failed: failed.length, results });
}
