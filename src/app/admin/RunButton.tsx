'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RunButton({ apiKeySet }: { apiKeySet: boolean }) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<any>(null);
  const router = useRouter();

  async function go() {
    if (running) return;
    setRunning(true);
    setReport(null);
    try {
      const res = await fetch('/api/admin/run', { method: 'POST' });
      const data = await res.json();
      setReport(data.report ?? data);
      router.refresh();
    } catch (e) {
      setReport({ error: (e as Error).message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={go}
        disabled={running || !apiKeySet}
        className="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {running ? 'Running …' : '▶ Run agents now'}
      </button>
      {report && (
        <pre className="max-w-md text-xs bg-bg-elevated border border-white/10 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
          {JSON.stringify(report, null, 2)}
        </pre>
      )}
    </div>
  );
}
