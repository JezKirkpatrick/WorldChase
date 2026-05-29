const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function ChatLoading() {
  return (
    <div className="min-h-screen bg-navy text-text flex flex-col" style={{ height: '100dvh' }}>
      <div className="h-14 bg-navy-light border-b border-white/8 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
        <S w="w-32" h="h-5" />
        <div className="flex items-center gap-3">
          <S w="w-12" h="h-4" />
          <S w="w-9" h="h-9" className="rounded-full" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-4 max-w-3xl w-full mx-auto">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-start gap-2.5">
            <S w="w-8" h="h-8" className="rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <S w="w-24" h="h-2.5" />
              <S w={i % 2 === 0 ? 'w-2/3' : 'w-1/2'} h="h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
