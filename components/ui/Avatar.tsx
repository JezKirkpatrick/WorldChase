'use client'
import { flagUrl } from '@/lib/flagEmoji'

// ── Size tokens ────────────────────────────────────────────────────
const SIZE_PX: Record<string, number> = {
  xs: 28, sm: 36, md: 48, lg: 64, xl: 96,
}
const EMOJI_SIZE: Record<string, string> = {
  xs: 'text-sm', sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl', xl: 'text-6xl',
}
// Flag badge font-size relative to avatar size
const FLAG_FONT: Record<string, number> = {
  xs: 13, sm: 15, md: 17, lg: 22, xl: 30,
}

// ── Simple ring borders (arena progression) ─────────────────────
const RING: Record<string, string> = {
  none: '', default: '',
  bronze:      'ring-2 ring-amber-600 shadow-lg shadow-amber-600/50',
  'bronze-ii': 'ring-[3px] ring-amber-500 shadow-lg shadow-amber-500/60',
  silver:      'ring-2 ring-slate-300 shadow-lg shadow-slate-300/50',
  'silver-ii': 'ring-[3px] ring-slate-200 shadow-xl shadow-slate-200/60',
  'gold-ii':   'ring-[3px] ring-yellow-300 shadow-xl shadow-yellow-300/70',
  platinum:    'ring-[3px] ring-white shadow-xl shadow-white/55',
  champion:    'ring-[3px] ring-purple-400 shadow-xl shadow-purple-400/65',
}

// Borders that use the rich renderer
const RICH = new Set(['electric', 'gold', 'diamond', 'legendary', 'fire', 'thorns', 'ocean', 'rainbow', 'galaxy', 'pulsar'])

interface AvatarProps {
  emoji?: string
  border?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  countryCode?: string | null
  className?: string
}

const isUrl = (s?: string) => typeof s === 'string' && s.startsWith('http')

export default function Avatar({ emoji = '🌍', border = 'none', size = 'md', countryCode, className = '' }: AvatarProps) {
  const px       = SIZE_PX[size]  ?? 48
  const emSize   = EMOJI_SIZE[size] ?? 'text-2xl'
  const flagFont = FLAG_FONT[size ?? 'md'] ?? 15
  const gap      = 4  // border thickness in px
  const flag     = flagUrl(countryCode)

  if (!border || !RICH.has(border)) {
    const ring = RING[border ?? 'none'] ?? ''
    // Wrap in a relative container so the flag badge can sit outside overflow-hidden
    return (
      <div className={`relative shrink-0 inline-flex ${className}`} style={{ width: px, height: px }}>
        <div
          className={`absolute inset-0 rounded-full bg-[#0B1628] flex items-center justify-center overflow-hidden ${isUrl(emoji) ? '' : emSize} ${ring}`}
        >
          {isUrl(emoji)
            ? <img src={emoji} alt="avatar" className="w-full h-full object-cover" />
            : emoji}
        </div>
        {flag && (
          <img src={flag} alt="" aria-hidden
            className="absolute -bottom-1 -right-1 z-10 rounded-sm shadow-sm pointer-events-none"
            style={{ width: flagFont, height: Math.round(flagFont * 0.75) }}
          />
        )}
      </div>
    )
  }

  const outer = px + gap * 2  // outer ring container size

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}
         style={{ width: outer, height: outer }}>

      {/* ── Animated border ring ── */}
      {border === 'electric'  && <ElectricRing  outer={outer} />}
      {border === 'gold'      && <GoldRing      outer={outer} />}
      {border === 'diamond'   && <DiamondRing   outer={outer} />}
      {border === 'legendary' && <VoidRing      outer={outer} />}
      {border === 'fire'      && <FireRing      outer={outer} />}
      {border === 'thorns'    && <ThornsRing    outer={outer} />}
      {border === 'ocean'     && <OceanRing     outer={outer} />}
      {border === 'rainbow'   && <RainbowRing   outer={outer} />}
      {border === 'galaxy'    && <GalaxyRing    outer={outer} />}
      {border === 'pulsar'    && <PulsarRing    outer={outer} />}

      {/* ── Inner navy bg (cuts the ring into a ring shape) ── */}
      <div className="absolute rounded-full bg-[#0B1628] z-[1]"
           style={{ width: px, height: px, top: gap, left: gap }} />

      {/* ── Emoji / Photo ── */}
      <div className={`absolute z-[2] flex items-center justify-center overflow-hidden rounded-full ${isUrl(emoji) ? '' : emSize}`}
           style={{ width: px, height: px, top: gap, left: gap }}>
        {isUrl(emoji)
          ? <img src={emoji} alt="avatar" className="w-full h-full object-cover" />
          : emoji}
      </div>

      {/* ── Crown decoration for gold ── */}
      {border === 'gold' && (
        <span className="absolute z-[3] left-1/2 -translate-x-1/2 select-none pointer-events-none leading-none"
              style={{ top: -Math.round(px * 0.15), fontSize: Math.round(px * 0.32) }}>
          👑
        </span>
      )}

      {/* ── Country flag badge ── */}
      {flag && (
        <img src={flag} alt="" aria-hidden
          className="absolute z-[4] rounded-sm shadow-sm pointer-events-none"
          style={{ bottom: gap - 2, right: gap - 2, width: flagFont, height: Math.round(flagFont * 0.75) }}
        />
      )}
    </div>
  )
}

// ── Electric / Neon Pulse ─────────────────────────────────────────
function ElectricRing({ outer }: { outer: number }) {
  return (
    <div className="absolute inset-0 rounded-full avatar-ring-electric"
         style={{ width: outer, height: outer }} />
  )
}

// ── Gold Crown ────────────────────────────────────────────────────
function GoldRing({ outer }: { outer: number }) {
  return (
    <div className="absolute inset-0 rounded-full avatar-ring-gold"
         style={{ width: outer, height: outer }} />
  )
}

// ── Diamond / Crystal ─────────────────────────────────────────────
function DiamondRing({ outer }: { outer: number }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full avatar-ring-diamond"
           style={{ width: outer, height: outer }} />
      <SparkleOrbit outer={outer} color="#b8f0ff" count={4} />
    </>
  )
}

// ── Void / Legendary ─────────────────────────────────────────────
function VoidRing({ outer }: { outer: number }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full avatar-ring-void"
           style={{ width: outer, height: outer }} />
      <OrbitDot outer={outer} />
    </>
  )
}

// ── Fire Ring ─────────────────────────────────────────────────────
function FireRing({ outer }: { outer: number }) {
  return (
    <div className="absolute inset-0 rounded-full avatar-ring-fire"
         style={{ width: outer, height: outer }} />
  )
}

// ── Thorns (SVG) ─────────────────────────────────────────────────
function ThornsRing({ outer }: { outer: number }) {
  const cx = outer / 2
  const cy = outer / 2
  const innerR  = outer / 2 - 1
  const valleyR = outer / 2 - 3
  const spikeR  = outer / 2 + 5
  const n = Math.max(10, Math.floor(outer / 5))

  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const base  = (i * 2 * Math.PI) / n - Math.PI / 2
    const left  = base - (Math.PI / n) * 0.45
    const right = base + (Math.PI / n) * 0.45
    pts.push(`${(cx + valleyR * Math.cos(left)).toFixed(2)},${(cy + valleyR * Math.sin(left)).toFixed(2)}`)
    pts.push(`${(cx + spikeR  * Math.cos(base)).toFixed(2)},${(cy + spikeR  * Math.sin(base)).toFixed(2)}`)
    pts.push(`${(cx + valleyR * Math.cos(right)).toFixed(2)},${(cy + valleyR * Math.sin(right)).toFixed(2)}`)
  }

  return (
    <svg className="absolute"
         style={{ left: -6, top: -6, width: outer + 12, height: outer + 12, overflow: 'visible', zIndex: 0 }}
         viewBox={`${-6} ${-6} ${outer + 12} ${outer + 12}`}>
      <defs>
        <radialGradient id="thorn-fill" cx="50%" cy="50%" r="50%">
          <stop offset="70%"  stopColor="#1a3d1a" />
          <stop offset="100%" stopColor="#0d260d" />
        </radialGradient>
      </defs>
      {/* Thorn ring polygon */}
      <polygon
        points={pts.join(' ')}
        fill="url(#thorn-fill)"
        stroke="#3a7a3a"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {/* Inner cut (navy) */}
      <circle cx={cx} cy={cy} r={innerR - 4} fill="#0B1628" />
    </svg>
  )
}

// ── Ocean Wave ────────────────────────────────────────────────────
function OceanRing({ outer }: { outer: number }) {
  return (
    <div className="absolute inset-0 rounded-full avatar-ring-ocean"
         style={{ width: outer, height: outer }} />
  )
}

// ── Rainbow Spin ──────────────────────────────────────────────────
function RainbowRing({ outer }: { outer: number }) {
  return (
    <div className="absolute inset-0 rounded-full avatar-ring-rainbow"
         style={{ width: outer, height: outer }} />
  )
}

// ── Galaxy Nebula ─────────────────────────────────────────────────
function GalaxyRing({ outer }: { outer: number }) {
  return (
    <>
      <div className="absolute inset-0 rounded-full avatar-ring-galaxy"
           style={{ width: outer, height: outer }} />
      <div className="absolute avatar-orbit-galaxy"
           style={{ width: outer + 6, height: outer + 6, top: -3, left: -3 }} />
    </>
  )
}

// ── Pulsar — 4 bright orbiting lights ────────────────────────────
function PulsarRing({ outer }: { outer: number }) {
  const dotSize = 6
  const C = outer / 2
  const R = outer / 2 + 1
  const positions = [0, 90, 180, 270].map(deg => ({
    top:  C - dotSize / 2 + R * Math.sin((deg * Math.PI) / 180),
    left: C - dotSize / 2 + R * Math.cos((deg * Math.PI) / 180),
  }))
  return (
    <>
      <div className="absolute inset-0 rounded-full avatar-ring-pulsar"
           style={{ width: outer, height: outer }} />
      <div className="absolute inset-0 avatar-orbit-pulsar-spin"
           style={{ width: outer, height: outer }}>
        {positions.map((pos, i) => (
          <div key={i} className="absolute rounded-full"
               style={{
                 width: dotSize, height: dotSize,
                 top: pos.top, left: pos.left,
                 background: '#00ffff',
                 boxShadow: '0 0 8px 3px rgba(0,255,255,1), 0 0 20px 8px rgba(0,200,255,0.8), 0 0 40px 14px rgba(0,150,255,0.4)',
               }} />
        ))}
      </div>
    </>
  )
}

// ── Sparkle orbit dots ────────────────────────────────────────────
function SparkleOrbit({ outer, color, count }: { outer: number; color: string; count: number }) {
  const r = outer / 2 + 3
  const dots = Array.from({ length: count }, (_, i) => {
    const angle = (i * 360) / count
    return (
      <div key={i} className="absolute rounded-full avatar-sparkle"
           style={{
             width: 4, height: 4,
             background: color,
             boxShadow: `0 0 4px 1px ${color}`,
             top:  outer / 2 - 2 + r * Math.sin((angle * Math.PI) / 180),
             left: outer / 2 - 2 + r * Math.cos((angle * Math.PI) / 180),
             animationDelay: `${i * 0.3}s`,
           }} />
    )
  })
  return <>{dots}</>
}

// ── Void orbit dot ────────────────────────────────────────────────
function OrbitDot({ outer }: { outer: number }) {
  return (
    <div className="absolute rounded-full avatar-orbit-dot"
         style={{
           width: outer + 4, height: outer + 4,
           top: -2, left: -2,
         }} />
  )
}
