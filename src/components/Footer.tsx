'use client';
import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Byte-Pulse';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 mt-20">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-sm">
        <div className="col-span-2">
          <div className="font-display font-extrabold text-lg mb-2">{SITE_NAME}</div>
          <p className="text-muted max-w-md mb-4">
            Tech news that matters. We scan the world&apos;s top sources around the clock and
            publish only the stories worth your time.
          </p>
          <div className="text-white/60 mb-2 uppercase text-xs tracking-wider">Follow</div>
          <div className="flex flex-wrap gap-2">
            <a href="https://bsky.app/profile/byte-pulse.bsky.social"
              target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-xs">
              Bluesky
            </a>
            <a href="https://www.tiktok.com/@bytepulse.net"
              target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-xs">
              TikTok
            </a>
            <a href="https://www.youtube.com/@Byte-PulseNet"
              target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-xs">
              YouTube
            </a>
            <a href="/feed.xml"
              className="px-3 py-1.5 rounded-full border border-white/10 hover:border-white/30 hover:bg-white/5 text-xs">
              RSS
            </a>
          </div>
        </div>
        <div>
          <div className="text-white/60 mb-3 uppercase text-xs tracking-wider">Sections</div>
          <ul className="space-y-2">
            {CATEGORIES.slice(0, 5).map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}`} className="hover:text-white text-white/80">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-white/60 mb-3 uppercase text-xs tracking-wider">More</div>
          <ul className="space-y-2">
            <li><a href="/feed.xml" className="hover:text-white text-white/80">RSS</a></li>
            <li><Link href="/authors" className="hover:text-white text-white/80">Editorial Team</Link></li>
            <li><Link href="/tags" className="hover:text-white text-white/80">Topics</Link></li>
            <li><Link href="/about" className="hover:text-white text-white/80">About</Link></li>
            <li><Link href="/contact" className="hover:text-white text-white/80">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-white/60 mb-3 uppercase text-xs tracking-wider">Legal</div>
          <ul className="space-y-2">
            <li><Link href="/impressum" className="hover:text-white text-white/80">Impressum</Link></li>
            <li><Link href="/privacy" className="hover:text-white text-white/80">Privacy Policy</Link></li>
            <li><Link href="/editorial-policy" className="hover:text-white text-white/80">Editorial Policy</Link></li>
            <li><Link href="/corrections" className="hover:text-white text-white/80">Corrections</Link></li>
            <li><Link href="/affiliate-disclosure" className="hover:text-white text-white/80">Affiliate Disclosure</Link></li>
            <li><Link href="/disclaimer" className="hover:text-white text-white/80">Disclaimer</Link></li>
            <li><Link href="/sitemap-html" className="hover:text-white text-white/80">Sitemap</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} {SITE_NAME}. Operated by BRL Vision Solutions, Germany. Sources are linked on every article.
      </div>
    </footer>
  );
}
