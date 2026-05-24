const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function PlayLoading() {
  return (
    <div className="min-h-screen bg-navy">
      {/* Minimal nav */}
      <div className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-6">
        <S w="w-32" h="h-5" />
        <S w="w-40" h="h-3" />
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8 space-y-2">
          <S w="w-28" h="h-3" />
          <S w="w-44" h="h-8" />
          <S w="w-36" h="h-3" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between border border-white/10 p-4"
              style={{ opacity: 1 - i * 0.08 }}>
              <div className="flex items-center gap-4">
                <S w="w-10" h="h-4" />
                <S w="w-16" h="h-5" />
                <S w="w-24" h="h-3" />
              </div>
              <div className="flex items-center gap-4">
                <S w="w-12" h="h-3" />
                <S w="w-16" h="h-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
