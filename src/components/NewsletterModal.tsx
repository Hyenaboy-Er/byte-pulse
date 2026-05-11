// Lightweight email-capture modal. Triggers on EITHER 30s dwell time OR 50%
// page scroll, whichever comes first. Dismissed state persists in localStorage
// (bp_nl_v1) for 7 days so visitors don't get nagged.
//
// Posts to /api/newsletter — same endpoint the footer form uses, so backend
// validation + Resend send-flow stays unified.
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'bp_nl_v1';
const COOLDOWN_DAYS = 7;
const TRIGGER_SECONDS = 30;
const TRIGGER_SCROLL_PCT = 50;

type Status = 'idle' | 'loading' | 'ok' | 'error';

export default function NewsletterModal() {
  const pathname = usePathname() ?? '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Respect 7-day cooldown after dismissal/success
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const { t } = JSON.parse(raw) as { t: number };
        if (Date.now() - t < COOLDOWN_DAYS * 24 * 3600 * 1000) return;
      }
    } catch {}

    // Don't pop on the /newsletter page itself
    if (pathname.includes('/newsletter')) return;

    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      setShow(true);
      window.removeEventListener('scroll', onScroll);
      if (timerId) window.clearTimeout(timerId);
    };

    const onScroll = () => {
      const doc = document.documentElement;
      const pct = (doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight)) * 100;
      if (pct >= TRIGGER_SCROLL_PCT) fire();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const timerId = window.setTimeout(fire, TRIGGER_SECONDS * 1000);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(timerId);
    };
  }, [pathname]);

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now(), state: 'dismissed' })); } catch {}
    setShow(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');
    setErrMsg('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setStatus('ok');
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ t: Date.now(), state: 'subscribed' })); } catch {}
      window.setTimeout(() => setShow(false), 2500);
    } catch (err) {
      setStatus('error');
      setErrMsg((err as Error).message);
    }
  }

  if (!show) return null;

  const t = isDE
    ? {
        eyebrow: 'Tech-News täglich',
        title: 'Verpass keinen großen Tech-Drop',
        body: 'Wir senden dir morgens die 5 wichtigsten Stories der Nacht — KI, Hardware, Gaming, EV. Kein Spam, jederzeit abbestellbar.',
        placeholder: 'deine@email.com',
        submit: 'Abonnieren',
        loading: 'Schicke …',
        success: 'Danke! Schau in dein Postfach.',
        dismiss: 'Vielleicht später',
      }
    : {
        eyebrow: 'Daily tech briefing',
        title: 'Never miss a big tech drop',
        body: 'We email you the 5 most important stories of the night every morning — AI, hardware, gaming, EV. No spam, unsubscribe anytime.',
        placeholder: 'you@example.com',
        submit: 'Subscribe',
        loading: 'Sending …',
        success: 'Thanks — check your inbox.',
        dismiss: 'Maybe later',
      };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="nl-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-bg-elevated border border-white/10 shadow-2xl overflow-hidden">
        <div className="gradient-mesh px-6 pt-6 pb-4">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">{t.eyebrow}</div>
          <h2 id="nl-title" className="mt-1 font-display font-extrabold text-2xl tracking-tight leading-tight">
            {t.title}
          </h2>
        </div>
        <div className="px-6 pb-6">
          <p className="mt-3 text-sm text-white/75 leading-relaxed">{t.body}</p>
          {status === 'ok' ? (
            <div className="mt-5 text-center text-green-400 font-medium">{t.success}</div>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input
                type="email"
                required
                placeholder={t.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'loading'}
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none px-4 py-2.5 text-sm text-white placeholder-white/40"
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="w-full rounded-lg bg-accent hover:bg-accent-hover disabled:bg-white/10 disabled:text-white/40 transition px-4 py-2.5 text-sm font-semibold"
              >
                {status === 'loading' ? t.loading : t.submit}
              </button>
              {status === 'error' && <p className="text-xs text-red-400">{errMsg}</p>}
              <button
                type="button"
                onClick={dismiss}
                className="block w-full text-center text-xs text-white/50 hover:text-white/70 mt-1"
              >
                {t.dismiss}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
