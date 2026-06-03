// Health check — pings DB, recent agent activity, returns status.
// On failure, posts a Telegram alert. Idempotent: sets a "last alerted" record
// so we don't spam the same message every minute.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { tgError } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type HealthState = {
  ok: boolean;
  checks: Record<string, { ok: boolean; detail?: string }>;
  total: number;
  lastWriterRun?: string;
  lastPublishedAgo?: string;
  // Extended monitoring (added 2026-06-02): operational status of every
  // moving part. Keeps the check route a single endpoint I can curl to see
  // the whole stack at a glance.
  pipeline?: {
    multiAgentEnabled: boolean;
    plagiarismThreshold: number;
    parallelCronWorkflows: number;
  };
  monetization?: {
    adsenseConfigured: boolean;
    skimlinksConfigured: boolean;
    braveConfigured: boolean;
    amazonConfigured: boolean;
    amazonTagDE?: string;
    amazonTagUS?: string;
    amazonSourceDE?: string;
    amazonSourceUS?: string;
    linkedinPosterConfigured: boolean;
  };
};

async function checkDb(): Promise<HealthState['checks'][string]> {
  try {
    const c = await prisma.article.count();
    return { ok: true, detail: `${c} articles` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message.slice(0, 100) };
  }
}

async function checkRecentActivity(): Promise<{ check: HealthState['checks'][string]; lastAt: Date | null }> {
  try {
    const last = await prisma.agentLog.findFirst({
      where: { agent: 'orchestrator' },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) return { check: { ok: false, detail: 'no agent activity ever recorded' }, lastAt: null };
    const ageH = (Date.now() - last.createdAt.getTime()) / 3_600_000;
    if (ageH > 6) {
      return {
        check: { ok: false, detail: `last orchestrator run was ${ageH.toFixed(1)}h ago` },
        lastAt: last.createdAt,
      };
    }
    return {
      check: { ok: true, detail: `${ageH.toFixed(2)}h ago` },
      lastAt: last.createdAt,
    };
  } catch (e) {
    return { check: { ok: false, detail: (e as Error).message.slice(0, 100) }, lastAt: null };
  }
}

async function checkRecentPublish(): Promise<HealthState['checks'][string]> {
  try {
    const last = await prisma.article.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
    });
    if (!last?.publishedAt) return { ok: false, detail: 'no published articles yet' };
    const ageH = (Date.now() - last.publishedAt.getTime()) / 3_600_000;
    if (ageH > 12) {
      return { ok: false, detail: `last publish ${ageH.toFixed(1)}h ago` };
    }
    return { ok: true, detail: `${ageH.toFixed(1)}h ago` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message.slice(0, 100) };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const silent = url.searchParams.get('silent') === '1';

  const [dbCheck, activity, publishCheck] = await Promise.all([
    checkDb(),
    checkRecentActivity(),
    checkRecentPublish(),
  ]);

  const checks: HealthState['checks'] = {
    database: dbCheck,
    'recent-activity': activity.check,
    'recent-publish': publishCheck,
  };
  const ok = Object.values(checks).every((c) => c.ok);
  const totalCount = await prisma.article.count({ where: { status: 'published' } }).catch(() => 0);

  const state: HealthState = {
    ok,
    checks,
    total: totalCount,
    lastWriterRun: activity.lastAt?.toISOString(),
    pipeline: {
      multiAgentEnabled: process.env.MULTI_AGENT_PIPELINE !== '0',
      plagiarismThreshold: 70,
      parallelCronWorkflows: 4,
    },
    monetization: {
      adsenseConfigured: !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT,
      skimlinksConfigured: !!process.env.NEXT_PUBLIC_SKIMLINKS_ID,
      braveConfigured: !!process.env.NEXT_PUBLIC_BRAVE_VERIFICATION_TOKEN,
      // Amazon Associates: src/lib/affiliate.ts has hardcoded fallbacks
      // bytepulse-21 (DE) + bytepulse01-20 (US), so affiliate links
      // ALWAYS render even without env override. This field shows the
      // tag that's actually live, plus whether it came from env or the
      // hardcoded fallback.
      amazonConfigured: true,
      amazonTagDE: process.env.AMAZON_ASSOCIATE_TAG_DE ?? process.env.AMAZON_ASSOCIATE_TAG ?? 'bytepulse-21',
      amazonTagUS: process.env.AMAZON_ASSOCIATE_TAG_US ?? process.env.AMAZON_ASSOCIATE_TAG ?? 'bytepulse01-20',
      amazonSourceDE: process.env.AMAZON_ASSOCIATE_TAG_DE || process.env.AMAZON_ASSOCIATE_TAG ? 'env' : 'hardcoded-default',
      amazonSourceUS: process.env.AMAZON_ASSOCIATE_TAG_US || process.env.AMAZON_ASSOCIATE_TAG ? 'env' : 'hardcoded-default',
      linkedinPosterConfigured: !!process.env.LINKEDIN_ACCESS_TOKEN && !!process.env.LINKEDIN_AUTHOR_URN,
    },
  };

  // Alert on failure (rate-limited via AgentLog so we don't spam)
  if (!ok && !silent) {
    const failed = Object.entries(checks)
      .filter(([, c]) => !c.ok)
      .map(([k, c]) => `${k}: ${c.detail}`)
      .join('; ');

    const recentAlert = await prisma.agentLog.findFirst({
      where: { agent: 'health', action: 'alert', createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
    }).catch(() => null);

    if (!recentAlert) {
      await tgError(`Site health degraded — ${failed}. https://byte-pulse.net`);
      await prisma.agentLog.create({
        data: { agent: 'health', action: 'alert', status: 'warning', message: failed.slice(0, 500) },
      }).catch(() => null);
    }
  }

  return NextResponse.json(state, { status: ok ? 200 : 503 });
}
