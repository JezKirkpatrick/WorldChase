import Link from 'next/link'

const STATS = [{ label: '🌍 Played in 47 countries' }, { label: '🏆 12,400+ hunters' }, { label: '🗺️ 240 locations discovered' }]

const DIFFICULTIES = [
  { label: 'EASY', rounds: 'ROUNDS 1–4', subtitle: 'THE WARM-UP', desc: 'Famous global landmarks. You know these. But speed still matters.', pts: '500', color: 'border-success/40 bg-success/5', labelColor: 'text-success' },
  { label: 'MEDIUM', rounds: 'ROUNDS 5–9', subtitle: 'THE TEST BEGINS', desc: 'Remarkable places most people struggle to locate precisely.', pts: '1,000', color: 'border-electric/40 bg-electric/5', labelColor: 'text-electric' },
  { label: 'HARD', rounds: 'ROUNDS 10–15', subtitle: 'THE REAL HUNT', desc: 'Remote landscapes, obscure cultural sites. Instinct helps more.', pts: '2,500', color: 'border-warning/40 bg-warning/5', labelColor: 'text-warning' },
  { label: 'EXTREME', rounds: 'ROUNDS 16–20', subtitle: 'THE FINAL RECKONING', desc: 'The most remote, bizarre, forgotten places on Earth.', pts: '5,000', color: 'border-danger/40 bg-danger/5', labelColor: 'text-danger' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'RECEIVE YOUR MISSION', desc: "Each round, a cryptic riddle lands in front of you. No country names. No obvious hints. Just poetic, carefully crafted clues pointing to somewhere extraordinary on Earth." },
  { step: '02', title: 'EXPLORE THE WORLD', desc: "Drop into Google Maps. Walk the streets in Street View. Survey from satellite. Navigate terrain. The answer is out there." },
  { step: '03', title: 'HUNT FOR HIDDEN TOKENS', desc: "As you explore, hidden token caches are scattered across the region. Navigate close enough and your radar will detect them." },
  { step: '04', title: 'SOLVE, SCORE, CLIMB', desc: "Submit your answer. Use fewer clues, score higher. Solve faster, earn a speed bonus. Climb the global leaderboard before the month ends." },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy text-text">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-navy/90 backdrop-blur border-b border-white/8 flex items-center justify-between px-4 sm:px-6">
        <span className="font-head font-bold text-gold text-base sm:text-lg tracking-widest">WORLD CHASE</span>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/how-to-play" className="hidden sm:block text-sm font-head text-text-muted hover:text-white transition-colors">HOW TO PLAY</Link>
          <Link href="/leaderboard" className="hidden sm:block text-sm font-head text-text-muted hover:text-white transition-colors">LEADERBOARD</Link>
          <Link href="/auth/login" className="text-sm font-head text-text-muted hover:text-white transition-colors">SIGN IN</Link>
          <Link href="/auth/signup" className="px-3 sm:px-4 py-2 bg-gold text-navy font-head font-bold text-sm tracking-wider hover:bg-gold-dim transition-colors whitespace-nowrap">JOIN FREE</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="relative max-w-3xl mx-auto">
          <div className="text-xs font-head font-bold tracking-[0.4em] text-gold mb-4">THE MONTHLY GLOBAL HUNT</div>
          <h1 className="font-head font-bold text-4xl sm:text-5xl md:text-7xl text-white mb-6 leading-tight">
            The World Is Hiding.<br/>
            <span className="text-gold">Can You Find It?</span>
          </h1>
          <p className="text-text-muted font-head text-base sm:text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            Twenty cryptic riddles. Twenty extraordinary locations. Thousands of hunters from every corner of the planet. One global leaderboard. The chase begins now.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link href="/auth/signup" className="px-8 sm:px-10 py-4 bg-gold text-navy font-head font-bold text-base sm:text-lg tracking-widest hover:bg-gold-dim transition-all gold-glow">
              Enter the Chase — It's Free
            </Link>
            <Link href="/how-to-play" className="px-6 sm:px-8 py-4 border border-white/20 text-text font-head font-bold text-sm tracking-wider hover:border-gold/40 transition-all">
              HOW IT WORKS
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-head text-text-muted">
            {STATS.map(s => <span key={s.label}>{s.label}</span>)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-white/8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-xs text-gold font-head tracking-[0.4em] mb-3">THE PROCESS</div>
            <h2 className="font-head font-bold text-3xl text-white">Four Steps to the Hunt</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} className="border border-white/8 p-6 bracket-box">
                <div className="font-mono text-gold/50 text-xs mb-2">{h.step}</div>
                <h3 className="font-head font-bold text-gold tracking-wider text-sm mb-3">{h.title}</h3>
                <p className="text-text-muted font-head leading-relaxed">{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Difficulty */}
      <section className="py-20 px-6 bg-navy-light border-y border-white/8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-head font-bold text-3xl text-white mb-3">Twenty Rounds. Four Levels of Pain.</h2>
            <p className="text-text-muted font-head">World Chase doesn't stay easy. It builds to something genuinely brutal.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DIFFICULTIES.map(d => (
              <div key={d.label} className={`border p-5 ${d.color}`}>
                <div className={`font-mono font-bold text-sm tracking-widest mb-1 ${d.labelColor}`}>{d.label}</div>
                <div className="text-xs text-text-muted font-head mb-1">{d.rounds}</div>
                <div className="text-xs font-head font-bold text-white/60 tracking-wider mb-3">"{d.subtitle}"</div>
                <p className="text-text-muted font-head text-sm leading-relaxed mb-3">{d.desc}</p>
                <div className="font-mono text-xs text-text-muted">Up to <span className={`font-bold ${d.labelColor}`}>{d.pts}</span> pts</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-head font-bold text-3xl text-white mb-4">The Hunt Has Already Started.</h2>
          <p className="text-text-muted font-head text-lg mb-8">
            Every day you wait, other hunters are pulling ahead. Your first three tokens are free. Your first round is waiting.
          </p>
          <Link href="/auth/signup" className="inline-block px-12 py-4 bg-gold text-navy font-head font-bold text-lg tracking-widest hover:bg-gold-dim transition-all gold-glow">
            Start Hunting — Join Free
          </Link>
          <p className="text-text-muted/50 font-head text-xs mt-4">No credit card required. New event every month.</p>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8 px-6 text-center text-text-muted/50 font-head text-xs tracking-wider">
        © 2025 WORLD CHASE — HUNT THE WORLD
      </footer>
    </div>
  )
}
