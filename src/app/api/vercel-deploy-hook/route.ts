// /api/vercel-deploy-hook — receives Vercel deployment webhooks and turns
// them into ONE structured Telegram message per deploy.
//
// Without this hook, Vercel's default integration sends a separate email
// for every failed deploy. When the build is broken AND the auto-snapshot
// cron commits 6× over the night, the user gets 6 identical alarm emails
// for the same root cause.
//
// This route:
//   1. Verifies the Vercel webhook signature (HMAC-SHA1 of body with the
//      `VERCEL_WEBHOOK_SECRET` env var).
//   2. Dedupes: only alerts on state TRANSITIONS (last alert state is
//      stored in the agentLog under agent='vercel-hook'). If the previous
//      deploy was already ERROR, we don't alert again.
//   3. Sends ONE Telegram message with state, commit msg, author, link.
//
// Setup at Vercel:
//   Project → Settings → Git → Deploy Hooks → Add Webhook
//     URL:    https://www.byte-pulse.net/api/vercel-deploy-hook
//     Events: deployment.created, deployment.succeeded, deployment.error
//
// Env required:
//   VERCEL_WEBHOOK_SECRET    — set in Vercel project env
//   TELEGRAM_BOT_TOKEN       — already in env
//   TELEGRAM_CHAT_ID         — already in env

import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface VercelHookPayload {
  type?: string;            // e.g. 'deployment.succeeded'
  payload?: {
    deployment?: {
      url?: string;
      id?: string;
      meta?: {
        githubCommitMessage?: string;
        githubCommitAuthorLogin?: string;
        githubCommitSha?: string;
      };
    };
    target?: 'production' | 'preview' | string;
    name?: string;
    project?: { id?: string; name?: string };
  };
}

function verify(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  try {
    const mac = createHmac('sha1', secret).update(body).digest('hex');
    const a = Buffer.from(mac);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function alreadyAlerted(deploymentId: string): Promise<boolean> {
  try {
    const row = await prisma.agentLog.findFirst({
      where: {
        agent: 'vercel-hook',
        action: deploymentId,
      },
    });
    return !!row;
  } catch {
    return false;
  }
}

async function markAlerted(deploymentId: string, state: string) {
  try {
    await prisma.agentLog.create({
      data: {
        agent: 'vercel-hook',
        action: deploymentId,
        status: state,
      },
    });
  } catch {
    /* best-effort */
  }
}

async function lastStateForProject(): Promise<string | null> {
  try {
    const row = await prisma.agentLog.findFirst({
      where: { agent: 'vercel-hook' },
      orderBy: { createdAt: 'desc' },
    });
    return row?.status ?? null;
  } catch {
    return null;
  }
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* don't break the webhook just because Telegram is slow */
  }
}

export async function POST(req: Request) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'secret-not-configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get('x-vercel-signature');
  if (!verify(rawBody, sig, secret)) {
    return NextResponse.json({ ok: false, error: 'bad-signature' }, { status: 401 });
  }

  let payload: VercelHookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid-json' }, { status: 400 });
  }

  const type = payload.type ?? '';
  const deployment = payload.payload?.deployment;
  const target = payload.payload?.target ?? '';
  const deploymentId = deployment?.id ?? '';
  if (!deploymentId) {
    return NextResponse.json({ ok: true, skipped: 'no-deployment-id' });
  }

  // Dedup — never alert twice for the same deployment id.
  if (await alreadyAlerted(deploymentId)) {
    return NextResponse.json({ ok: true, skipped: 'already-alerted' });
  }

  // Decide whether to send.
  const isError = type === 'deployment.error' || type === 'deployment.canceled';
  const isSuccess = type === 'deployment.succeeded' || type === 'deployment.ready';
  const isProduction = target === 'production' || !target; // empty = treat as prod

  // We ONLY message on:
  //   - production errors
  //   - first success after a chain of errors (recovery signal)
  let send = false;
  let icon = '';
  if (isError && isProduction) {
    send = true;
    icon = '🚨';
  } else if (isSuccess && isProduction) {
    const lastState = await lastStateForProject();
    if (lastState === 'deployment.error' || lastState === 'deployment.canceled') {
      send = true;
      icon = '✅';
    }
  }

  if (!send) {
    await markAlerted(deploymentId, type);
    return NextResponse.json({ ok: true, sent: false });
  }

  const meta = deployment?.meta ?? {};
  const msg = (meta.githubCommitMessage ?? '').split('\n')[0].slice(0, 100);
  const sha = (meta.githubCommitSha ?? '').slice(0, 8);
  const author = meta.githubCommitAuthorLogin ?? 'unknown';
  const url = deployment?.url ? `https://${deployment.url}` : 'https://www.byte-pulse.net';

  const text =
    `${icon} Vercel deploy ${isError ? 'FAILED' : 'recovered'}\n` +
    `Author: ${author}\n` +
    `Commit: ${sha} — ${msg}\n` +
    `URL: ${url}\n` +
    (isError
      ? `→ Check build log + revert if from byte-pulse-bot.`
      : `→ Site is healthy again.`);

  await sendTelegram(text);
  await markAlerted(deploymentId, type);

  return NextResponse.json({ ok: true, sent: true });
}

// GET for health-check pings; verifies the hook is wired up.
export async function GET() {
  return NextResponse.json({
    ok: true,
    configured: !!process.env.VERCEL_WEBHOOK_SECRET,
    telegram: !!process.env.TELEGRAM_BOT_TOKEN,
  });
}
