import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'World Chase — Hunt the World',
  description: "The world's most challenging weekly geography game. Solve cryptic riddles, explore Google Maps in Street View, and race to the global leaderboard. Free to play.",
  keywords: ['geography game', 'world geography quiz', 'country guessing game', 'online map game', 'geography riddles', 'location puzzle', 'GeoGuessr alternative'],
  openGraph: {
    title: 'World Chase — Hunt the World',
    description: 'Weekly competitive geography battle. Solve cryptic riddles, explore the globe, and claim the crown.',
    url: 'https://www.worldchase.net',
  },
}

const STATS = [{ label: '🌍 Played in 47 countries' }, { label: '🏆 12,400+ hunters' }, { label: '🗺️ 240 locations discovered' }]

const DIFFICULTIES = [
  { label: 'EASY', rounds: 'ROUNDS 1–4', subtitle: 'THE WARM-UP', desc: 'Famous global landmarks. You know these. But speed still matters.', pts: '500', color: 'border-success/40 bg-success/5', labelColor: 'text-success' },
  { label: 'MEDIUM', rounds: 'ROUNDS 5–9', subtitle: 'THE TEST BEGINS', desc: 'Remarkable places most people struggle to locate precisely.', pts: '1,000', color: 'border-electric/40 bg-electric/5', labelColor: 'text-electric' },
  { label: 'HARD', rounds: 'ROUNDS 10–15', subtitle: 'THE REAL HUNT', desc: 'Remote landscapes, obscure cultural sites. Instinct helps more.', pts: '2,500', color: 'border-warning/40 bg-warning/5', labelColor: 'text-warning' },
  { label: 'EXTREME', rounds: 'ROUNDS 16–20', subtitle: 'THE FINAL RECKONING', desc: 'The most remote, bizarre, forgotten places on Earth.', pts: '5,000', color: 'border-danger/40 bg-danger/5', labelColor: 'text-danger' },
  { label: 'PRO', rounds: 'ROUNDS 21–25', subtitle: 'BEYOND THE KNOWN', desc: 'Ultra-rare locations. No hints. No mercy. Only the elite survive.', pts: '10,000', color: 'border-purple-400/40 bg-purple-400/5', labelColor: 'text-purple-400' },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'RECEIVE YOUR MISSION', desc: "Each round, a cryptic riddle lands in front of you. No country names. No obvious hints. Just poetic, carefully crafted clues pointing to somewhere extraordinary on Earth." },
  { step: '02', title: 'EXPLORE THE WORLD', desc: "Drop into Google Maps. Walk the streets in Street View. Survey from satellite. Navigate terrain. The answer is out there." },
  { step: '03', title: 'HUNT FOR HIDDEN TOKENS', desc: "As you explore, hidden token caches are scattered across the region. Navigate close enough and your radar will detect them." },
  { step: '04', title: 'SOLVE, SCORE, CLIMB', desc: "Submit your answer. Use fewer clues, score higher. Solve faster, earn a speed bonus. Climb the global leaderboard before the week ends." },
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
          <div className="text-xs font-head font-bold tracking-[0.4em] text-gold mb-4">FREE ONLINE GEOGRAPHY GAME</div>
          <h1 className="font-head font-bold text-4xl sm:text-5xl md:text-7xl text-white mb-6 leading-tight">
            The Geography Game<br/>
            <span className="text-gold">That Takes You There.</span>
          </h1>
          <p className="text-text-muted font-head text-base sm:text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto">
            The world's most competitive geography game. Twenty cryptic riddles, twenty extraordinary real-world locations, thousands of players from every continent. Explore Google Maps, solve the clues, and race to the top of the global leaderboard. New hunt every week.
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
          <p className="text-text-muted/50 font-head text-xs mt-4">No credit card required. New event every week.</p>
        </div>
      </section>

      {/* FAQ — targets search queries */}
      <section className="py-20 px-6 border-t border-white/8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-head font-bold text-2xl text-white mb-3">Frequently Asked Questions</h2>
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                { '@type': 'Question', name: 'What is World Chase?', acceptedAnswer: { '@type': 'Answer', text: 'World Chase is a free online geography game where players solve cryptic riddles to find real locations around the world using Google Maps. It is a weekly competitive geography challenge with a global leaderboard.' } },
                { '@type': 'Question', name: 'Is World Chase free to play?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, World Chase is completely free to play. Sign up with an email address and start your first geography hunt immediately.' } },
                { '@type': 'Question', name: 'How is World Chase different from GeoGuessr?', acceptedAnswer: { '@type': 'Answer', text: 'Unlike GeoGuessr where you are dropped randomly into Street View, World Chase gives you cryptic riddles that describe a real location. You use Google Maps to explore and find the exact spot. It is a more puzzle-based geography game.' } },
                { '@type': 'Question', name: 'What kind of geography game is World Chase?', acceptedAnswer: { '@type': 'Answer', text: 'World Chase is a competitive weekly geography game combining riddles, map exploration, and a live leaderboard. Players solve location puzzles across 20 rounds of increasing difficulty — from famous landmarks to remote and obscure places.' } },
                { '@type': 'Question', name: 'Can I play a geography map game on my phone?', acceptedAnswer: { '@type': 'Answer', text: 'Yes, World Chase works on any device including phones and tablets. It is a fully mobile-friendly online geography game.' } },
              ],
            }) }}
          />
          <div className="space-y-6">
            {[
              { q: 'What is World Chase?', a: 'World Chase is a free online geography game where you solve cryptic riddles to find real locations around the world using Google Maps. It is a weekly competitive geography challenge with a live global leaderboard.' },
              { q: 'How is it different from GeoGuessr?', a: 'Unlike GeoGuessr where you are dropped randomly into Street View, World Chase gives you cryptic clues describing a real place. You explore Google Maps to hunt it down — a more puzzle-driven, competitive geography game.' },
              { q: 'What type of geography game is this?', a: 'World Chase is a riddle-based map game with 20 rounds per week, ranging from famous global landmarks all the way to remote and obscure locations. Think geography quiz meets treasure hunt.' },
              { q: 'Is it free and can I play on my phone?', a: 'Completely free to sign up and play. World Chase runs in any browser on desktop, tablet, or phone.' },
            ].map(({ q, a }) => (
              <div key={q} className="border border-white/8 p-6">
                <h3 className="font-head font-bold text-white text-sm tracking-wide mb-2">{q}</h3>
                <p className="text-text-muted font-head text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 py-8 px-6 text-center text-text-muted/50 font-head text-xs tracking-wider">
        © 2025 WORLD CHASE — HUNT THE WORLD
      </footer>
    </div>
  )
}
