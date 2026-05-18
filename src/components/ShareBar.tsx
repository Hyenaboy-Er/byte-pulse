// Sticky social-share rail. On desktop it floats on the LEFT edge of the
// article (vertical column with icons). On mobile it collapses into a
// bottom-fixed action row with the same buttons. Copy-link uses the modern
// async Clipboard API and shows a brief "Copied" toast inside the button.
//
// Sharing isn't just vanity — every share is a free backlink + a fresh
// visitor session, which directly drives AdSense impressions.
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/site';

// SITE.url resolves from NEXT_PUBLIC_SITE_URL (inlined into the client
// bundle by Next), falling back to the byte-pulse default — identical
// behaviour to the previous inline read, now single-sourced.
const SITE_URL = SITE.url;

export default function ShareBar({ title }: { title: string }) {
  const pathname = usePathname() ?? '/';
  const isDE = pathname.startsWith('/de/');
  const [absUrl, setAbsUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAbsUrl(window.location.href);
  }, [pathname]);

  const labels = isDE
    ? { x: 'Auf X teilen', linkedin: 'Auf LinkedIn teilen', whatsapp: 'Auf WhatsApp teilen', copy: 'Link kopieren', copied: 'Kopiert' }
    : { x: 'Share on X', linkedin: 'Share on LinkedIn', whatsapp: 'Share on WhatsApp', copy: 'Copy link', copied: 'Copied' };

  const shareUrl = absUrl || `${SITE_URL}${pathname}`;
  const text = encodeURIComponent(title);
  const url = encodeURIComponent(shareUrl);

  const X_URL = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  const LI_URL = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
  const WA_URL = `https://api.whatsapp.com/send?text=${text}%20${url}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const Btn = ({ href, onClick, ariaLabel, children }: { href?: string; onClick?: () => void; ariaLabel: string; children: React.ReactNode }) => {
    const className = 'inline-flex items-center justify-center w-10 h-10 rounded-full bg-bg-card hover:bg-bg-elevated border border-white/10 hover:border-accent/50 text-white/80 hover:text-white transition';
    if (href) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={ariaLabel} className={className}>
          {children}
        </a>
      );
    }
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={className}>
        {children}
      </button>
    );
  };

  return (
    <>
      {/* Desktop: vertical rail on the left of the article body */}
      <div className="hidden xl:flex fixed left-[max(1rem,calc(50%-31rem))] top-1/3 z-30 flex-col gap-2">
        <Btn href={X_URL} ariaLabel={labels.x}><XIcon /></Btn>
        <Btn href={LI_URL} ariaLabel={labels.linkedin}><LinkedInIcon /></Btn>
        <Btn href={WA_URL} ariaLabel={labels.whatsapp}><WhatsAppIcon /></Btn>
        <Btn onClick={copy} ariaLabel={copied ? labels.copied : labels.copy}>
          {copied ? <CheckIcon /> : <LinkIcon />}
        </Btn>
      </div>

      {/* Mobile: horizontal bottom-fixed bar, hidden when cookie banner is open is fine since it's also bottom-fixed but with z-50 priority */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/5 bg-bg/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-around">
          <Btn href={X_URL} ariaLabel={labels.x}><XIcon /></Btn>
          <Btn href={LI_URL} ariaLabel={labels.linkedin}><LinkedInIcon /></Btn>
          <Btn href={WA_URL} ariaLabel={labels.whatsapp}><WhatsAppIcon /></Btn>
          <Btn onClick={copy} ariaLabel={copied ? labels.copied : labels.copy}>
            {copied ? <CheckIcon /> : <LinkIcon />}
          </Btn>
        </div>
      </div>
    </>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 18V10h-2.5v8zm-1.25-9.27a1.49 1.49 0 1 0 0-2.98 1.49 1.49 0 0 0 0 2.98zM18 18v-4.46c0-2.39-1.28-3.5-3-3.5-1.4 0-2.02.78-2.36 1.32V10H10v8h2.6v-4.32c0-1.13.21-2.23 1.62-2.23 1.39 0 1.4 1.3 1.4 2.31V18z" />
    </svg>
  );
}
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.71.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.892c0 2.096.549 4.142 1.595 5.945L0 24l6.335-1.652a11.882 11.882 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
