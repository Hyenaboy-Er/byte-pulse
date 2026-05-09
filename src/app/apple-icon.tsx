import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          borderRadius: 36,
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            color: '#ff3366',
            fontSize: 110,
            fontWeight: 900,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            lineHeight: 1,
          }}
        >
          B
        </div>
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 30,
            right: 30,
            width: 22,
            height: 22,
            borderRadius: 11,
            background: '#ff3366',
          }}
        />
      </div>
    ),
    size,
  );
}
