export default function AdSlot({ slot, label = 'Ad' }: { slot: string; label?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) {
    return (
      <div className="my-6 rounded-xl border border-dashed border-white/10 bg-bg-card/50 px-4 py-8 text-center text-xs text-muted">
        {label} · AdSense slot „{slot}" (visible once NEXT_PUBLIC_ADSENSE_CLIENT is set)
      </div>
    );
  }
  return (
    <div className="my-6 rounded-xl bg-bg-card/50 px-2 py-2">
      <div className="text-[10px] uppercase text-muted tracking-wider mb-1">{label}</div>
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
      <script dangerouslySetInnerHTML={{ __html: '(adsbygoogle = window.adsbygoogle || []).push({});' }} />
    </div>
  );
}
