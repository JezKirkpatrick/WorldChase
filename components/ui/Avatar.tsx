'use client'

// ── Size tokens ────────────────────────────────────────────────────
const SIZE_PX: Record<string, number> = {
  xs: 28, sm: 36, md: 48, lg: 64, xl: 96,
}
const EMOJI_SIZE: Record<string, string> = {
  xs: 'text-sm', sm: 'text-xl', md: 'text-2xl', lg: 'text-4xl', xl: 'text-6xl',
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
const RICH = new Set(['electric', 'gold', 'diamond', 'legendary', 'fire', 'thorns'])

interface AvatarProps {
  emoji?: string
  border?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ emoji = '🌍', border = 'none', size = 'md', className = '' }: AvatarProps) {
  const px     = SIZE_PX[size]  ?? 48
  const emSize = EMOJI_SIZE[size] ?? 'text-2xl'
  const gap    = 4  // border thickness in px

  if (!border || !RICH.has(border)) {
    const ring = RING[border ?? 'none'] ?? ''
    return (
      <div className={`rounded-full bg-[#0B1628] flex items-center justify-center shrink-0 ${emSize} ${ring} ${className}`}
           style={{ width: px, height: px }}>
        {emoji}
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

      {/* ── Inner navy bg (cuts the ring into a ring shape) ── */}
      <div className="absolute rounded-full bg-[#0B1628] z-[1]"
           style={{ width: px, height: px, top: gap, left: gap }} />

      {/* ── Emoji ── */}
      <div className={`absolute z-[2] flex items-center justify-center ${emSize}`}
           style={{ width: px, height: px, top: gap, left: gap }}>
        {emoji}
      </div>

      {/* ── Crown decoration for gold ── */}
      {border === 'gold' && (
        <span className="absolute z-[3] left-1/2 -translate-x-1/2 select-none pointer-events-none leading-none"
              style={{ top: -Math.round(px * 0.15), fontSize: Math.round(px * 0.32) }}>
          👑
        </span>
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
