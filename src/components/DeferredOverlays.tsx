// Lazy-mounts NewsletterModal + ExitIntent. Both components are
// non-essential for the first paint — they only fire after 30s dwell, after
// 50% scroll, or after a mouseleave gesture. By deferring their JS load
// until the visitor has had ~3 seconds with the page, we eliminate them
// from the critical path and the Lighthouse "Reduce unused JS" warning.
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Both are loaded ssr:false because they're pure browser features. The
// loading: () => null prevents any flash of fallback during hydration.
const NewsletterModal = dynamic(() => import('./NewsletterModal'), { ssr: false, loading: () => null });
const ExitIntent = dynamic(() => import('./ExitIntent'), { ssr: false, loading: () => null });

export default function DeferredOverlays() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // requestIdleCallback if available, otherwise a 3-second setTimeout.
    // Either way the visitor sees the page first; the modal chunks load
    // afterwards in the background.
    type IdleWindow = typeof window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => {
        const cw = window as IdleWindow & { cancelIdleCallback?: (id: number) => void };
        cw.cancelIdleCallback?.(id);
      };
    } else {
      const id = window.setTimeout(() => setReady(true), 3000);
      return () => window.clearTimeout(id);
    }
  }, []);

  if (!ready) return null;
  // NewsletterModal disabled 2026-05-12: user feedback says it annoys mobile
  // visitors. Newsletter form lives in the footer instead — non-intrusive,
  // visitors who want it find it. ExitIntent still useful for desktop where
  // mouse-leave is a real signal.
  return (
    <>
      <ExitIntent />
    </>
  );
}
