export default function SupportLoading() {
  return (
    <div className="min-h-screen bg-navy animate-pulse">
      {/* Nav */}
      <div className="h-14 bg-navy-light border-b border-white/8" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <div className="h-3 w-28 bg-white/10 mb-2" />
          <div className="h-8 w-48 bg-white/10 mb-2" />
          <div className="h-4 w-64 bg-white/5" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-4">
          <div className="h-12 bg-navy-light border border-white/10" />
          <div className="h-12 bg-navy-light border border-white/10" />
          <div className="h-32 bg-navy-light border border-white/10" />
          <div className="h-12 bg-white/10" />
        </div>

        {/* Quick links */}
        <div className="mt-8 pt-6 border-t border-white/8">
          <div className="h-3 w-24 bg-white/10 mb-3" />
          <div className="grid grid-cols-2 gap-2">
            <div className="h-12 bg-white/5 border border-white/10" />
            <div className="h-12 bg-white/5 border border-white/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
