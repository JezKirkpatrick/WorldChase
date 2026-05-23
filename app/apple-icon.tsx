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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {/* Globe ring */}
        <div
          style={{
            width: 90,
            height: 90,
            borderRadius: '50%',
            border: '6px solid #F2B143',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div style={{ color: '#F2B143', fontSize: 38, fontWeight: 900, fontFamily: 'sans-serif' }}>W</div>
        </div>
        <div style={{ color: '#F2B143', fontSize: 22, fontWeight: 700, fontFamily: 'sans-serif', letterSpacing: 4 }}>
          CHASE
        </div>
      </div>
    ),
    { ...size }
  )
}
