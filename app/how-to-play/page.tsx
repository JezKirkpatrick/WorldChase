'use client'
import Link from 'next/link'
import { KEYBOARD_SHORTCUTS } from '@/hooks/useKeyboard'

const SCORING = [
  { diff: 'Easy', base: '500', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Medium', base: '1,000', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Hard', base: '2,500', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Extreme', base: '5,000', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
]

const EARN = [
  { action: 'Complete any round', amount: '+1 token' },
  { action: 'Daily login bonus', amount: '+1 token' },
  { action: '7-day consecutive streak', amount: '+5 tokens' },
  { action: 'Find a hidden token on map', amount: '+1–2 tokens' },
  { action: 'Refer a friend who joins', amount: '+3 tokens' },
]

const SPEND = [
  { action: 'Reveal Clue 2', amount: '1 token' },
  { action: 'Reveal Clue 3', amount: '1 token' },
  { action: 'Reveal Clue 4', amount: '1 token' },
  { action: 'Skip a round (0 points)', amount: '2 tokens' },
]

export default function HowToPlayPage() {
  const groups = Array.from(new Set(KEYBOARD_SHORTCUTS.map(s => s.group)))

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-6">
        <Link href="/" className="font-head font-bold text-gold text-lg tracking-widest">WORLD CHASE</Link>
        <Link href="/auth/signup" className="px-4 py-2 bg-gold text-navy font-head font-bold text-xs tracking-widest hover:bg-gold-dim">JOIN FREE</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-14">
        <div>
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-2">FIELD MANUAL</div>
          <h1 className="font-head font-bold text-4xl text-white">How to Play</h1>
        </div>

        {/* Scoring */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">SCORING SYSTEM</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-head border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-text-muted text-xs tracking-widest">
                  <th className="text-left py-2 pr-4">DIFFICULTY</th>
                  <th className="text-right py-2 pr-4">BASE</th>
                  <th className="text-right py-2 pr-4">CLUE PENALTY</th>
                  <th className="text-right py-2 pr-4">WRONG ANSWER</th>
                  <th className="text-right py-2">SPEED BONUS</th>
                </tr>
              </thead>
              <tbody>
                {SCORING.map(s => (
                  <tr key={s.diff} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-white font-bold">{s.diff}</td>
                    <td className="py-3 pr-4 text-right font-mono text-gold">{s.base}</td>
                    <td className="py-3 pr-4 text-right font-mono text-danger">{s.clue}</td>
                    <td className="py-3 pr-4 text-right font-mono text-danger">{s.wrong}</td>
                    <td className="py-3 text-right font-mono text-success">{s.speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-text-muted font-head text-sm mt-3">Maximum possible score for a perfect month: <span className="text-gold font-bold">47,500 pts</span></p>
        </section>

        {/* Tokens */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">TOKEN SYSTEM</h2>
          <p className="text-text-muted font-head mb-4">Starting tokens: <span className="text-gold font-bold">3 (free on signup)</span></p>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-success font-head font-bold text-sm tracking-wider mb-3">EARN TOKENS</h3>
              <div className="space-y-2">
                {EARN.map(e => (
                  <div key={e.action} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-text-muted font-head text-sm">{e.action}</span>
                    <span className="text-success font-mono text-sm font-bold">{e.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-danger font-head font-bold text-sm tracking-wider mb-3">SPEND TOKENS</h3>
              <div className="space-y-2">
                {SPEND.map(s => (
                  <div key={s.action} className="flex justify-between border-b border-white/5 pb-2">
                    <span className="text-text-muted font-head text-sm">{s.action}</span>
                    <span className="text-danger font-mono text-sm font-bold">{s.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hidden tokens */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">HIDDEN TOKEN CACHES</h2>
          <div className="border border-white/10 p-5 font-head text-text-muted leading-relaxed space-y-3">
            <p>Each round hides 2–4 token caches somewhere in the map region. They are <span className="text-white font-bold">NOT</span> at the answer location — you must explore to find them.</p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              <li>Press <kbd className="bg-white/10 px-1.5 font-mono text-xs text-gold">[H]</kbd> to activate your token radar</li>
              <li>Navigate your map view around the region</li>
              <li>When within 500m of a hidden token, the radar blips</li>
              <li>The closer you get, the faster the radar pulses</li>
              <li>Come within 50m and the token is automatically collected</li>
            </ol>
            <p className="text-sm">Hidden tokens are yours regardless of whether you solve the round. Exploration is always rewarded.</p>
          </div>
        </section>

        {/* Keyboard shortcuts */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">KEYBOARD CONTROLS</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group}>
                <h3 className="text-text-muted font-head font-bold text-xs tracking-widest mb-3">{group}</h3>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS.filter(s => s.group === group).map(s => (
                    <div key={s.key} className="flex justify-between">
                      <span className="text-text-muted font-head text-sm">{s.action}</span>
                      <kbd className="bg-white/10 px-1.5 py-0.5 font-mono text-xs text-gold">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="text-center pt-4">
          <Link href="/auth/signup" className="inline-block px-10 py-4 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all gold-glow">
            START HUNTING — FREE
          </Link>
        </div>
      </div>
    </div>
  )
}
