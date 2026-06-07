interface RankBadgeProps {
  rank: number | null | undefined
  previousRank?: number | null
}

export default function RankBadge({ rank, previousRank }: RankBadgeProps) {
  const safeRank = typeof rank === 'number' && isFinite(rank) && rank > 0 ? rank : null
  const safePrev = typeof previousRank === 'number' && isFinite(previousRank) && previousRank > 0 ? previousRank : null
  const moved    = safeRank && safePrev ? safePrev - safeRank : 0

  const podiumColors: Record<number, string> = {
    1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40',
    2: 'text-gray-300 bg-gray-300/10 border-gray-300/40',
    3: 'text-amber-600 bg-amber-600/10 border-amber-600/40',
  }

  const colorClass = safeRank ? (podiumColors[safeRank] ?? 'text-white/70 border-white/10') : 'text-white/30 border-white/10'

  return (
    <div className="flex items-center gap-1">
      <span className={`font-mono font-bold text-xs sm:text-sm px-1.5 py-0.5 border leading-tight ${colorClass}`}>
        {safeRank != null ? `#${safeRank}` : '#—'}
      </span>
      {moved !== 0 && (
        <span className={`text-[10px] font-mono font-bold leading-none ${moved > 0 ? 'text-success' : 'text-danger'}`}>
          {moved > 0 ? `↑${moved}` : `↓${Math.abs(moved)}`}
        </span>
      )}
    </div>
  )
}
