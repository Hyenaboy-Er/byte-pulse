// /de segment layout. Sole purpose: ONE central robots lever for the
// entire German layer. When SITE.deEnabled is false, every /de/* route
// (home, category, about, contact, privacy, newsletter, search, article)
// inherits robots:noindex from here — no per-page edits, no 404, fully
// reversible (flip NEXT_PUBLIC_DE_ENABLED=true). Pages stay reachable so
// existing links never break; Google/Bing just drop them from the index,
// removing the broken-German mass that was tanking site quality.
//
// Passthrough only — the real <html>/<body> comes from the root layout.
import type { Metadata } from 'next';
import { SITE } from '@/lib/site';

export const metadata: Metadata = SITE.deEnabled
  ? {}
  : { robots: { index: false, follow: true, googleBot: { index: false, follow: true } } };

export default function DeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
