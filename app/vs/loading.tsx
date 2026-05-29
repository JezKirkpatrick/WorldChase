const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function VsLoading() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <div className="h-14 bg-navy-light border-b border-white/8 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        <S w="w-32" h="h-5" />
        <div className="flex items-center gap-3">
          <S w="w-12" h="h-4" />
          <S w="w-9" h="h-9" className="rounded-full" />
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="space-y-2">
          <S w="w-24" h="h-3" />
          <S w="w-48" h="h-8" />
          <S w="w-full" h="h-4" />
        </div>
        <S w="w-full" h="h-16" />
        <div className="space-y-2 pt-4">
          <S w="w-32" h="h-3" />
          {[1, 2, 3].map(i => <S key={i} h="h-14" />)}
        </div>
      </div>
    </div>
  )
}
