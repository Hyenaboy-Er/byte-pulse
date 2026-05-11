// Quality-Auditor agent — periodically inspects recently-published articles
// for issues that the Reviewer might have missed and that hurt the site over
// time (broken images, off-category content, weak headlines, dead source
// URLs, ghost-articles with 0 views after a day). Combines cheap heuristics
// (regex / HTTP checks) with one Gemini call per flagged article to get an
// intelligent judgement.
//
// Alerts the operator via Telegram with a per-issue summary. Cooldown via
// agentLog so we don't re-alert on already-known issues every run.

import { prisma } from '../db';
import { tg } from '../telegram';
import { llmChat, extractJson } from '../llm';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.byte-pulse.net';

type Issue = {
  slug: string;
  kind: 'broken-image' | 'dead-source' | 'weak-headline' | 'off-category' | 'thin-content' | 'no-traction';
  detail: string;
  severity: 'low' | 'medium' | 'high';
};

const COOLDOWN_MS = 6 * 3600 * 1000; // don't re-alert on the same (slug, kind) within 6h

async function recentlyAlerted(slug: string, kind: Issue['kind']): Promise<boolean> {
  const r = await prisma.agentLog.findFirst({
    where: {
      agent: 'quality-auditor',
      action: 'flag',
      message: { contains: `${slug}|${kind}` },
      createdAt: { gte: new Date(Date.now() - COOLDOWN_MS) },
    },
  });
  return !!r;
}

async function record(issue: Issue) {
  await prisma.agentLog.create({
    data: {
      agent: 'quality-auditor',
      action: 'flag',
      status: issue.severity === 'high' ? 'error' : 'warn',
      message: `${issue.slug}|${issue.kind}`,
      meta: JSON.stringify({ detail: issue.detail, severity: issue.severity }),
    },
  });
}

// Cheap heuristics — these run without an LLM call.
async function heuristicChecks(article: {
  slug: string;
  title: string;
  category: string;
  content: string;
  imageUrl: string | null;
  sourceUrl: string;
  views: number;
  publishedAt: Date | null;
}): Promise<Issue[]> {
  const issues: Issue[] = [];

  // 1. Thin content
  const wordCount = article.content.trim().split(/\s+/).length;
  if (wordCount < 400) {
    issues.push({
      slug: article.slug,
      kind: 'thin-content',
      detail: `Only ${wordCount} words (target 700-1000). Likely truncated draft.`,
      severity: 'high',
    });
  }

  // 2. Image URL broken
  if (article.imageUrl) {
    try {
      const res = await fetch(article.imageUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
      if (!res.ok && res.status !== 405) {
        issues.push({
          slug: article.slug,
          kind: 'broken-image',
          detail: `imageUrl returned HTTP ${res.status}: ${article.imageUrl.slice(0, 100)}`,
          severity: 'medium',
        });
      }
    } catch (err) {
      issues.push({
        slug: article.slug,
        kind: 'broken-image',
        detail: `imageUrl fetch failed: ${(err as Error).message.slice(0, 80)}`,
        severity: 'medium',
      });
    }
  }

  // 3. Source URL dead (only check 25% of the time to spread load — sources can be slow)
  if (article.sourceUrl && Math.random() < 0.25) {
    try {
      const res = await fetch(article.sourceUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000), redirect: 'follow' });
      if (res.status >= 400 && res.status !== 405) {
        issues.push({
          slug: article.slug,
          kind: 'dead-source',
          detail: `sourceUrl ${res.status} (article will look unsourced)`,
          severity: 'low',
        });
      }
    } catch {
      // Source-host network errors are very noisy, don't flag
    }
  }

  // 4. No traction after 24h+
  const ageMs = article.publishedAt ? Date.now() - article.publishedAt.getTime() : 0;
  if (ageMs > 24 * 3600 * 1000 && article.views === 0) {
    issues.push({
      slug: article.slug,
      kind: 'no-traction',
      detail: `Published ${Math.round(ageMs / 3600_000)}h ago, 0 views. Check headline / category placement.`,
      severity: 'low',
    });
  }

  return issues;
}

// LLM-based smart check: cheap Gemini Flash-Lite call that reads the article
// and flags weak headlines / off-category content. Only runs on articles that
// passed heuristic checks (avoids paying for LLM judgement on obviously broken
// drafts).
async function llmCheck(article: {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  content: string;
}): Promise<Issue[]> {
  const SYSTEM = `You are a tough tech-news editor at Byte-Pulse. Audit articles AFTER publish.
You check two things, both objectively:
1) Is the headline a strong "click magnet" by tech-news standards? Punchy, specific, intriguing without being misleading.
2) Does the article actually fit its assigned category, or is it mis-categorized?

Reply with JSON:
{
  "headline_strength": <0-100>,
  "headline_problem": "<one short sentence if score < 60, else empty>",
  "category_fits": <true|false>,
  "category_problem": "<short reason if category_fits is false, else empty>",
  "better_category_slug": "<one of: ai|gaming|hardware|mobile|software|security|crypto|science|ev|web — only if category_fits is false>"
}`;

  const user = `Headline: ${article.title}
Excerpt: ${article.excerpt}
Assigned category: ${article.category}

First 600 chars of body:
${article.content.slice(0, 600)}`;

  try {
    const text = await llmChat({
      role: 'reviewer',
      system: SYSTEM,
      user,
      maxTokens: 600,
      json: true,
      temperature: 0.2,
    });
    const parsed = extractJson<{
      headline_strength?: number;
      headline_problem?: string;
      category_fits?: boolean;
      category_problem?: string;
      better_category_slug?: string;
    }>(text);
    if (!parsed) return [];
    const out: Issue[] = [];
    if (typeof parsed.headline_strength === 'number' && parsed.headline_strength < 55 && parsed.headline_problem) {
      out.push({
        slug: article.slug,
        kind: 'weak-headline',
        detail: `${parsed.headline_strength}/100 — ${parsed.headline_problem}`,
        severity: 'low',
      });
    }
    if (parsed.category_fits === false && parsed.category_problem) {
      out.push({
        slug: article.slug,
        kind: 'off-category',
        detail: `Assigned "${article.category}" but ${parsed.category_problem}${parsed.better_category_slug ? ` (suggest "${parsed.better_category_slug}")` : ''}`,
        severity: 'medium',
      });
    }
    return out;
  } catch {
    return [];
  }
}

export type AuditReport = {
  scanned: number;
  flagged: number;
  byKind: Record<Issue['kind'], number>;
  alertsSent: number;
};

export async function runQualityAuditor(opts?: { sinceHours?: number; limit?: number }): Promise<AuditReport> {
  const sinceHours = Math.max(1, Math.min(168, opts?.sinceHours ?? 12));
  const limit = Math.max(1, Math.min(50, opts?.limit ?? 12));
  const since = new Date(Date.now() - sinceHours * 3600 * 1000);

  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: since } },
    orderBy: { publishedAt: 'desc' },
    take: limit,
    select: {
      slug: true, title: true, excerpt: true, category: true, content: true,
      imageUrl: true, sourceUrl: true, views: true, publishedAt: true,
    },
  });

  const allIssues: Issue[] = [];
  for (const a of articles) {
    const heuristic = await heuristicChecks(a);
    allIssues.push(...heuristic);
    // Only LLM-check articles that weren't already flagged as broken
    if (!heuristic.some((i) => i.severity === 'high')) {
      const llm = await llmCheck(a);
      allIssues.push(...llm);
    }
  }

  // Aggregate + dedup against the cooldown
  const byKind: Record<Issue['kind'], number> = {
    'broken-image': 0, 'dead-source': 0, 'weak-headline': 0,
    'off-category': 0, 'thin-content': 0, 'no-traction': 0,
  };
  const fresh: Issue[] = [];
  for (const issue of allIssues) {
    byKind[issue.kind]++;
    if (await recentlyAlerted(issue.slug, issue.kind)) continue;
    fresh.push(issue);
    await record(issue);
  }

  // Telegram — batch the alert so we don't spam
  let alertsSent = 0;
  if (fresh.length) {
    // Group by severity
    const high = fresh.filter((i) => i.severity === 'high');
    const med = fresh.filter((i) => i.severity === 'medium');
    const low = fresh.filter((i) => i.severity === 'low');

    const lines: string[] = [];
    lines.push(`🔎 Quality-Audit · ${fresh.length} neue Issues`);
    lines.push('');
    if (high.length) {
      lines.push(`🔴 HIGH (${high.length}):`);
      for (const i of high.slice(0, 8)) lines.push(`  · ${i.kind} → ${i.slug}\n    ${i.detail}`);
      lines.push('');
    }
    if (med.length) {
      lines.push(`🟡 MEDIUM (${med.length}):`);
      for (const i of med.slice(0, 8)) lines.push(`  · ${i.kind} → ${i.slug}\n    ${i.detail}`);
      lines.push('');
    }
    if (low.length) {
      lines.push(`🟢 LOW (${low.length}):`);
      for (const i of low.slice(0, 6)) lines.push(`  · ${i.kind} → ${i.slug}`);
    }
    await tg(lines.join('\n'));
    alertsSent = fresh.length;
  }

  await prisma.agentLog.create({
    data: {
      agent: 'quality-auditor',
      action: 'run',
      status: 'success',
      message: `scanned=${articles.length} flagged=${allIssues.length} fresh=${fresh.length}`,
      meta: JSON.stringify(byKind),
    },
  });

  return {
    scanned: articles.length,
    flagged: allIssues.length,
    byKind,
    alertsSent,
  };
}

void SITE_URL;
