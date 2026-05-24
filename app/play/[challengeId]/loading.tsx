const S = ({ w, h, className = '' }: { w?: string; h?: string; className?: string }) => (
  <div className={`bg-white/8 animate-pulse ${w ?? 'w-full'} ${h ?? 'h-4'} ${className}`} />
)

export default function GameLoading() {
  return (
    <div className="h-screen flex flex-col bg-navy overflow-hidden">
      {/* BattleHUD skeleton */}
      <div className="h-12 bg-navy-light border-b border-gold/20 flex items-center px-4 gap-4 shrink-0">
        <S w="w-28" h="h-4" />
        <div className="w-px h-6 bg-white/10" />
        <S w="w-32" h="h-3" />
        <S w="w-16" h="h-5" />
        <div className="flex-1" />
        <S w="w-16" h="h-3" />
        <div className="w-px h-6 bg-white/10" />
        <S w="w-10" h="h-5" />
        <div className="w-px h-6 bg-white/10" />
        <S w="w-14" h="h-5" />
      </div>

      {/* TimerBar skeleton */}
      <div className="h-0.5 bg-white/5 shrink-0">
        <div className="h-full w-0 bg-electric/40" />
      </div>

      {/* Main split */}
      <div className="flex flex-1 overflow-hidden pt-12">
        {/* Left panel */}
        <div className="w-[38%] min-w-[320px] flex flex-col border-r border-white/10 bg-navy-light">
          {/* Mission briefing */}
          <div className="p-5 border-b border-white/10 space-y-3">
            <S w="w-32" h="h-3" />
            <S w="w-full" h="h-4" />
            <S w="w-4/5" h="h-4" />
            <S w="w-3/5" h="h-4" />
          </div>

          {/* Clues */}
          <div className="p-5 border-b border-white/10 flex-1 space-y-2">
            <S w="w-36" h="h-3" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border border-white/10 p-3 space-y-2">
                <S w="w-28" h="h-2.5" />
                {i === 1 ? <S w="w-full" h="h-3" /> : <S w="w-32" h="h-3" className="opacity-30" />}
              </div>
            ))}
          </div>

          {/* Answer */}
          <div className="p-5 border-b border-white/10 space-y-3">
            <S w="w-40" h="h-3" />
            <S w="w-full" h="h-12" />
            <S w="w-full" h="h-11" />
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => <S key={i} w="w-4" h="h-4" className="shrink-0" />)}
            </div>
          </div>
        </div>

        {/* Right panel — map placeholder */}
        <div className="flex-1 relative bg-[#1a2035] flex items-center justify-center">
          <div className="text-center">
            <div className="text-gold font-head font-bold text-lg tracking-widest animate-pulse mb-2">LOADING MAP...</div>
            <div className="text-text-muted font-head text-xs">Preparing your mission</div>
          </div>
        </div>
      </div>
    </div>
  )
}
