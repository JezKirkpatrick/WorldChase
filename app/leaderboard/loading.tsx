const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function LeaderboardLoading() {
  return (
    <div className="min-h-screen bg-navy">
      {/* Nav skeleton */}
      <div className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <S w="w-32" h="h-5" />
        <div className="hidden sm:flex items-center gap-6">
          {[60, 80, 44, 80, 56].map((_, i) => <S key={i} w="w-14" h="h-3" />)}
        </div>
        <div className="flex items-center gap-3">
          <S w="w-12" h="h-4" />
          <S w="w-9" h="h-9" className="rounded-full" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 space-y-2">
          <S w="w-32" h="h-3" />
          <S w="w-72" h="h-8" />
          <S w="w-48" h="h-3" />
        </div>
        <div className="border border-white/10">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-3 border-b border-white/10 bg-navy-light">
            {[8, 12, 32, 20, 16].map((w, i) => (
              <S key={i} w={`w-${w}`} h="h-3" className={i === 2 ? 'flex-1' : 'shrink-0'} />
            ))}
          </div>
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-white/5"
              style={{ opacity: 1 - i * 0.035 }}>
              <S w="w-8" h="h-5" className="shrink-0" />
              <S w="w-9" h="h-9" className="rounded-full shrink-0" />
              <div className="flex-1 space-y-1">
                <S w="w-28" h="h-4" />
                <S w="w-16" h="h-2.5" />
              </div>
              <S w="w-10" h="h-3" className="shrink-0" />
              <S w="w-16" h="h-5" className="shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
