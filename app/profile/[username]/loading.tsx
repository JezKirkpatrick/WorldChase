export default function PublicProfileLoading() {
  return (
    <div className="min-h-screen bg-navy animate-pulse">
      {/* Nav */}
      <div className="h-14 bg-navy-light border-b border-white/8" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero card */}
        <div className="bg-navy-light border border-white/10 p-6 mb-6 flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-white/10" />
          <div className="h-6 w-36 bg-white/10" />
          <div className="h-4 w-24 bg-white/5" />
          <div className="h-3 w-48 bg-white/5" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-navy-light border border-white/10 p-4 text-center">
              <div className="h-6 w-12 bg-white/10 mb-1 mx-auto" />
              <div className="h-3 w-20 bg-white/5 mx-auto" />
            </div>
          ))}
        </div>

        {/* Achievement grid */}
        <div className="bg-navy-light border border-white/10 p-6 mb-6">
          <div className="h-4 w-32 bg-white/10 mb-4" />
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="h-12 bg-white/5 rounded" />
            ))}
          </div>
        </div>

        {/* Streak */}
        <div className="bg-navy-light border border-white/10 p-6">
          <div className="h-4 w-28 bg-white/10 mb-3" />
          <div className="h-8 w-20 bg-white/10" />
        </div>
      </div>
    </div>
  )
}
