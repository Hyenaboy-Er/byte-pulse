// Loads third-party scripts (Skimlinks, OneSignal) AFTER user consent. Reads
// consent from the same localStorage key the CookieBanner writes
// (bp_consent_v1 = { value: 'accept' | 'reject' }).
//
// Adsterra Social Bar was removed entirely (was an aggressive popunder, hurt
// UX + Lighthouse). Adsterra Native Banner (in-article, contextual) is loaded
// by src/components/AdsterraNative.tsx on per-article pages.
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

export default function ThirdPartyScripts() {
  const skimId = process.env.NEXT_PUBLIC_SKIMLINKS_ID;
  const oneSignalId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const adsenseEnabled = !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  // Show consent banner whenever ANY ad/tracking network is configured.
  const trackingActive = adsenseEnabled || !!oneSignalId;
  const [consent, setConsent] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setConsent(readConsent()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Skimlinks: affiliate routing, lower bar (legitimate interest). Load when no
  // tracking gate is active OR when the user accepted.
  const loadSkim = !!skimId && (!trackingActive || consent === 'accept');
  // OneSignal: web push uses a Service Worker + a subscription cookie → consent required.
  const loadOneSignal = !!oneSignalId && (!trackingActive || consent === 'accept');

  return (
    <>
      {loadSkim && (
        <script async src={`https://s.skimresources.com/js/${skimId}.skimlinks.js`} />
      )}
      {loadOneSignal && (
        <>
          <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer />
          <script
            dangerouslySetInnerHTML={{
              __html: `
                window.OneSignalDeferred = window.OneSignalDeferred || [];
                OneSignalDeferred.push(async function(OneSignal) {
                  await OneSignal.init({
                    appId: ${JSON.stringify(oneSignalId)},
                    allowLocalhostAsSecureOrigin: false,
                    notifyButton: { enable: true, position: 'bottom-right', size: 'small' },
                  });
                });
              `,
            }}
          />
        </>
      )}
    </>
  );
}
