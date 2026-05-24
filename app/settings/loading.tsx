export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-navy animate-pulse">
      {/* Nav */}
      <div className="h-14 bg-navy-light border-b border-white/8" />

      <div className="max-w-xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="h-7 w-48 bg-white/10 mb-8" />

        <div className="space-y-5">
          {/* Hunter name */}
          <div>
            <div className="h-3 w-28 bg-white/10 mb-2" />
            <div className="h-12 bg-navy-light border border-white/10" />
            <div className="h-3 w-64 bg-white/5 mt-1" />
          </div>

          {/* Display name */}
          <div>
            <div className="h-3 w-32 bg-white/10 mb-2" />
            <div className="h-12 bg-navy-light border border-white/10" />
          </div>

          {/* Toggles */}
          <div className="border border-white/10">
            {[1,2].map(i => (
              <div key={i} className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 last:border-b-0">
                <div>
                  <div className="h-4 w-36 bg-white/10 mb-1" />
                  <div className="h-3 w-52 bg-white/5" />
                </div>
                <div className="w-12 h-6 rounded-full bg-white/10 ml-4 shrink-0" />
              </div>
            ))}
          </div>

          {/* Save button */}
          <div className="h-12 bg-white/10" />
        </div>

        {/* Sign out section */}
        <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
          <div>
            <div className="h-4 w-20 bg-white/10 mb-1" />
            <div className="h-3 w-44 bg-white/5" />
          </div>
          <div className="h-9 w-24 bg-white/5 border border-white/10" />
        </div>
      </div>
    </div>
  )
}
