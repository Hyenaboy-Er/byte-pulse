'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { relativeTime } from '@/lib/readingTime';

type AgentLog = { createdAt: Date | string; status: string; meta: string | null; message: string | null };
type MonitorMeta = {
  audited: number;
  avgQuality: number;
  trend: 'up' | 'flat' | 'down' | 'unknown';
  deadSourceLinks: { slug: string; url: string }[];
  deadImages: { slug: string; url: string }[];
  highAiSmell: { slug: string; score: number }[];
  flaggedFactuality: { slug: string; reason: string }[];
};

export default function MonitorPanel({ lastReport }: { lastReport: AgentLog | null }) {
  const [running, setRunning] = useState(false);
  const router = useRouter();
  const meta: MonitorMeta | null = lastReport?.meta ? safeParse(lastReport.meta) : null;

  async function go(factcheck: boolean) {
    setRunning(true);
    try {
      const url = `/api/admin/monitor?links=1${factcheck ? '&factcheck=1' : ''}`;
      await fetch(url, { method: 'POST' });
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <section className="mb-6 rounded-xl bg-bg-card border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-extrabold text-xl">Monitor agent</h2>
          <p className="text-sm text-muted">Audits the last 24h: dead links, broken images, AI smell, factuality.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => go(false)}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
          >
            {running ? 'Running …' : 'Quick audit'}
          </button>
          <button
            onClick={() => go(true)}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-semibold disabled:opacity-50"
          >
            {running ? '…' : 'Full audit (with fact-check)'}
          </button>
        </div>
      </div>

      {!meta ? (
        <p className="text-sm text-muted">No monitor report yet. Click "Full audit" for the first run.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
            <Stat label="Audited" value={meta.audited} />
            <Stat label="Avg quality" value={meta.avgQuality} />
            <Stat label="Trend" value={trendIcon(meta.trend)} />
            <Stat label="Dead sources" value={meta.deadSourceLinks.length} bad={meta.deadSourceLinks.length > 0} />
            <Stat label="Fact flags" value={meta.flaggedFactuality.length} bad={meta.flaggedFactuality.length > 0} />
          </div>
          <div className="text-xs text-muted mb-3">Last run {lastReport && relativeTime(lastReport.createdAt)}</div>

          {!!meta.deadSourceLinks.length && (
            <Issues title="Dead source links" items={meta.deadSourceLinks.map((d) => ({ slug: d.slug, msg: d.url }))} />
          )}
          {!!meta.deadImages.length && (
            <Issues title="Broken images" items={meta.deadImages.map((d) => ({ slug: d.slug, msg: d.url }))} />
          )}
          {!!meta.highAiSmell.length && (
            <Issues title="High AI smell" items={meta.highAiSmell.map((d) => ({ slug: d.slug, msg: `Score ${d.score}` }))} />
          )}
          {!!meta.flaggedFactuality.length && (
            <Issues title="Fact flags" items={meta.flaggedFactuality.map((d) => ({ slug: d.slug, msg: d.reason }))} accent />
          )}
        </>
      )}
    </section>
  );
}

function Stat({ label, value, bad }: { label: string; value: React.ReactNode; bad?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${bad ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-bg-elevated'}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
      <div className="font-display font-extrabold text-2xl tabular-nums">{value}</div>
    </div>
  );
}

function Issues({ title, items, accent }: { title: string; items: { slug: string; msg: string }[]; accent?: boolean }) {
  return (
    <div className={`mt-3 rounded-lg p-3 ${accent ? 'bg-red-500/10 border border-red-500/30' : 'bg-bg-elevated'}`}>
      <div className="text-xs uppercase tracking-wider text-muted mb-2">{title} ({items.length})</div>
      <ul className="space-y-2 text-sm">
        {items.slice(0, 8).map((it, i) => (
          <li key={i} className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <a href={`/article/${it.slug}`} className="text-accent hover:underline">{it.slug}</a>
              <div className="text-white/70 text-xs mt-0.5">{it.msg}</div>
            </div>
            {accent && <UnpublishButton slug={it.slug} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

function UnpublishButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function go() {
    if (!confirm('Take this article down due to factuality issue?')) return;
    setLoading(true);
    try {
      await fetch('/api/admin/unpublish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) });
      router.refresh();
    } finally { setLoading(false); }
  }
  return (
    <button
      onClick={go}
      disabled={loading}
      className="shrink-0 text-xs px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 disabled:opacity-50"
    >
      {loading ? '…' : 'Remove'}
    </button>
  );
}

function trendIcon(t: string) {
  if (t === 'up') return '↗ up';
  if (t === 'down') return '↘ down';
  if (t === 'flat') return '→ flat';
  return '–';
}

function safeParse<T = any>(s: string): T | null {
  try { return JSON.parse(s); } catch { return null; }
}
