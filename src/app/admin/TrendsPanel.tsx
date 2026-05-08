'use client';
import { useEffect, useState } from 'react';

type Snapshot = {
  fetchedAt: string;
  hnTitles: string[];
  redditTitles: string[];
  googleSuggestions: string[];
  topics: string[];
};

export default function TrendsPanel() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/trends');
      const j = await res.json();
      if (j.ok) setData(j.snapshot);
      else setError(j.error ?? 'Unknown error');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="mb-6 rounded-xl bg-bg-card border border-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-extrabold text-xl">Keyword Research</h2>
          <p className="text-sm text-muted">Live trends from Hacker News, Reddit (9 subs), and Google Suggest. The picker boosts stories matching these.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="text-red-400 text-sm">{error}</div>}

      {data && (
        <>
          <div className="mb-4">
            <div className="text-xs uppercase tracking-wider text-accent font-bold mb-2">Top trending topics ({data.topics.length})</div>
            <div className="flex flex-wrap gap-1.5">
              {data.topics.slice(0, 30).map((t) => (
                <span key={t} className="px-2 py-1 rounded bg-accent/15 text-accent text-xs font-medium">{t}</span>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 text-xs">
            <SourceList title="Hacker News" items={data.hnTitles} />
            <SourceList title="Reddit hot" items={data.redditTitles} />
            <SourceList title="Google Suggest" items={data.googleSuggestions} />
          </div>

          <div className="text-xs text-muted mt-3">
            Snapshot from {new Date(data.fetchedAt).toLocaleTimeString('en-US')} · cached 30 min
          </div>
        </>
      )}
    </section>
  );
}

function SourceList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-bg-elevated p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-2">{title} ({items.length})</div>
      <ul className="space-y-1 text-white/80">
        {items.slice(0, 12).map((it, i) => (
          <li key={i} className="line-clamp-1">• {it}</li>
        ))}
      </ul>
    </div>
  );
}
