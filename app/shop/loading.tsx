export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-navy animate-pulse">
      {/* Nav */}
      <div className="h-14 bg-navy-light border-b border-white/8" />

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="h-3 w-24 bg-white/10 mb-2" />
          <div className="h-8 w-40 bg-white/10 mb-1" />
          <div className="h-3 w-72 bg-white/5" />
        </div>

        {/* Preview card */}
        <div className="bg-navy-light border border-white/10 p-6 mb-8 flex items-center gap-6">
          <div className="w-16 h-16 rounded-full bg-white/10" />
          <div>
            <div className="h-4 w-24 bg-white/10 mb-2" />
            <div className="h-3 w-48 bg-white/5" />
          </div>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6">
          {[1,2,3].map(i => <div key={i} className="h-9 w-20 bg-white/10" />)}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-navy-light border border-white/10 p-4 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-full bg-white/10" />
              <div className="h-4 w-20 bg-white/10" />
              <div className="h-3 w-12 bg-white/5" />
              <div className="w-full h-8 bg-white/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
