'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';
import LangSwitcher from './LangSwitcher';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';

export default function Header() {
  const pathname = usePathname() || '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');
  const prefix = isDE ? '/de' : '';
  const home = isDE ? '/de' : '/';
  const newsletterLabel = isDE ? 'Newsletter' : 'Newsletter';

  return (
    <header className="sticky top-0 z-40 backdrop-blur bg-bg/80 border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href={home} className="flex items-center gap-2 group">
            <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-accent live-dot" />
            <span className="font-display font-extrabold tracking-tight text-xl">
              {SITE_NAME}
            </span>
            <span className="hidden sm:inline text-xs text-muted ml-2">LIVE</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {CATEGORIES.slice(0, 6).map((c) => (
              <Link
                key={c.slug}
                href={`${prefix}/category/${c.slug}`}
                className="px-3 py-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition"
              >
                {c.name}
              </Link>
            ))}
            <Link
              href="/search"
              className="px-3 py-1.5 rounded-full hover:bg-white/5 text-white/80 hover:text-white transition"
              aria-label={isDE ? 'Suche' : 'Search'}
            >🔎</Link>
            <LangSwitcher />
            <Link
              href="/newsletter"
              className="ml-1 px-4 py-1.5 rounded-full bg-accent hover:bg-accent-hover text-white font-semibold transition"
            >
              {newsletterLabel}
            </Link>
          </nav>
        </div>
        <div className="md:hidden -mt-2 pb-2 -mx-4 px-4 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <LangSwitcher />
          <div className="flex gap-1 whitespace-nowrap text-sm">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`${prefix}/category/${c.slug}`}
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
