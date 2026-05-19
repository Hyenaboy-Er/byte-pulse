// Community-Replies Agent — monitors our Mastodon posts for replies from the
// community and answers them with a contextual, AI-generated response.
//
// User brief (Tag 6, after spotting unanswered comments):
// > "auf mastadon haben einige kommentare geschrieben das kontrolliert niemand
// >  von euch — erstelle bots die auch der community spätzer schreiben"
//
// Architecture:
// 1. Fetch our most recent 30 statuses via the PUBLIC Mastodon API (no auth
//    needed for our own public account). This bypasses the limited scope
//    of MASTODON_ACCESS_TOKEN (which is write-only for posting).
// 2. For each status with replies_count > 0, fetch /context to get the
//    full reply thread.
// 3. Skip replies authored by us, AND replies we've already answered
//    (tracked in agentLog with action='community-reply-<replyId>').
// 4. For each unanswered reply, build a contextual prompt:
//    - The article we originally posted (title + excerpt + URL)
//    - The user's reply content (stripped of HTML)
//    - Then ask Gemini for a 1-2 sentence friendly, informative reply.
// 5. Post the response via the existing Mastodon POST /api/v1/statuses
//    endpoint with in_reply_to_id + an @-mention of the original poster
//    (Mastodon requires mention for the reply to actually thread).
// 6. Log to agentLog so we never reply twice.
//
// Cron: every 15 minutes via cron-job.org → /api/community-reply

import { prisma } from '../db';
import { tg } from '../telegram';
import { llmChat } from '../llm';
import { SITE } from '../site';

const INSTANCE = SITE.mastodonInstance;
const TOKEN = process.env.MASTODON_ACCESS_TOKEN;
// Our own Mastodon account id is needed to filter out our own replies in a
// thread. The id is stable per site (looked up once at deploy) and lives in
// the central config keystone so a clone needs zero edits here.
const OUR_ACCT = SITE.mastodonHandle;

type Status = {
  id: string;
  content: string;
  created_at: string;
  replies_count: number;
  url?: string;
  account: { id: string; acct: string };
};

type Reply = Status & { in_reply_to_id?: string | null };

export type CommunityReplyReport = {
  postsScanned: number;
  repliesFound: number;
  alreadyAnswered: number;
  newReplies: number;
  generated: number;
  posted: number;
  errors: string[];
};

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .trim();
}

// Pulls the URL of the site's article from a status body. Our writer always
// includes the full URL on its own line — match it. Domain comes from the
// central config so a clone matches its own URLs.
const APEX_RE = SITE.apexDomain.replace(/[.]/g, '\\.');
const ARTICLE_URL_RE = new RegExp(
  `https:\\/\\/(?:www\\.)?${APEX_RE}\\/article\\/[a-z0-9-]+`,
  'i',
);
function extractArticleUrl(content: string): string | null {
  const text = stripHtml(content);
  const m = text.match(ARTICLE_URL_RE);
  return m ? m[0] : null;
}

async function fetchOurRecentStatuses(): Promise<Status[]> {
  // Account id looked up once via /api/v1/accounts/verify_credentials and
  // stored in the central config keystone (MASTODON_ACCOUNT_ID) — MUCH
  // cheaper than calling verify_credentials on every run.
  const url = `https://${INSTANCE}/api/v1/accounts/${SITE.mastodonAccountId}/statuses?limit=30&exclude_replies=true&exclude_reblogs=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`fetch statuses: ${res.status}`);
  return (await res.json()) as Status[];
}

async function fetchContext(statusId: string): Promise<{ descendants: Reply[] }> {
  const url = `https://${INSTANCE}/api/v1/statuses/${statusId}/context`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`fetch context ${statusId}: ${res.status}`);
  return (await res.json()) as { descendants: Reply[] };
}

async function alreadyReplied(replyId: string): Promise<boolean> {
  const found = await prisma.agentLog.findFirst({
    where: { agent: 'community', action: `community-reply-${replyId}`, status: 'ok' },
    select: { id: true },
  });
  return !!found;
}

async function generateReply(opts: {
  articleTitle: string | null;
  articleExcerpt: string | null;
  userContent: string;
  userAcct: string;
}): Promise<string> {
  const article = opts.articleTitle
    ? `Original article: "${opts.articleTitle}"${opts.articleExcerpt ? `\nSummary: ${opts.articleExcerpt}` : ''}`
    : '';

  // Rotate openers + ban the formulaic "That's a strong take" / "Fair question"
  // patterns that Gemini defaults to. The list-of-banned-phrases prompt
  // technique works much better than asking for "variety" in the abstract.
  const system = `You're an editor at ${SITE.name}, a small ${SITE.niche.split(',')[0].trim()} news outlet.
You're replying to a comment on one of your Mastodon posts.

HARD RULES:
- Max 280 characters total
- 1-2 sentences only
- NEVER start with "That's a strong take", "That's a fair question", "Great point",
  "Thanks for sharing", "Absolutely", "Indeed", "Interesting!" or any other generic
  acknowledgement opener. Just answer.
- NO URLs, NO hashtags, NO @mentions (system adds the mention)
- Sound like a curious human editor, not a corporate PR bot
- If the user made a substantive point: address it directly with one concrete fact
  or piece of nuance, OR ask one specific follow-up question
- If the user's comment is vague/empty: ask one specific clarifying question
- Stay neutral on flame-bait topics (politics, vendor wars) — pivot to facts
- No quotes around your reply, no preamble like "Reply:" or "Response:"`;

  const user = `${article}

User @${opts.userAcct} replied to our post:
"${opts.userContent}"

Your reply (just the text, nothing else):`;

  const out = await llmChat({ role: 'reviewer', system, user, maxTokens: 200, temperature: 0.7 });
  // Trim any leading quotes / "Reply:" prefixes
  return out
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/^(Reply|Response|Answer):\s*/i, '')
    .slice(0, 400);
}

async function postReply(opts: {
  inReplyToId: string;
  userAcct: string;
  body: string;
}): Promise<void> {
  if (!TOKEN) throw new Error('MASTODON_ACCESS_TOKEN missing');
  // Mastodon requires us to @-mention every user in the thread for the reply
  // to actually thread under their reply. We mention only the immediate
  // parent (the user we're replying to).
  const status = `@${opts.userAcct} ${opts.body}`.slice(0, 500);
  const res = await fetch(`https://${INSTANCE}/api/v1/statuses`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      visibility: 'public',
      in_reply_to_id: opts.inReplyToId,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`mastodon ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function runCommunityReplies(): Promise<CommunityReplyReport> {
  const report: CommunityReplyReport = {
    postsScanned: 0,
    repliesFound: 0,
    alreadyAnswered: 0,
    newReplies: 0,
    generated: 0,
    posted: 0,
    errors: [],
  };

  if (!TOKEN) {
    report.errors.push('MASTODON_ACCESS_TOKEN missing');
    await prisma.agentLog.create({
      data: { agent: 'community-replies', action: 'scan', status: 'warn', message: 'MASTODON_ACCESS_TOKEN missing' },
    }).catch(() => null);
    return report;
  }

  let posts: Status[];
  try {
    posts = await fetchOurRecentStatuses();
  } catch (e) {
    report.errors.push(`fetch posts: ${(e as Error).message}`);
    await prisma.agentLog.create({
      data: { agent: 'community-replies', action: 'scan', status: 'error', message: `fetch posts: ${(e as Error).message}`.slice(0, 140) },
    }).catch(() => null);
    return report;
  }

  report.postsScanned = posts.length;
  const postsWithReplies = posts.filter((p) => (p.replies_count ?? 0) > 0);

  for (const post of postsWithReplies) {
    let ctx: { descendants: Reply[] };
    try {
      ctx = await fetchContext(post.id);
    } catch (e) {
      report.errors.push(`ctx ${post.id}: ${(e as Error).message}`);
      continue;
    }

    // Only direct replies (in_reply_to_id == post.id) — not sub-threads
    // among other users. We answer top-level replies to OUR posts.
    const directReplies = ctx.descendants.filter(
      (r) => r.in_reply_to_id === post.id && r.account.acct !== OUR_ACCT
    );
    report.repliesFound += directReplies.length;

    // Look up the article in our DB so we have title/excerpt for context
    const articleUrl = extractArticleUrl(post.content);
    const slug = articleUrl ? articleUrl.split('/article/')[1] : null;
    const article = slug
      ? await prisma.article.findUnique({ where: { slug }, select: { title: true, excerpt: true } })
      : null;

    for (const reply of directReplies) {
      if (await alreadyReplied(reply.id)) {
        report.alreadyAnswered++;
        continue;
      }
      report.newReplies++;

      const handleMentionRe = new RegExp(`@${SITE.mastodonHandle}`, 'gi');
      const userText = stripHtml(reply.content).replace(handleMentionRe, '').trim();
      if (!userText) continue; // empty reply (e.g. just a mention) — skip

      let body: string;
      try {
        body = await generateReply({
          articleTitle: article?.title ?? null,
          articleExcerpt: article?.excerpt ?? null,
          userContent: userText,
          userAcct: reply.account.acct,
        });
        report.generated++;
      } catch (e) {
        report.errors.push(`llm ${reply.id}: ${(e as Error).message}`);
        await prisma.agentLog.create({
          data: {
            agent: 'community',
            action: `community-reply-${reply.id}`,
            status: 'error',
            message: `llm: ${(e as Error).message}`.slice(0, 500),
          },
        });
        continue;
      }

      try {
        await postReply({ inReplyToId: reply.id, userAcct: reply.account.acct, body });
        report.posted++;
        await prisma.agentLog.create({
          data: {
            agent: 'community',
            action: `community-reply-${reply.id}`,
            status: 'ok',
            message: `replied to @${reply.account.acct} on post ${post.id}: ${body.slice(0, 200)}`,
          },
        });
      } catch (e) {
        report.errors.push(`post ${reply.id}: ${(e as Error).message}`);
        await prisma.agentLog.create({
          data: {
            agent: 'community',
            action: `community-reply-${reply.id}`,
            status: 'error',
            message: `post: ${(e as Error).message}`.slice(0, 500),
          },
        });
      }
    }
  }

  // Surface activity via Telegram if anything happened. Skip the chat-spam
  // when there were no new replies to handle.
  if (report.posted > 0 || report.errors.length > 0) {
    const lines = [
      `Community-Replies — Mastodon`,
      `scanned: ${report.postsScanned} posts`,
      `replies found: ${report.repliesFound} (${report.alreadyAnswered} already answered)`,
      `posted: ${report.posted}`,
    ];
    if (report.errors.length) lines.push(`errors: ${report.errors.length}`);
    await tg(lines.join('\n')).catch(() => null);
  }

  // Always log one summary run-entry so the agent-auditor can verify
  // this agent (previously it wrote AgentLog only on errors/posts, so a
  // normal "nothing to reply to" run left no trace → falsely "unknown").
  await prisma.agentLog.create({
    data: {
      agent: 'community-replies', action: 'scan',
      status: report.errors.length ? 'warn' : 'success',
      message: `scanned=${report.postsScanned} found=${report.repliesFound} posted=${report.posted} errors=${report.errors.length}`,
    },
  }).catch(() => null);

  return report;
}
