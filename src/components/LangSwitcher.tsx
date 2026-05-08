'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LangSwitcher() {
  const pathname = usePathname() || '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');

  // Mirror path between EN and DE trees
  const enHref = isDE ? (pathname === '/de' ? '/' : pathname.replace(/^\/de/, '')) : pathname;
  const deHref = isDE ? pathname : (pathname === '/' ? '/de' : `/de${pathname}`);

  const cls = (active: boolean) =>
    `px-2 py-1 rounded text-xs font-bold tracking-wider transition ${
      active ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
    }`;

  return (
    <div className="flex items-center gap-0.5 ml-2 rounded-md border border-white/10 p-0.5">
      <Link href={enHref} className={cls(!isDE)} hrefLang="en" prefetch={false}>EN</Link>
      <Link href={deHref} className={cls(isDE)} hrefLang="de" prefetch={false}>DE</Link>
    </div>
  );
}
