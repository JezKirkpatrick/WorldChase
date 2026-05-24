const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-navy text-text">
      {/* Nav skeleton */}
      <div className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30">
        <S w="w-32" h="h-5" />
        <div className="hidden sm:flex items-center gap-6">
          {[60, 80, 44, 80, 56].map((w, i) => <S key={i} w={`w-${w === 60 ? '[60px]' : `[${w}px]`}`} h="h-3" />)}
        </div>
        <div className="flex items-center gap-3">
          <S w="w-12" h="h-4" />
          <S w="w-9" h="h-9" className="rounded-full" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
          <div className="lg:col-span-2 bg-navy-light border border-white/10 p-5 flex items-center gap-4">
            <S w="w-16" h="h-16" className="rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <S w="w-24" h="h-3" />
              <S w="w-40" h="h-6" />
              <S w="w-28" h="h-3" />
            </div>
          </div>
          <div className="bg-navy-light border border-white/10 p-4 space-y-3">
            <S w="w-24" h="h-3" />
            <S w="w-16" h="h-8" />
            <S w="w-full" h="h-1.5" />
            <S w="w-32" h="h-3" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-navy-light border border-white/10 p-3 flex flex-col items-center gap-2">
              <S w="w-14" h="h-2.5" />
              <S w="w-10" h="h-6" />
            </div>
          ))}
        </div>

        {/* Hunt + leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
          <div className="lg:col-span-3 bg-navy-light border border-white/10 p-6 flex flex-col gap-4">
            <S w="w-20" h="h-3" />
            <S w="w-56" h="h-7" />
            <S w="w-40" h="h-3" />
            <S w="w-full" h="h-2" />
            <S w="w-full" h="h-14" className="mt-auto" />
          </div>
          <div className="lg:col-span-2 bg-navy-light border border-white/10 p-4 space-y-2">
            <S w="w-28" h="h-3" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <S w="w-6" h="h-4" className="shrink-0" />
                <S w="w-8" h="h-8" className="rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <S w="w-20" h="h-3" />
                  <S w="w-12" h="h-2.5" />
                </div>
                <S w="w-12" h="h-3" className="shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
