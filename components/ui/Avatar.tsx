'use client'

const BORDER_STYLES: Record<string, string> = {
  // ── None / default ─────────────────────────────────────────────
  none:        '',
  default:     '',

  // ── Arena progression borders ───────────────────────────────────
  bronze:      'ring-2 ring-amber-600 shadow-lg shadow-amber-600/50',
  'bronze-ii': 'ring-[3px] ring-amber-500 shadow-lg shadow-amber-500/60',
  silver:      'ring-2 ring-slate-300 shadow-lg shadow-slate-300/50',
  'silver-ii': 'ring-[3px] ring-slate-200 shadow-xl shadow-slate-200/60',
  'gold-ii':   'ring-[3px] ring-yellow-300 shadow-xl shadow-yellow-300/70',
  platinum:    'ring-[3px] ring-white shadow-xl shadow-white/55',
  champion:    'ring-[3px] ring-purple-400 shadow-xl shadow-purple-400/65',

  // ── Shop borders ───────────────────────────────────────────────
  electric:    'ring-2 ring-electric shadow-lg shadow-electric/55',
  gold:        'ring-2 ring-gold shadow-lg shadow-gold/55',
  diamond:     'ring-[3px] ring-cyan-200 shadow-xl shadow-cyan-200/60',
  legendary:   'ring-[3px] ring-purple-500 shadow-xl shadow-purple-500/65',
}

const SIZE: Record<string, string> = {
  xs: 'w-7 h-7 text-base',
  sm: 'w-9 h-9 text-xl',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-4xl',
  xl: 'w-24 h-24 text-6xl',
}

interface AvatarProps {
  emoji?: string
  border?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export default function Avatar({ emoji = '🌍', border = 'none', size = 'md', className = '' }: AvatarProps) {
  return (
    <div className={`rounded-full bg-navy flex items-center justify-center ${SIZE[size]} ${BORDER_STYLES[border] ?? ''} ${className}`}>
      {emoji}
    </div>
  )
}
