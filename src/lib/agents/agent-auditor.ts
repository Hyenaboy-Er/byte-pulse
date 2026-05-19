// Agent-Auditor — the meta-watchdog that audits whether every agent is
// actually DOING GOOD WORK, not merely "returned 200".
//
// This whole session's root failure was agents that reported success
// while producing garbage or nothing (translator truncating to 56%,
// IndexNow 422-ing on every ping, 7 agents idle for weeks). A liveness
// ping ("did the endpoint run?") would have stayed green through all of
// it. So this auditor checks, per agent, a CONCRETE OUTCOME metric from
// the real DB / live site — and is brutally explicit about which agents
// it could verify by outcome vs. only by liveness (it never paints a
// liveness-only check as proof of good work; that lie is the bug).
//
// Lean by design: DB queries + AgentLog reads + a couple of live
// fetches. No LLM, fires no heavy work — it AUDITS and REPORTS. Fits
// the Vercel 60s cap. Escalates to Telegram only ⚠️/❌.

import { prisma } from '../db';
import { tg } from '../telegram';
import { SITE } from '../site';

type Verdict = 'ok' | 'warn' | 'fail' | 'idle' | 'unknown';
type Row = { agent: string; verdict: Verdict; how: 'outcome' | 'liveness' | 'none'; evidence: string };

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const HOURS = (d: Date | null | undefined) =>
  d ? (Date.now() - new Date(d).getTime()) / 3_600_000 : Infinity;

async function liveText(path: string): Promise<string> {
  try {
    const r = await fetch(`${SITE.url}${path}`, { signal: AbortSignal.timeout(9000) });
    return r.ok ? await r.text() : '';
  } catch { return ''; }
}

export type AgentAuditReport = {
  fleetHealthPct: number;
  outcomeVerified: number;
  livenessOnly: number;
  rows: Row[];
  problems: string[];
  escalated: boolean;
};

export async function runAgentAuditor(): Promise<AgentAuditReport> {
  const rows: Row[] = [];

  // ── Last-run + last-status per agent from AgentLog (liveness) ───────
  const since = new Date(Date.now() - 72 * 3600_000);
  const logs = await prisma.agentLog.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { agent: true, status: true, createdAt: true, message: true },
  });
  const last = new Map<string, { status: string; at: Date; message: string | null }>();
  for (const l of logs) {
    if (!last.has(l.agent)) last.set(l.agent, { status: l.status, at: l.createdAt, message: l.message });
  }
  const liveness = (agent: string, staleH = 30): { v: Verdict; ev: string } => {
    const e = last.get(agent);
    if (!e) return { v: 'unknown', ev: 'kein AgentLog-Eintrag (72h) — Liveness unbekannt' };
    const h = HOURS(e.at);
    const bad = /error|fail|fatal/i.test(e.status);
    if (bad) return { v: 'fail', ev: `letzter Lauf ${h.toFixed(1)}h, Status="${e.status}"` };
    if (h > staleH) return { v: 'warn', ev: `zuletzt vor ${h.toFixed(0)}h (stale, erwartet <${staleH}h)` };
    return { v: 'ok', ev: `lief vor ${h.toFixed(1)}h, Status="${e.status}"` };
  };

  // ── OUTCOME checks (the real test: did it produce good work?) ──────

  // writer/orchestrator: articles actually published in last 24h
  const pub24 = await prisma.article.count({
    where: { status: 'published', publishedAt: { gte: new Date(Date.now() - 24 * 3600_000) } },
  });
  rows.push({
    agent: 'orchestrator/writer', how: 'outcome',
    verdict: pub24 >= 1 ? 'ok' : 'fail',
    evidence: `${pub24} Artikel veröffentlicht / 24h`,
  });

  // translator: sample newest 8 published — DE must exist & be >=70% of EN
  const recent = await prisma.article.findMany({
    where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 8,
    select: { id: true, content: true },
  });
  const tr = await prisma.translation.findMany({
    where: { lang: 'de', articleId: { in: recent.map((a) => a.id) } },
    select: { articleId: true, content: true },
  });
  const trMap = new Map(tr.map((t) => [t.articleId, wc(t.content)]));
  let trBad = 0, trMissing = 0;
  for (const a of recent) {
    const en = wc(a.content); const de = trMap.get(a.id);
    if (de === undefined) trMissing++;
    else if (en >= 200 && de / en < 0.7) trBad++;
  }
  rows.push({
    agent: 'translator', how: 'outcome',
    verdict: (trBad + trMissing) === 0 ? 'ok' : (trBad + trMissing) <= 2 ? 'warn' : 'fail',
    evidence: `Stichprobe 8 neu: ${trBad} abgeschnitten, ${trMissing} fehlend`,
  });

  // quality-upgrade: thin ratio over the recent corpus
  const corpus = await prisma.article.findMany({
    where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 400,
    select: { id: true, content: true },
  });
  const thin = corpus.filter((a) => wc(a.content) < 700).length;
  const thinPct = corpus.length ? thin / corpus.length : 0;
  rows.push({
    agent: 'quality-upgrade', how: 'outcome',
    verdict: thinPct < 0.15 ? 'ok' : thinPct < 0.35 ? 'warn' : 'fail',
    evidence: `${thin}/${corpus.length} dünn (${Math.round(thinPct * 100)}%) — Backlog, Trend muss fallen`,
  });

  // translation-repair: how many DE still broken across the same corpus
  const allTr = await prisma.translation.findMany({
    where: { lang: 'de', articleId: { in: corpus.map((a) => a.id) } },
    select: { articleId: true, content: true },
  });
  const deMap = new Map(allTr.map((t) => [t.articleId, wc(t.content)]));
  let broken = 0;
  for (const a of corpus) {
    const en = wc(a.content); const de = deMap.get(a.id);
    if (de !== undefined && en >= 200 && de / en < 0.7) broken++;
  }
  rows.push({
    agent: 'translation-repair', how: 'outcome',
    verdict: broken === 0 ? 'ok' : broken < 80 ? 'warn' : 'fail',
    evidence: `${broken} DE noch kaputt im Korpus (muss über Läufe fallen)`,
  });

  // internal-linker: do the newest 20 actually contain internal links?
  const link20 = await prisma.article.findMany({
    where: { status: 'published' }, orderBy: { publishedAt: 'desc' }, take: 20,
    select: { content: true },
  });
  const withLinks = link20.filter((a) => /\]\(\/(de\/)?article\//.test(a.content)).length;
  rows.push({
    agent: 'internal-linker', how: 'outcome',
    verdict: withLinks >= 8 ? 'ok' : withLinks >= 3 ? 'warn' : 'fail',
    evidence: `${withLinks}/20 neue Artikel haben interne Links`,
  });

  // comparison-writer: founder-byline longform produced in last 7d?
  const cmp7 = await prisma.article.count({
    where: {
      status: 'published', sourceName: `${SITE.name} Original`,
      publishedAt: { gte: new Date(Date.now() - 7 * 24 * 3600_000) },
    },
  });
  rows.push({
    agent: 'comparison-writer', how: 'outcome',
    verdict: cmp7 >= 1 ? 'ok' : 'warn',
    evidence: `${cmp7} Vergleichs-/Kauf-Artikel (${SITE.name} Original) / 7d`,
  });

  // bing-submit: did it actually submit (200) recently, not 422/skip-only?
  {
    const e = last.get('bing-submit');
    const okMsg = e && /status=2\d\d/.test(e.message || '') && /urls=[1-9]/.test(e.message || '');
    rows.push({
      agent: 'bing-submit', how: 'outcome',
      verdict: !e ? 'unknown' : okMsg ? 'ok' : HOURS(e.at) < 30 ? 'warn' : 'fail',
      evidence: e ? `letzte Meldung: "${(e.message || '').slice(0, 80)}"` : 'kein Log',
    });
  }

  // ── LIVENESS-only agents (honestly labelled — NOT outcome-proven) ──
  for (const a of [
    'sentinel', 'gsc-monitor', 'seo-auditor', 'quality-auditor', 'stats-reporter',
    'email-watcher', 'director', 'content-refresher', 'affiliate-optimizer',
    'title-booster', 'trend-reactor', 'social-retry', 'community-replies', 'adsense-robo',
  ]) {
    const { v, ev } = liveness(a);
    rows.push({ agent: a, verdict: v, how: 'liveness', evidence: ev });
  }

  // ── Roll-up ────────────────────────────────────────────────────────
  const outcomeVerified = rows.filter((r) => r.how === 'outcome').length;
  const livenessOnly = rows.filter((r) => r.how === 'liveness').length;
  const scored = rows.filter((r) => r.verdict !== 'unknown' && r.verdict !== 'idle');
  const good = scored.filter((r) => r.verdict === 'ok').length;
  const fleetHealthPct = scored.length ? Math.round((good / scored.length) * 100) : 0;
  const problems = rows
    .filter((r) => r.verdict === 'fail' || r.verdict === 'warn')
    .map((r) => `${r.agent}: ${r.evidence}`);

  // Escalate only when something is actually wrong.
  const escalate = rows.some((r) => r.verdict === 'fail') || problems.length >= 4;
  if (escalate) {
    const lines = [
      `🕵️ Agent-Auditor — Fleet ${fleetHealthPct}% (outcome-geprüft: ${outcomeVerified}, nur-Liveness: ${livenessOnly})`,
      ...rows
        .filter((r) => r.verdict === 'fail' || r.verdict === 'warn')
        .map((r) => `${r.verdict === 'fail' ? '❌' : '⚠️'} ${r.agent} — ${r.evidence}`),
    ];
    await tg(lines.join('\n')).catch(() => null);
  }

  return { fleetHealthPct, outcomeVerified, livenessOnly, rows, problems, escalated: escalate };
}
