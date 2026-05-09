// Loads third-party scripts (Skimlinks, OneSignal) AFTER user consent.
// Reads consent from the same localStorage key the CookieBanner writes
// (bp_consent_v1 = { value: 'accept' | 'reject' }). When AdSense isn't
// configured we have no banner — in that case we still load Skimlinks
// (it's affiliate, not tracking) but defer OneSignal which uses cookies.
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
  const [consent, setConsent] = useState<'accept' | 'reject' | null>(null);

  useEffect(() => {
    setConsent(readConsent());
    // Re-read on storage events so this responds to other tabs / consent changes.
    const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) setConsent(readConsent()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Skimlinks affiliate loader. Skimlinks itself is affiliate routing — it sets
  // a cookie to attribute clicks. So we gate it the same way as OneSignal:
  // if AdSense is on (= banner shown), wait for accept; else just load.
  const loadSkim = !!skimId && (!adsenseEnabled || consent === 'accept');
  // OneSignal sets cookies + service worker — always require consent if AdSense on.
  const loadOneSignal = !!oneSignalId && (!adsenseEnabled || consent === 'accept');

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
