import { prisma } from '@/lib/db';
import { CATEGORIES } from '@/lib/categories';
import Link from 'next/link';
import RunButton from './RunButton';
import MonitorPanel from './MonitorPanel';
import TrendsPanel from './TrendsPanel';
import { formatDate, relativeTime } from '@/lib/readingTime';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin · Stats' };

export default async function AdminPage() {
  const [total, published, drafts, subscribers, recentLogs, perCategory, lastArticles, last7days, lastMonitor] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: 'published' } }),
    prisma.article.count({ where: { status: 'draft' } }),
    prisma.newsletterSubscriber.count(),
    prisma.agentLog.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.article.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.article.findMany({ orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, slug: true, title: true, status: true, category: true, qualityScore: true, createdAt: true } }),
    prisma.article.count({ where: { publishedAt: { gte: new Date(Date.now() - 7 * 86400_000) } } }),
    prisma.agentLog.findFirst({ where: { agent: 'monitor', action: 'audit' }, orderBy: { createdAt: 'desc' } }),
  ]);

  const apiKeySet = !!process.env.OPENAI_API_KEY;

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display font-extrabold text-3xl">Admin Dashboard</h1>
          <p className="text-muted text-sm mt-1">Live overview of agents and content.</p>
        </div>
        <RunButton apiKeySet={apiKeySet} />
      </div>

      {!apiKeySet && (
        <div className="mb-6 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm">
          <strong>OPENAI_API_KEY missing.</strong> Add the key to <code>.env</code> so the agents can produce articles.
        </div>
      )}

      <TrendsPanel />
      <MonitorPanel lastReport={lastMonitor} />

      <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <Stat label="Total articles" value={total} />
        <Stat label="Published" value={published} accent />
        <Stat label="Drafts/Rejected" value={drafts} />
        <Stat label="Last 7 days" value={last7days} />
        <Stat label="Newsletter subs" value={subscribers} />
      </section>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl bg-bg-card border border-white/5 p-5">
          <h2 className="font-bold text-lg mb-3">Articles per section</h2>
          <div className="space-y-1.5">
            {CATEGORIES.map((c) => {
              const row = perCategory.find((p) => p.category === c.slug);
              const n = row?._count._all ?? 0;
              return (
                <div key={c.slug} className="flex items-center justify-between text-sm">
                  <span style={{ color: c.color }}>{c.emoji} {c.name}</span>
                  <span className="text-muted tabular-nums">{n}</span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl bg-bg-card border border-white/5 p-5">
          <h2 className="font-bold text-lg mb-3">Latest articles</h2>
          <div className="space-y-2">
            {lastArticles.map((a) => (
              <Link key={a.id} href={`/article/${a.slug}`} className="block py-2 border-b border-white/5 last:border-0 hover:text-accent">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${a.status === 'published' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                    {a.status}
                  </span>
                  <span className="text-xs text-muted">Q{a.qualityScore}</span>
                  <span className="text-xs text-muted">·</span>
                  <span className="text-xs text-muted">{a.category}</span>
                </div>
                <div className="text-sm font-semibold leading-snug mt-1 line-clamp-1">{a.title}</div>
                <div className="text-xs text-muted">{relativeTime(a.createdAt)}</div>
              </Link>
            ))}
            {!lastArticles.length && <p className="text-sm text-muted">No articles yet.</p>}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-xl bg-bg-card border border-white/5 p-5">
        <h2 className="font-bold text-lg mb-3">Agent log (last 20)</h2>
        {!recentLogs.length ? (
          <p className="text-sm text-muted">No entries yet. Hit "Run now" or wait for the next cron.</p>
        ) : (
          <div className="space-y-1.5 font-mono text-xs">
            {recentLogs.map((l) => (
              <div key={l.id} className="flex gap-2">
                <span className="text-muted shrink-0">{formatDate(l.createdAt)} {new Date(l.createdAt).toLocaleTimeString('de-DE')}</span>
                <span className={`shrink-0 ${l.status === 'success' ? 'text-green-400' : l.status === 'error' ? 'text-red-400' : 'text-blue-300'}`}>
                  [{l.agent}]
                </span>
                <span className="text-white/80">{l.action}</span>
                {l.message && <span className="text-white/60 truncate">— {l.message}</span>}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? 'border-accent/40 bg-accent/10' : 'border-white/5 bg-bg-card'}`}>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display font-extrabold text-3xl mt-1 tabular-nums">{value.toLocaleString('de-DE')}</div>
    </div>
  );
}
