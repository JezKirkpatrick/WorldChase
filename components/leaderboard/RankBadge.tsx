interface RankBadgeProps {
  rank: number
  previousRank?: number
}

export default function RankBadge({ rank, previousRank }: RankBadgeProps) {
  const moved = previousRank ? previousRank - rank : 0
  const podiumColors: Record<number, string> = {
    1: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/40',
    2: 'text-gray-300 bg-gray-300/10 border-gray-300/40',
    3: 'text-amber-600 bg-amber-600/10 border-amber-600/40',
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`font-mono font-bold text-lg px-2 py-0.5 border ${podiumColors[rank] ?? 'text-text border-white/10'}`}>
        #{rank}
      </span>
      {moved !== 0 && (
        <span className={`text-xs font-mono font-bold ${moved > 0 ? 'text-success' : 'text-danger'}`}>
          {moved > 0 ? `↑${moved}` : `↓${Math.abs(moved)}`}
        </span>
      )}
    </div>
  )
}
