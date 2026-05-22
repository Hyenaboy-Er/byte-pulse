'use client';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-bg/80 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-accent live-dot" />
            <span className="font-display font-extrabold tracking-tight text-xl">
              {SITE_NAME}
            </span>
            <span className="hidden sm:inline-flex items-center text-[10px] font-bold uppercase tracking-widest text-accent border border-accent/40 rounded px-1.5 py-0.5 leading-none">
              Live
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {CATEGORIES.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="px-3 py-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/saved"
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition"
              aria-label="Saved"
              title="Saved"
            >♡</Link>
            <Link
              href="/search"
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition"
              aria-label="Search"
            >🔎</Link>
          </nav>
        </div>
        <div className="md:hidden -mt-2 pb-2 -mx-4 px-4 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <div className="flex gap-1 whitespace-nowrap text-sm">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/category/${c.slug}`}
                className="px-3 py-1 rounded-full bg-white/5 text-white/80"
              >
                {c.emoji} {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
