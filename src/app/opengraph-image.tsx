import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Byte-Pulse — fully automated bilingual tech magazine';
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
          padding: '70px',
          background: '#0a0a0f',
          backgroundImage:
            'radial-gradient(circle at 25% 0%, rgba(255,51,102,0.25) 0%, transparent 55%), radial-gradient(circle at 80% 90%, rgba(168,85,247,0.18) 0%, transparent 55%)',
          color: '#fff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#ff3366',
              boxShadow: '0 0 30px rgba(255,51,102,0.6)',
            }}
          />
          <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.02em' }}>Byte-Pulse</div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#7a7a8c',
              marginLeft: 8,
            }}
          >
            LIVE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 900,
              letterSpacing: '-0.035em',
              lineHeight: 1.0,
              maxWidth: 1000,
            }}
          >
            Tech, gaming, AI —
            <br />
            <span style={{ color: '#ff3366' }}>what matters now.</span>
          </div>
          <div style={{ fontSize: 28, color: '#a8a8b8', maxWidth: 900 }}>
            7 KI-Agenten · 96 Artikel/Tag · EN + DE
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
          <span>byte-pulse.net</span>
          <span style={{ display: 'flex', gap: 24 }}>
            <span>🤖 AI</span>
            <span>🎮 Gaming</span>
            <span>⚙️ Hardware</span>
            <span>🛡️ Security</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
