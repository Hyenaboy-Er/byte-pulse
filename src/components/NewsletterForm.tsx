'use client';
import { useState } from 'react';

export default function NewsletterForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('loading');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setState('ok');
        setMsg(data.message ?? "You're on the list.");
        setEmail('');
      } else {
        setState('err');
        setMsg(data.error ?? 'Something went wrong.');
      }
    } catch {
      setState('err');
      setMsg('Network error.');
    }
  }

  return (
    <form onSubmit={submit} className={compact ? 'flex gap-2' : 'flex flex-col sm:flex-row gap-2'}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="flex-1 px-4 py-3 rounded-lg bg-bg-elevated border border-white/10 focus:border-accent outline-none"
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        className="px-5 py-3 rounded-lg bg-accent hover:bg-accent-hover font-semibold disabled:opacity-60"
      >
        {state === 'loading' ? '…' : 'Subscribe'}
      </button>
      {msg && (
        <div className={`sm:basis-full text-sm ${state === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
          {msg}
        </div>
      )}
    </form>
  );
}
