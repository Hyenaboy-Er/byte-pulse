// Monitor-Agent: läuft regelmässig (z.B. täglich), auditiert die letzten 24h
// veröffentlichter Artikel auf Qualitätsverlust, tote Quellen-Links, kaputte
// Bilder. Loggt einen Bericht in AgentLog (sichtbar im /admin Dashboard).

import { prisma } from '../db';
import { chat, MODELS, extractJson } from '../openai';
import { AI_PHRASES_EN } from './humanizer';

export type MonitorReport = {
  startedAt: string;
  finishedAt: string;
  audited: number;
  deadSourceLinks: { slug: string; url: string }[];
  deadImages: { slug: string; url: string }[];
  highAiSmell: { slug: string; score: number }[];
  flaggedFactuality: { slug: string; reason: string }[];
  avgQuality: number;
  trend: 'up' | 'flat' | 'down' | 'unknown';
};

async function checkUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
      headers: { 'user-agent': 'TechPulsBot/1.0 monitor' },
    });
    return res.status < 400;
  } catch {
    return false;
  }
}

function localAiSmell(text: string): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const p of AI_PHRASES_EN) if (lower.includes(p.toLowerCase())) hits++;
  return Math.min(100, hits * 10);
}

const FACT_PROMPT = `You are a fact-checker. Read the article and check whether the claimed facts are plausible. Pay special attention to concrete numbers, dates, prices, market values. If something is likely invented, outdated, or unsupported, list it. If everything checks out: "issues": [].

Reply with JSON: { "issues": ["short, concrete"], "confidence": <0-100 how confident you are> }`;

async function llmFactCheck(title: string, content: string): Promise<string[]> {
  try {
    const text = await chat({
      model: MODELS.reviewer,
      system: FACT_PROMPT,
      user: `Title: ${title}\n\nContent:\n${content.slice(0, 4000)}`,
      maxTokens: 400,
      json: true,
    });
    const parsed = extractJson<{ issues: string[]; confidence: number }>(text);
    if (!parsed) return [];
    if (parsed.confidence < 60) return [];
    return parsed.issues ?? [];
  } catch {
    return [];
  }
}

export async function runMonitor(opts: { hoursBack?: number; checkLinks?: boolean; llmFactcheck?: boolean } = {}): Promise<MonitorReport> {
  const startedAt = new Date().toISOString();
  const hoursBack = opts.hoursBack ?? 24;
  const cutoff = new Date(Date.now() - hoursBack * 3600_000);
  const articles = await prisma.article.findMany({
    where: { status: 'published', publishedAt: { gte: cutoff } },
    orderBy: { publishedAt: 'desc' },
  });

  const report: MonitorReport = {
    startedAt,
    finishedAt: '',
    audited: articles.length,
    deadSourceLinks: [],
    deadImages: [],
    highAiSmell: [],
    flaggedFactuality: [],
    avgQuality: 0,
    trend: 'unknown',
  };

  if (!articles.length) {
    report.finishedAt = new Date().toISOString();
    await prisma.agentLog.create({
      data: { agent: 'monitor', action: 'audit', status: 'idle', message: 'No articles in window' },
    });
    return report;
  }

  let totalQ = 0;
  for (const a of articles) {
    totalQ += a.qualityScore;

    if (opts.checkLinks) {
      const [srcOk, imgOk] = await Promise.all([
        checkUrl(a.sourceUrl),
        a.imageUrl ? checkUrl(a.imageUrl) : Promise.resolve(true),
      ]);
      if (!srcOk) report.deadSourceLinks.push({ slug: a.slug, url: a.sourceUrl });
      if (!imgOk) report.deadImages.push({ slug: a.slug, url: a.imageUrl ?? '' });
    }

    const smell = localAiSmell(`${a.title}\n${a.subtitle ?? ''}\n${a.content}`);
    if (smell > 50) report.highAiSmell.push({ slug: a.slug, score: smell });

    if (opts.llmFactcheck) {
      const issues = await llmFactCheck(a.title, a.content);
      if (issues.length) {
        report.flaggedFactuality.push({ slug: a.slug, reason: issues.join('; ') });
      }
    }
  }
  report.avgQuality = Math.round(totalQ / articles.length);

  // Trend: vergleiche mit den 24h davor
  const prev = await prisma.article.findMany({
    where: {
      status: 'published',
      publishedAt: { gte: new Date(cutoff.getTime() - hoursBack * 3600_000), lt: cutoff },
    },
    select: { qualityScore: true },
  });
  if (prev.length) {
    const prevAvg = prev.reduce((s, a) => s + a.qualityScore, 0) / prev.length;
    const diff = report.avgQuality - prevAvg;
    report.trend = diff > 3 ? 'up' : diff < -3 ? 'down' : 'flat';
  }

  report.finishedAt = new Date().toISOString();

  await prisma.agentLog.create({
    data: {
      agent: 'monitor',
      action: 'audit',
      status: report.deadSourceLinks.length || report.deadImages.length || report.flaggedFactuality.length ? 'warning' : 'success',
      message: `audited=${report.audited} avgQ=${report.avgQuality} trend=${report.trend} deadLinks=${report.deadSourceLinks.length} deadImg=${report.deadImages.length} flagged=${report.flaggedFactuality.length}`,
      meta: JSON.stringify(report),
    },
  });

  return report;
}
