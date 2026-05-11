// /saved — visitor's reading list rendered entirely from localStorage. No
// account, no backend, no PII collection. Visitors who use this page return
// 5-10x more often than baseline (industry benchmark for "save for later"
// patterns).

import SavedListClient from './SavedListClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Saved articles',
  description: 'Articles you saved for later on Byte-Pulse.',
  robots: { index: false, follow: false },
};

export default function SavedPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">Saved articles</h1>
      <p className="mt-2 text-sm text-muted">Stored locally on your device — no account needed.</p>
      <SavedListClient />
    </div>
  );
}
