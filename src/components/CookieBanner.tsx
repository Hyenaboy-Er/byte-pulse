'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'bp_consent_v1';

export default function CookieBanner() {
  const pathname = usePathname() || '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');
  const [show, setShow] = useState(false);

  // Always render the consent banner on first visit.
  //
  // We previously gated this on "tracking is configured" — but the AdSense
  // pre-approval audit (and Google's CMP requirement for EU traffic) needs
  // a visible consent mechanism present BEFORE ads are approved, not after.
  // Showing it always also future-proofs: the moment AdSense env vars get
  // set, consent state is already collected from prior visitors.
  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (!v) setShow(true);
    } catch {
      // localStorage might be blocked; show banner anyway
      setShow(true);
    }
  }, []);

  if (!show) return null;

  function decide(value: 'accept' | 'reject') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, t: Date.now() }));
    } catch {}
    // Tell Google AdSense about the consent state
    if (typeof window !== 'undefined') {
      const w = window as unknown as {
        adsbygoogle?: unknown[];
        gtag?: (...args: unknown[]) => void;
      };
      try {
        w.gtag?.('consent', 'update', {
          ad_storage: value === 'accept' ? 'granted' : 'denied',
          ad_user_data: value === 'accept' ? 'granted' : 'denied',
          ad_personalization: value === 'accept' ? 'granted' : 'denied',
          analytics_storage: value === 'accept' ? 'granted' : 'denied',
        });
      } catch {}
    }
    setShow(false);
  }

  const t = isDE
    ? {
        title: 'Cookies & Werbung',
        body: 'Wir finanzieren die Seite über Werbeanzeigen (Google AdSense u.a.) und nutzen Analytics, um zu sehen, was gut funktioniert. Beides kann Cookies setzen. Du entscheidest, was OK ist — deine Wahl bleibt gespeichert.',
        accept: 'Akzeptieren',
        reject: 'Nur Essentielle',
        more: 'Details in der',
        privacy: 'Datenschutzerklärung',
        privacyHref: '/de/privacy',
      }
    : {
        title: 'Cookies & ads',
        body: 'We fund this site through ads (Google AdSense and others) and use analytics to see what works. Both may set cookies. You decide what is OK — your choice is remembered.',
        accept: 'Accept',
        reject: 'Essential only',
        more: 'Details in our',
        privacy: 'Privacy Policy',
        privacyHref: '/privacy',
      };

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-auto sm:right-6 sm:max-w-sm z-50 rounded-xl bg-bg-elevated border border-white/10 shadow-2xl p-4 backdrop-blur">
      <div className="font-display font-extrabold text-base mb-1">{t.title}</div>
      <p className="text-sm text-white/70 mb-3">{t.body}</p>
      <p className="text-xs text-muted mb-3">
        {t.more} <a href={t.privacyHref} className="text-accent hover:underline">{t.privacy}</a>.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => decide('reject')}
          className="flex-1 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium"
        >
          {t.reject}
        </button>
        <button
          onClick={() => decide('accept')}
          className="flex-1 px-3 py-2 rounded-lg bg-accent hover:bg-accent-hover text-sm font-semibold"
        >
          {t.accept}
        </button>
      </div>
    </div>
  );
}
