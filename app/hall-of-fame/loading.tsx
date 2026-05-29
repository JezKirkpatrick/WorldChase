const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function HallOfFameLoading() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <div className="h-14 bg-navy-light border-b border-white/8 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        <S w="w-32" h="h-5" />
        <div className="flex items-center gap-3">
          <S w="w-12" h="h-4" />
          <S w="w-9" h="h-9" className="rounded-full" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-2">
          <S w="w-24" h="h-3" />
          <S w="w-56" h="h-8" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-navy-light border border-white/10 p-6 space-y-3 flex flex-col items-center">
              <S w="w-16" h="h-16" className="rounded-full" />
              <S w="w-24" h="h-4" />
              <S w="w-16" h="h-3" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <S key={i} h="h-14" />)}
        </div>
      </div>
    </div>
  )
}
