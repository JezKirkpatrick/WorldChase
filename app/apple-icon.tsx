import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0B1628',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '24px',
        }}
      >
        <div
          style={{
            color: '#F2B143',
            fontSize: 96,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-4px',
          }}
        >
          WC
        </div>
      </div>
    ),
    { ...size }
  )
}
