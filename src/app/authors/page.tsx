// Authors index — lists the editorial team. Google E-E-A-T looks for a
// 'meet the team' surface beyond individual author pages. This is it.

import Link from 'next/link';
import { AUTHORS } from '@/lib/authors';

export const metadata = {
  title: 'Editorial Team',
  description: 'Meet the Byte-Pulse editorial team — bylines, expertise, contact.',
  alternates: { canonical: '/authors' },
};

export default function AuthorsIndex() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-display font-extrabold tracking-tight mb-3">Editorial Team</h1>
      <p className="text-white/70 text-lg mb-10 max-w-2xl">
        The bylines behind Byte-Pulse. Every article is signed by the editor responsible for its
        accuracy and tone. Read our <Link href="/editorial-policy" className="text-accent hover:underline">editorial policy</Link>{' '}
        for how the team works.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {AUTHORS.map((a) => (
          <Link
            key={a.slug}
            href={`/author/${a.slug}`}
            className="group block rounded-2xl bg-bg-card border border-white/5 p-6 hover:border-accent/40 transition"
          >
            {/* Gradient placeholder avatar — initials over a unique color per author */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-display font-extrabold text-white mb-4"
              style={{
                background:
                  a.slug === 'serhat-kalender' ? 'linear-gradient(135deg, #ff3366 0%, #8b1538 100%)' :
                  a.slug === 'leah-becker' ? 'linear-gradient(135deg, #6366f1 0%, #1e1b4b 100%)' :
                  'linear-gradient(135deg, #10b981 0%, #064e3b 100%)',
              }}
              aria-hidden
            >
              {a.name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()}
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-accent mb-1">{a.role}</div>
            <div className="font-display font-extrabold text-xl mb-2 group-hover:text-accent transition">{a.name}</div>
            <p className="text-sm text-white/70 line-clamp-3">{a.bioEn}</p>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {a.expertise.slice(0, 3).map((e) => (
                <span key={e} className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[11px] font-medium text-accent">
                  {e}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
