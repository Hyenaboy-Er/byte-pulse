// Sets <html lang> client-side based on pathname. Lives outside the SSR layout
// so the layout can stay statically rendered (which it must be, otherwise
// Cache-Control headers from next.config.mjs don't apply to article pages).
//
// Trade-off: between first-paint and hydration, /de/* visitors see lang="en"
// for ~100-300ms. This is invisible to humans and a non-issue for Google
// — hreflang in the page <head> metadata is the authoritative signal.
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function LangSetter() {
  const pathname = usePathname() ?? '/';
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isDE = pathname === '/de' || pathname.startsWith('/de/');
    document.documentElement.lang = isDE ? 'de' : 'en';
  }, [pathname]);
  return null;
}
