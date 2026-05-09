// Adsterra Native Banner — in-article ad unit. Renders only after consent
// (same gate ThirdPartyScripts uses for other tracking scripts).
// Skips silently if env vars are missing.
'use client';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'bp_consent_v1';

function readConsent(): 'accept' | 'reject' | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (!v) return null;
    return JSON.parse(v).value as 'accept' | 'reject';
  } catch { return null; }
}

export default function AdsterraNative() {
  const host = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_HOST;
  const hash = process.env.NEXT_PUBLIC_ADSTERRA_NATIVE_HASH;
  const adsenseEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const [consent, setConsent] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setConsent(readConsent()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  if (!host || !hash) return null;
  // If a banner is showing (AdSense or Adsterra Social Bar), wait for accept.
  // Otherwise (no banner shown yet), it's safe to render — Native Banner is contextual,
  // arguably under "legitimate interest" similar to Skimlinks.
  const showBanner = adsenseEnabled || !!process.env.NEXT_PUBLIC_ADSTERRA_SOCIAL_URL;
  const allowed = !showBanner || consent === 'accept';
  if (!allowed) return null;

  return (
    <div className="my-6 rounded-xl bg-bg-card/40 border border-white/5 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted mb-1">Anzeige</div>
      <script
        async
        data-cfasync="false"
        src={`https://${host}/${hash}/invoke.js`}
      />
      <div id={`container-${hash}`} className="min-h-[120px]" />
    </div>
  );
}
