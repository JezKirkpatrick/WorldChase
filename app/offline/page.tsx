'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="text-5xl">🌍</div>
      <div className="font-head font-bold text-white text-2xl tracking-wider">YOU'RE OFFLINE</div>
      <p className="text-text-muted font-head max-w-sm">
        No signal detected. Connect to the internet to continue hunting.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all"
      >
        RETRY CONNECTION
      </button>
    </div>
  )
}
