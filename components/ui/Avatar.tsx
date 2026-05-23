'use client'

const BORDER_STYLES: Record<string, string> = {
  none:      '',
  default:   '',
  gold:      'ring-2 ring-gold shadow-md shadow-gold/40',
  electric:  'ring-2 ring-electric shadow-md shadow-electric/40',
  diamond:   'ring-2 ring-white shadow-md shadow-white/30',
  legendary: 'ring-2 ring-purple-400 shadow-md shadow-purple-400/50',
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
