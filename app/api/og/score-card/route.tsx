import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const location = searchParams.get('location') ?? 'Unknown Location'
  const score    = Number(searchParams.get('score') ?? 0)
  const time     = searchParams.get('time') ?? '—'
  const rank     = searchParams.get('rank') ?? '—'
  const country  = searchParams.get('country') ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0B1628 0%, #0f1d3a 50%, #0B1628 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(#00d4ff 1px, transparent 1px), linear-gradient(90deg, #00d4ff 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          display: 'flex',
        }} />

        {/* Corner glow */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'rgba(245,197,24,0.08)',
          filter: 'blur(60px)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 300, height: 300,
          borderRadius: '50%',
          background: 'rgba(0,212,255,0.06)',
          filter: 'blur(60px)',
          display: 'flex',
        }} />

        {/* Top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent, #f5c518, #00d4ff, transparent)',
          display: 'flex',
        }} />

        {/* Logo */}
        <div style={{
          fontSize: 18, fontWeight: 700, color: '#f5c518',
          letterSpacing: '0.3em', marginBottom: 24,
          opacity: 0.8, display: 'flex',
        }}>
          ≡ WORLD CHASE
        </div>

        {/* Location */}
        <div style={{
          fontSize: 64, fontWeight: 800, color: '#ffffff',
          textAlign: 'center', marginBottom: 8,
          maxWidth: 900, lineHeight: 1.1,
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
        }}>
          {location}
        </div>

        {country && (
          <div style={{
            fontSize: 20, color: '#7a7a9a', letterSpacing: '0.2em',
            marginBottom: 40, display: 'flex',
          }}>
            {country.toUpperCase()}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 32, marginTop: country ? 0 : 32 }}>
          {[
            { label: 'SCORE', value: score.toLocaleString() + ' PTS', color: '#f5c518' },
            { label: 'TIME',  value: time,                            color: '#00d4ff' },
            { label: 'RANK',  value: rank === '—' ? '—' : '#' + rank, color: '#ffffff' },
          ].map(s => (
            <div key={s.label} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '20px 36px',
              minWidth: 160,
            }}>
              <div style={{ fontSize: 11, color: '#7a7a9a', letterSpacing: '0.25em', marginBottom: 8 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: s.color }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div style={{
          position: 'absolute', bottom: 28,
          fontSize: 14, color: 'rgba(122,122,154,0.6)', letterSpacing: '0.15em',
          display: 'flex',
        }}>
          WORLDCHASE.NET — HUNT THE WORLD
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
