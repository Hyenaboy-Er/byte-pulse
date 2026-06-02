// Breadcrumb navigation + BreadcrumbList JSON-LD.
//
// Required by AdSense audit (PDF 02.06.2026): "Breadcrumbs or footer nav
// exists". Google also surfaces the BreadcrumbList markup in search snippets
// (replaces the URL with breadcrumbs in result rows), so this gives both
// the structural-SEO check AND a SERP visibility boost.

import Link from 'next/link';
import { SITE } from '@/lib/site';

export interface BreadcrumbItem {
  label: string;
  href?: string; // omitted for the current page (last item)
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;

  // BreadcrumbList JSON-LD per schema.org
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: it.label,
      ...(it.href ? { item: `${SITE.url}${it.href}` } : {}),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
      />
      <nav
        aria-label="Breadcrumb"
        className="text-xs text-muted flex flex-wrap items-center gap-1.5"
      >
        <ol className="flex flex-wrap items-center gap-1.5" itemScope itemType="https://schema.org/BreadcrumbList">
          {items.map((it, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <li
                key={`${it.label}-${idx}`}
                className="flex items-center gap-1.5"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {idx > 0 && <span aria-hidden="true" className="text-white/30">›</span>}
                {isLast || !it.href ? (
                  <span
                    className="text-white/70 truncate max-w-[14rem] sm:max-w-xs"
                    aria-current="page"
                    itemProp="name"
                  >
                    {it.label}
                  </span>
                ) : (
                  <Link
                    href={it.href}
                    className="hover:text-accent transition"
                    itemProp="item"
                  >
                    <span itemProp="name">{it.label}</span>
                  </Link>
                )}
                <meta itemProp="position" content={`${idx + 1}`} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
