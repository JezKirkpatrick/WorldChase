const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function DMLoading() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="shrink-0 border-b border-white/10 bg-navy-light px-4 py-3 flex items-center gap-3">
        <S w="w-16" h="h-3" />
        <div className="w-px h-4 bg-white/20" />
        <S w="w-8" h="h-8" className="rounded-full shrink-0" />
        <div className="space-y-1.5">
          <S w="w-24" h="h-3" />
          <S w="w-16" h="h-2.5" />
        </div>
      </div>
      <div className="flex-1 px-4 py-4 space-y-3">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-end gap-2">
            <S w="w-7" h="h-7" className="rounded-full shrink-0" />
            <S w={i % 2 === 0 ? 'w-48' : 'w-32'} h="h-9" className="rounded-xl" />
          </div>
        ))}
      </div>
      <div className="shrink-0 border-t border-white/10 bg-navy-light h-14" />
    </div>
  )
}
