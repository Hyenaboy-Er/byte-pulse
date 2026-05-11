// Heart-toggle button that persists the article slug in localStorage. Visible
// on the article page header next to the share rail. A subscriber-grade
// micro-commitment: visitors who save an article are 5-10x more likely to
// return, and we don't need backend storage or auth for that flow.
//
// Storage shape (key `bp_saved_v1`):
//   { items: [{ slug, title, savedAt }, ...], v: 1 }
// Kept simple intentionally — under 1KB even at 100 saves.
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'bp_saved_v1';

type Saved = { slug: string; title: string; savedAt: number; lang: 'en' | 'de' };

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

export default function SaveButton({ slug, title }: { slug: string; title: string }) {
  const pathname = usePathname() ?? '/';
  const isDE = pathname.startsWith('/de/');
  const [saved, setSaved] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSaved(readAll().some((s) => s.slug === slug));
  }, [slug]);

  function toggle() {
    const all = readAll();
    const exists = all.some((s) => s.slug === slug);
    if (exists) {
      writeAll(all.filter((s) => s.slug !== slug));
      setSaved(false);
    } else {
      const lang: 'de' | 'en' = isDE ? 'de' : 'en';
      writeAll([{ slug, title, savedAt: Date.now(), lang }, ...all].slice(0, 200));
      setSaved(true);
    }
  }

  // Avoid hydration mismatch — render placeholder until client mounts.
  if (!mounted) {
    return (
      <button type="button" aria-hidden="true" className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/40 cursor-default">
        <HeartOutline />
      </button>
    );
  }

  const label = saved
    ? (isDE ? 'Gespeichert' : 'Saved')
    : (isDE ? 'Für später speichern' : 'Save for later');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition ${
        saved
          ? 'bg-accent/15 text-accent border-accent/40'
          : 'bg-white/5 hover:bg-white/10 text-white/75 hover:text-white border-white/10'
      }`}
    >
      {saved ? <HeartFilled /> : <HeartOutline />}
      <span>{label}</span>
    </button>
  );
}

function HeartOutline() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function HeartFilled() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
