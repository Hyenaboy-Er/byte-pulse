'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORIES } from '@/lib/categories';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';

export default function Footer() {
  const pathname = usePathname() || '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');
  const prefix = isDE ? '/de' : '';
  const t = isDE ? {
    pitch: 'Tech-News, die zählen. Wir scannen die wichtigsten Quellen rund um die Uhr und veröffentlichen nur die Storys, die deine Zeit wert sind.',
    sections: 'Rubriken',
    more: 'Mehr',
    rss: 'RSS',
    about: 'Impressum',
    privacy: 'Datenschutz',
    bottom: (year: number) => `© ${year} ${SITE_NAME}. Betrieben von BRL Vision Solutions, Leverkusen. Quellen sind in jedem Artikel verlinkt.`,
    feedHref: '/de/feed.xml',
  } : {
    pitch: "Tech news that matters. We scan the world's top sources around the clock and publish only the stories worth your time.",
    sections: 'Sections',
    more: 'More',
    rss: 'RSS',
    about: 'About / Impressum',
    privacy: 'Privacy',
    bottom: (year: number) => `© ${year} ${SITE_NAME}. Operated by BRL Vision Solutions, Germany. Sources are linked on every article.`,
    feedHref: '/feed.xml',
  };
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div className="col-span-2">
          <div className="font-display font-extrabold text-lg mb-2">{SITE_NAME}</div>
          <p className="text-muted max-w-md">{t.pitch}</p>
        </div>
        <div>
          <div className="text-white/60 mb-3 uppercase text-xs tracking-wider">{t.sections}</div>
          <ul className="space-y-2">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link href={`${prefix}/category/${c.slug}`} className="hover:text-white text-white/80">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-white/60 mb-3 uppercase text-xs tracking-wider">{t.more}</div>
          <ul className="space-y-2">
            <li><a href={t.feedHref} className="hover:text-white text-white/80">{t.rss}</a></li>
            <li><Link href={`${prefix}/about`} className="hover:text-white text-white/80">{t.about}</Link></li>
            <li><Link href={`${prefix}/privacy`} className="hover:text-white text-white/80">{t.privacy}</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-muted">
        {t.bottom(new Date().getFullYear())}
      </div>
    </footer>
  );
}
