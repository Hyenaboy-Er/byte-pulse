// ViewCounter — fires a single fetch to /api/view/<slug> after page load.
// Lives client-side so the article page can stay statically cacheable.
// sessionStorage prevents the same tab from re-incrementing during a back-
// forward navigation loop.
'use client';

import { useEffect } from 'react';

export default function ViewCounter({ slug }: { slug: string }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `bp_v:${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch { /* private-mode browsers can throw — best-effort only */ }

    // Fire-and-forget, after a tiny delay so we don't compete with critical
    // page resources (hero image, fonts).
    const timer = window.setTimeout(() => {
      fetch(`/api/view/${encodeURIComponent(slug)}`, { method: 'POST', keepalive: true }).catch(() => null);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [slug]);

  return null;
}
