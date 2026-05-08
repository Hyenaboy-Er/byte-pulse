'use client';
import { useState } from 'react';
import AdSlot from './AdSlot';

export default function StickyAdBar() {
  const [closed, setClosed] = useState(false);
  if (closed) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-bg/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider text-muted shrink-0">Ad</span>
        <div className="flex-1 min-h-[60px]">
          <AdSlot slot="sticky-bottom" label="" />
        </div>
        <button
          onClick={() => setClosed(true)}
          className="text-muted hover:text-white text-lg leading-none px-2"
          aria-label="Close ad"
        >
          ×
        </button>
      </div>
    </div>
  );
}
