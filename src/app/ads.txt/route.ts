// AdSense ads.txt — Google requires this file to be served at /ads.txt with a
// specific line declaring the publisher relationship. Until the operator gets
// an AdSense client ID, we serve an empty-but-valid response so the URL exists
// (404 looks broken to AdSense crawlers; 200-with-comment looks intentional).
//
// Once NEXT_PUBLIC_ADSENSE_CLIENT is set in Vercel (format: ca-pub-XXXXXXXXX),
// this route auto-generates the correct Google AdSense line.

export const dynamic = 'force-dynamic';

export async function GET() {
  // 2026-06-06: Publisher-ID hardgecoded nach AdSense-Submission. Env-Var
  // bleibt als Override falls später nötig. Vorher war Placeholder aktiv —
  // jetzt mit echter ID damit Google die DIRECT-Berechtigung sehen kann.
  const envClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.replace(/^ca-/, '');
  const client = envClient || 'pub-7174734517406918';

  let body: string;
  if (/^pub-\d{12,20}$/.test(client)) {
    // The canonical AdSense ads.txt format:
    //   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
    body = `google.com, ${client}, DIRECT, f08c47fec0942fa0\n`;
  } else {
    body = '# ads.txt — placeholder until NEXT_PUBLIC_ADSENSE_CLIENT is set.\n' +
      '# Format will become: google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n';
  }

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 's-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
