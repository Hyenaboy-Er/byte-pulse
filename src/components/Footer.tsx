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
    pitch: 'Vollautomatisches Tech-Magazin. Sieben KI-Agenten scannen die wichtigsten Quellen rund um die Uhr und veröffentlichen nur die Storys die deine Zeit wert sind.',
    sections: 'Rubriken',
    more: 'Mehr',
    rss: 'RSS',
    about: 'Über uns',
    privacy: 'Datenschutz',
    newsletter: 'Newsletter',
    bottom: (year: number) => `© ${year} ${SITE_NAME}. Artikel werden von KI-Agenten mit Pflicht-Faktencheck erstellt. Quellen sind in jedem Artikel verlinkt.`,
    feedHref: '/de/feed.xml',
  } : {
    pitch: "Fully automated tech magazine. Seven AI agents scan the world's top sources 24/7 and publish only the stories worth your time.",
    sections: 'Sections',
    more: 'More',
    rss: 'RSS',
    about: 'About',
    privacy: 'Privacy',
    newsletter: 'Newsletter',
    bottom: (year: number) => `© ${year} ${SITE_NAME}. Articles are produced by AI editors with mandatory fact-checking. Sources are linked on every article.`,
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
            <li><Link href={`${prefix}/newsletter`} className="hover:text-white text-white/80">{t.newsletter}</Link></li>
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
