const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function FriendsLoading() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <div className="h-14 bg-navy-light border-b border-white/8 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        <S w="w-32" h="h-5" />
        <div className="flex items-center gap-3">
          <S w="w-12" h="h-4" />
          <S w="w-9" h="h-9" className="rounded-full" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-4">
        <S w="w-28" h="h-6" />
        <div className="space-y-2 pt-2">
          <S w="w-32" h="h-3" />
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-navy-light border border-white/10 p-4 flex items-center gap-3">
              <S w="w-10" h="h-10" className="rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <S w="w-32" h="h-3" />
                <S w="w-20" h="h-2.5" />
              </div>
              <S w="w-24" h="h-3" className="shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
