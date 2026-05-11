'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Saved = { slug: string; title: string; savedAt: number; lang: 'en' | 'de' };

const STORAGE_KEY = 'bp_saved_v1';

function readAll(): Saved[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: Saved[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch { return []; }
}

function writeAll(items: Saved[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, v: 1 })); } catch {}
}

export default function SavedListClient() {
  const [items, setItems] = useState<Saved[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setItems(readAll());
  }, []);

  function remove(slug: string) {
    const next = items.filter((i) => i.slug !== slug);
    setItems(next);
    writeAll(next);
  }

  function clearAll() {
    if (!confirm('Remove all saved articles?')) return;
    setItems([]);
    writeAll([]);
  }

  if (!mounted) return <div className="mt-10 text-muted text-sm">Loading…</div>;
  if (!items.length) {
    return (
      <div className="mt-10 text-center py-16 rounded-xl bg-bg-card border border-white/5">
        <div className="text-5xl mb-4">🔖</div>
        <p className="text-white/80 font-medium">No saved articles yet.</p>
        <p className="text-muted text-sm mt-2">Hit the heart icon on any article to save it for later.</p>
        <Link href="/" className="inline-block mt-6 text-sm font-semibold text-accent hover:text-accent-hover">
          Browse stories →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mt-8 mb-4">
        <span className="text-sm text-muted">{items.length} article{items.length === 1 ? '' : 's'}</span>
        <button onClick={clearAll} className="text-xs text-muted hover:text-red-400 transition">Clear all</button>
      </div>
      <ul className="space-y-2">
        {items.map((it) => {
          const href = it.lang === 'de' ? `/de/article/${it.slug}` : `/article/${it.slug}`;
          const when = new Date(it.savedAt);
          const dateStr = when.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
          return (
            <li key={it.slug} className="group flex items-center gap-3 rounded-xl bg-bg-card border border-white/5 hover:border-accent/40 p-4 transition">
              <div className="flex-1 min-w-0">
                <Link href={href} className="block font-semibold text-base group-hover:text-accent transition line-clamp-2">
                  {it.title}
                </Link>
                <div className="mt-1 text-xs text-muted">Saved {dateStr}{it.lang === 'de' ? ' · DE' : ''}</div>
              </div>
              <button
                onClick={() => remove(it.slug)}
                className="text-xs text-muted hover:text-red-400 transition shrink-0 px-2 py-1 rounded hover:bg-white/5"
                aria-label="Remove from saved"
              >
                ✕
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}
