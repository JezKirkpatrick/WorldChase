export default function HowToPlayLoading() {
  return (
    <div className="min-h-screen bg-navy text-text animate-pulse">
      {/* Nav skeleton */}
      <div className="h-14 bg-navy-light border-b border-white/8" />

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-14">
        {/* Title */}
        <div>
          <div className="h-3 w-24 bg-white/10 mb-3" />
          <div className="h-10 w-48 bg-white/10" />
        </div>

        {/* Game overview steps */}
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="border border-white/5 p-5">
              <div className="h-3 w-8 bg-white/10 mb-2" />
              <div className="h-4 w-40 bg-white/10 mb-2" />
              <div className="h-3 w-full bg-white/5" />
            </div>
          ))}
        </div>

        {/* Scoring table */}
        <div>
          <div className="h-5 w-40 bg-white/10 mb-4" />
          <div className="space-y-2">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-white/5" />)}
          </div>
        </div>

        {/* Token section */}
        <div>
          <div className="h-5 w-36 bg-white/10 mb-4" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-white/5" />)}</div>
            <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/5" />)}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
