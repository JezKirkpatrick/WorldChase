import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'World Chase — Hunt the World'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0e27 0%, #0d1535 50%, #0a1428 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow orbs */}
        <div style={{
          position: 'absolute', top: -80, left: -80,
          width: 400, height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,197,24,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, right: -60,
          width: 350, height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,212,255,0.10) 0%, transparent 70%)',
        }} />

        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'linear-gradient(90deg, transparent, #f5c518, #f5c518, transparent)',
        }} />

        {/* Globe */}
        <div style={{ fontSize: 120, marginBottom: 24, lineHeight: 1 }}>🌍</div>

        {/* Title */}
        <div style={{
          fontSize: 80, fontWeight: 900, letterSpacing: '0.12em',
          color: '#f5c518',
          textTransform: 'uppercase',
          marginBottom: 16,
          textShadow: '0 0 60px rgba(245,197,24,0.4)',
        }}>
          WORLD CHASE
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: 28, letterSpacing: '0.25em', fontWeight: 600,
          color: 'rgba(255,255,255,0.65)',
          textTransform: 'uppercase',
          marginBottom: 40,
        }}>
          Hunt the World · Claim the Crown
        </div>

        {/* Pills */}
        <div style={{ display: 'flex', gap: 16 }}>
          {['🗺 Monthly Hunts', '🏆 Global Leaderboard', '🪙 Earn Rewards'].map(label => (
            <div key={label} style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 40,
              padding: '10px 22px',
              fontSize: 20,
              color: 'rgba(255,255,255,0.8)',
              letterSpacing: '0.05em',
            }}>
              {label}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', bottom: 32,
          fontSize: 20, color: 'rgba(0,212,255,0.7)',
          letterSpacing: '0.15em',
        }}>
          worldchase.net
        </div>
      </div>
    ),
    { ...size }
  )
}
