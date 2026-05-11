// Exit-intent newsletter prompt. Fires ONCE per visitor when the mouse cursor
// crosses the top edge of the viewport heading upward — the classic "user is
// about to close the tab or hit the address bar" gesture. Desktop only (touch
// devices don't have a hover surface to detect).
//
// Distinct from NewsletterModal:
//   - NewsletterModal: time/scroll-based, fires on every page (with cooldown)
//   - ExitIntent: cursor-gesture-based, fires AT MOST once ever per visitor
//     (different localStorage key), only on desktop, with a different copy
//     angle ("before you go").
//
// Both feed the same /api/newsletter endpoint.
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const STORAGE_KEY = 'bp_exit_v1';

type Status = 'idle' | 'loading' | 'ok' | 'error';

export default function ExitIntent() {
  const pathname = usePathname() ?? '/';
  const isDE = pathname === '/de' || pathname.startsWith('/de/');
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // One-shot per visitor — once dismissed, never again
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {}
    // Touch / coarse-pointer devices: skip (no mouseleave-toward-top signal)
    if (window.matchMedia('(pointer: coarse)').matches) return;
    // Don't fire on the newsletter page itself
    if (pathname.includes('/newsletter')) return;

    let armed = false;
    // Arm only after the visitor has scrolled at least a screen — otherwise
    // they haven't engaged enough to make the prompt feel earned.
    function onScroll() {
      if (window.scrollY > window.innerHeight * 0.4) {
        armed = true;
        window.removeEventListener('scroll', onScroll);
      }
    }
    function onMouseLeave(e: MouseEvent) {
      if (!armed) return;
      // Mouse leaving via the TOP edge with upward velocity
      if (e.clientY <= 0 && (e.relatedTarget == null)) {
        setShow(true);
        document.removeEventListener('mouseout', onMouseLeave);
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mouseout', onMouseLeave);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mouseout', onMouseLeave);
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
      window.setTimeout(() => setShow(false), 2400);
    } catch (err) {
      setStatus('error');
      setErrMsg((err as Error).message);
    }
  }

  if (!show) return null;

  const t = isDE
    ? {
        eyebrow: 'Bevor du gehst',
        title: 'Eine Mail morgens, du verpasst nichts mehr',
        body: '5 wichtigste Tech-Stories der Nacht — KI, Hardware, Gaming. Kein Spam, jederzeit ab.',
        placeholder: 'deine@email.com',
        submit: 'Ja, schick mir die Stories',
        loading: 'Schicke …',
        success: 'Danke! Check dein Postfach.',
        dismiss: 'Nein danke',
      }
    : {
        eyebrow: 'Before you go',
        title: 'One email each morning, never miss what matters',
        body: 'Top 5 tech stories overnight — AI, hardware, gaming. No spam, unsubscribe anytime.',
        placeholder: 'you@example.com',
        submit: 'Yes, send the stories',
        loading: 'Sending …',
        success: 'Thanks — check your inbox.',
        dismiss: 'No thanks',
      };

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ei-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-bg-elevated border border-white/10 shadow-2xl overflow-hidden">
        <div className="gradient-mesh px-7 pt-7 pb-5">
          <div className="text-xs font-bold uppercase tracking-wider text-accent">{t.eyebrow}</div>
          <h2 id="ei-title" className="mt-1.5 font-display font-extrabold text-2xl md:text-3xl tracking-tight leading-tight">
            {t.title}
          </h2>
        </div>
        <div className="px-7 pb-7">
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
                className="w-full rounded-lg bg-white/5 border border-white/10 focus:border-accent focus:outline-none px-4 py-3 text-base text-white placeholder-white/40"
                autoFocus
              />
              <button
                type="submit"
                disabled={status === 'loading' || !email.trim()}
                className="w-full rounded-lg bg-accent hover:bg-accent-hover disabled:bg-white/10 disabled:text-white/40 transition px-4 py-3 text-base font-semibold"
              >
                {status === 'loading' ? t.loading : t.submit}
              </button>
              {status === 'error' && <p className="text-xs text-red-400">{errMsg}</p>}
              <button
                type="button"
                onClick={dismiss}
                className="block w-full text-center text-xs text-white/40 hover:text-white/60 mt-1"
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
