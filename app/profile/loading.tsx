const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function ProfileLoading() {
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero card */}
        <div className="bg-navy-light border border-white/10 p-6 sm:p-8 mb-5">
          <div className="flex items-center gap-5">
            <S w="w-20" h="h-20" className="rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <S w="w-36" h="h-7" />
              <S w="w-24" h="h-3" />
              <S w="w-48" h="h-3" />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-navy-light border border-white/10 p-4 flex flex-col items-center gap-2">
              <S w="w-20" h="h-2.5" />
              <S w="w-12" h="h-6" />
            </div>
          ))}
        </div>

        {/* Achievements */}
        <div className="bg-navy-light border border-white/10 p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <S w="w-32" h="h-4" />
            <S w="w-20" h="h-3" />
          </div>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <S key={i} w="w-full" h="h-14" />
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-navy-light border border-white/10 p-4 flex items-center gap-4 mb-5">
          <S w="w-10" h="h-10" className="shrink-0" />
          <div className="flex-1 space-y-1.5">
            <S w="w-28" h="h-5" />
            <S w="w-56" h="h-3" />
          </div>
        </div>
      </div>
    </div>
  )
}
