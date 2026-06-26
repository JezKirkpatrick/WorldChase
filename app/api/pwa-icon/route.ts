import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: '#0B1628',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '80px',
        }}
      >
        <div
          style={{
            color: '#F2B143',
            fontSize: 280,
            fontWeight: 900,
            fontFamily: 'sans-serif',
            letterSpacing: '-10px',
          }}
        >
          WC
        </div>
      </div>
    ),
    { width: 512, height: 512 }
  )
}
