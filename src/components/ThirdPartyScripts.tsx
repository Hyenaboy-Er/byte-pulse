// Loads third-party scripts (Skimlinks, Infolinks, OneSignal, Brave-creators
// monetization) AFTER user consent. Reads consent from the same localStorage
// key the CookieBanner writes (bp_consent_v1 = { value: 'accept' | 'reject' }).
//
// Pay-per-click monetization layer (user explicitly asked for sources that
// pay even WITHOUT a purchase, so we don't have to wait for AdSense or
// Amazon-buys to see first money on account):
//
// 1. Infolinks — in-text contextual ads. Pays CPM €0.30-1.50. Accepts new
//    sites with zero traffic minimum. Token: NEXT_PUBLIC_INFOLINKS_PID
//    (publisher id) + NEXT_PUBLIC_INFOLINKS_WSID (website id).
// 2. Skimlinks — auto-converts brand mentions to affiliate links. Pays per
//    click-through to retailer + commission on purchase. No minimum.
//    Token: NEXT_PUBLIC_SKIMLINKS_ID.
// 3. Brave Rewards Creator — passive BAT income from Brave-browser users
//    visiting the site. Verified via <meta> tag with the creator ID.
//    Token: NEXT_PUBLIC_BRAVE_CREATOR_ID (set as the verified ID, e.g.
//    'byte-pulse.net' once verified at creators.brave.com).
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
  const infolinksPid = process.env.NEXT_PUBLIC_INFOLINKS_PID;
  const infolinksWsid = process.env.NEXT_PUBLIC_INFOLINKS_WSID;
  // Show consent banner whenever ANY ad/tracking network is configured.
  const trackingActive = adsenseEnabled || !!oneSignalId || !!infolinksPid;
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
  // Infolinks: in-text contextual ads. Consent required because it sets a cookie
  // for frequency capping. Loads ALL Infolinks variants the user enabled.
  const loadInfolinks = !!infolinksPid && !!infolinksWsid && consent === 'accept';

  return (
    <>
      {loadSkim && (
        <script async src={`https://s.skimresources.com/js/${skimId}.skimlinks.js`} />
      )}
      {loadInfolinks && (
        <>
          <script
            dangerouslySetInnerHTML={{
              __html: `var infolinks_pid = ${JSON.stringify(infolinksPid)}; var infolinks_wsid = ${JSON.stringify(infolinksWsid)};`,
            }}
          />
          <script async src="//resources.infolinks.com/js/infolinks_main.js" />
        </>
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
