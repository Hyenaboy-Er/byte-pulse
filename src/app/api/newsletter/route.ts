// Newsletter subscription endpoint — currently paused until a proper sending
// domain (Resend / Google Workspace) is connected. User is providing the
// business email tomorrow; once configured this endpoint goes back to the
// full double-opt-in flow saved in git history (revision 9b658df).
//
// While paused: return 200 with a polite 'coming soon' so any visitor who
// already typed their email isn't met with a hard error. We do NOT store
// the email — without a working confirm-mailer that would be a GDPR issue
// (you can't store contact data for a service you can't deliver).
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({
    ok: false,
    error: 'Newsletter is being set up — coming back tomorrow. Subscribe to the RSS feed at /feed.xml in the meantime.',
  }, { status: 503 });
}
