import { ImageResponse } from 'next/og';

export const alt = 'Byte-Pulse — bilingual tech news magazine';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 70,
          background: '#0a0a0f',
          backgroundImage:
            'radial-gradient(circle at 25% 0%, rgba(255,51,102,0.25) 0%, transparent 55%), radial-gradient(circle at 80% 90%, rgba(168,85,247,0.18) 0%, transparent 55%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              width: 22,
              height: 22,
              borderRadius: 11,
              background: '#ff3366',
            }}
          />
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 900 }}>Byte-Pulse</div>
          <div
            style={{
              display: 'flex',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 4,
              color: '#7a7a8c',
              marginLeft: 8,
            }}
          >
            LIVE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', fontSize: 86, fontWeight: 900, lineHeight: 1, color: '#ffffff' }}>
            Tech, gaming, AI —
          </div>
          <div style={{ display: 'flex', fontSize: 86, fontWeight: 900, lineHeight: 1, color: '#ff3366' }}>
            what matters now.
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#a8a8b8', marginTop: 8 }}>
            Updated every 30 min · Bilingual EN + DE
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 22,
            color: '#7a7a8c',
          }}
        >
          <div style={{ display: 'flex' }}>byte-pulse.net</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex' }}>AI</div>
            <div style={{ display: 'flex' }}>Gaming</div>
            <div style={{ display: 'flex' }}>Hardware</div>
            <div style={{ display: 'flex' }}>Security</div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
