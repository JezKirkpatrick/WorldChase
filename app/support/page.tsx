import Link from 'next/link'
import GlobalNav from '@/components/ui/GlobalNav'
import SupportForm from '@/components/support/SupportForm'

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="fixed top-20 right-1/4 w-64 h-64 bg-electric/3 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 left-1/4 w-80 h-80 bg-gold/2 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 relative">
        <div className="mb-8 animate-fade-up">
          <div className="text-xs text-electric font-head tracking-[0.3em] mb-1">HELP & SUPPORT</div>
          <h1 className="font-head font-bold text-3xl text-white mb-2">Contact Support</h1>
          <p className="text-text-muted font-head text-sm">Experiencing an issue? We respond within 24 hours.</p>
        </div>

        <SupportForm />

        <div className="mt-8 pt-6 border-t border-white/8">
          <div className="text-xs font-head text-text-muted tracking-widest mb-3">QUICK HELP</div>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/how-to-play"
              className="flex items-center gap-2 p-3 border border-white/10 text-text-muted hover:border-white/25 hover:text-white transition-all font-head text-xs font-bold">
              <span>📖</span> HOW TO PLAY
            </Link>
            <Link href="/tokens"
              className="flex items-center gap-2 p-3 border border-white/10 text-text-muted hover:border-gold/30 hover:text-gold transition-all font-head text-xs font-bold">
              <span>🪙</span> TOKEN INFO
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
