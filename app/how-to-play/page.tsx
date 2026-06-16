import type { Metadata } from 'next'
import Link from 'next/link'
import GlobalNav from '@/components/ui/GlobalNav'
import { getUser } from '@/lib/auth'
import { KEYBOARD_SHORTCUTS } from '@/lib/keyboard-shortcuts'

export const metadata: Metadata = {
  title: 'How to Play',
  description: 'Learn how to play World Chase — the weekly competitive geography game. Solve cryptic clues, explore Google Maps, hunt for tokens, and climb the global leaderboard.',
  keywords: ['how to play world chase', 'geography game rules', 'geography quiz guide', 'learn geography game'],
}

const STEPS = [
  {
    n: '01', title: 'READ THE RIDDLE',
    desc: 'Each round gives you a cryptic clue — no country name, no obvious hints. Just a carefully crafted description pointing to somewhere real on Earth.',
  },
  {
    n: '02', title: 'OPEN GOOGLE MAPS',
    desc: 'The full Google Maps is yours. Zoom anywhere, switch to Street View, go satellite. The answer is out there — you just have to find it.',
  },
  {
    n: '03', title: 'EXPLORE & THINK',
    desc: 'Navigate the map region. Use geography knowledge, clues, and instinct. You can reveal up to 3 extra clues (1 token each) if you\'re stuck.',
  },
  {
    n: '04', title: 'SUBMIT YOUR ANSWER',
    desc: 'Type the location name and hit Enter. Wrong guesses cost a small score penalty — think before you submit. You can try as many times as you need.',
  },
  {
    n: '05', title: 'COLLECT TOKENS',
    desc: 'While exploring, hidden token caches are scattered across the region. Activate your radar with [H] and navigate close enough to collect them.',
  },
  {
    n: '06', title: 'CLIMB THE LEADERBOARD',
    desc: 'Score depends on difficulty, speed, clues used, and wrong answers. Race to the top — the global leaderboard resets every week.',
  },
]

const SCORING = [
  { diff: 'Easy',    base: '500',   clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Medium',  base: '1,000', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Hard',    base: '2,500', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Extreme', base: '5,000', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
  { diff: 'Pro',     base: '10,000', clue: '−20% each', wrong: '−5% each', speed: '+10% under 10min' },
]

const EARN = [
  { action: 'Complete any round',             amount: '+1 token' },
  { action: '3-day login streak',             amount: '+1 token' },
  { action: '7-day consecutive streak',       amount: '+2 tokens' },
  { action: '30-day streak',                  amount: '+5 tokens' },
  { action: 'Find a hidden token on the map', amount: '+1 token' },
  { action: 'Geo Quiz — participation',       amount: '+50 pts' },
  { action: 'Onboarding steps (one-time)',    amount: '+7 tokens' },
]

const SPEND = [
  { action: 'Reveal Clue 2', amount: '1 token' },
  { action: 'Reveal Clue 3', amount: '1 token' },
  { action: 'Reveal Clue 4', amount: '1 token' },
  { action: 'Skip a round (0 points)', amount: '2 tokens' },
  { action: 'Shop — avatar, border, title', amount: 'varies' },
]

const TIPS = [
  { emoji: '🎯', text: 'Clue 1 is always free — read it carefully before touching the map.' },
  { emoji: '⚡', text: 'Solve within 10 minutes for a 10% speed bonus on top of your base score.' },
  { emoji: '🗺️', text: 'Street View is your best friend. Hop in and look for signs, landscape, or architecture.' },
  { emoji: '🪙', text: 'Don\'t spend tokens recklessly — save them for the hard, extreme, and pro rounds where they matter most.' },
  { emoji: '📍', text: 'Drop map pins while you explore. You get 5 per round — use them as waypoints.' },
  { emoji: '📡', text: 'Always sweep the map with [H] radar before submitting — hidden tokens are free score.' },
  { emoji: '🧠', text: 'Play the Daily Geo Quiz every day — even 50 pts per quiz adds up fast on the weekly leaderboard.' },
  { emoji: '⚔️', text: 'Challenge friends to a VS Duel — win to earn bonus tokens and bragging rights.' },
]

const GAME_MODES = [
  {
    icon: '🌍',
    title: 'WEEKLY HUNT',
    color: 'text-gold border-gold/30',
    desc: '20 cryptic riddles, one per round. Race to crack every location before the week ends. Your total score goes on the global leaderboard.',
    href: '/play',
    cta: 'PLAY NOW',
  },
  {
    icon: '🧠',
    title: 'DAILY GEO QUIZ',
    color: 'text-electric border-electric/30',
    desc: '20 multiple-choice geography questions. 20 seconds per question — answer faster for more points. New quiz every day at midnight UTC.',
    href: '/quiz',
    cta: 'TODAY\'S QUIZ',
  },
  {
    icon: '⚔️',
    title: 'VS DUEL',
    color: 'text-gold border-gold/30',
    desc: 'Challenge another player to a head-to-head location guessing battle. Both hunters get the same riddle — first to crack it wins.',
    href: '/vs',
    cta: 'DUEL NOW',
  },
  {
    icon: '📅',
    title: 'DAILY CHALLENGE',
    color: 'text-text-muted border-white/15',
    desc: 'A fresh standalone location challenge every day. No weekly pressure — just a quick daily hunt to keep your skills sharp.',
    href: '/daily',
    cta: 'PLAY DAILY',
  },
]

export default async function HowToPlayPage() {
  const user = await getUser()
  const groups = Array.from(new Set(KEYBOARD_SHORTCUTS.map(s => s.group)))

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-14 sm:space-y-16">

        {/* ── HEADER ── */}
        <div>
          <div className="text-xs text-gold font-head tracking-[0.3em] mb-2">FIELD MANUAL</div>
          <h1 className="font-head font-bold text-3xl sm:text-4xl text-white mb-3">How to Play</h1>
          <p className="text-text-muted font-head leading-relaxed text-sm sm:text-base">
            World Chase is a weekly competitive geography game. Every week, 20 rounds go live — each one is a cryptic riddle describing a real location somewhere on Earth. Solve them all before the week ends and climb to the top of the global leaderboard. Plus play the daily quiz, duel friends, and customise your hunter.
          </p>
        </div>

        {/* ── GAME MODES ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-5">GAME MODES</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {GAME_MODES.map(m => (
              <div key={m.title} className={`border p-5 flex flex-col gap-3 ${m.color}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{m.icon}</span>
                  <span className={`font-head font-bold text-sm tracking-wider ${m.color.split(' ')[0]}`}>{m.title}</span>
                </div>
                <p className="text-text-muted font-head text-sm leading-relaxed flex-1">{m.desc}</p>
                <Link href={m.href} className={`self-start text-xs font-head font-bold tracking-widest border px-3 py-1.5 transition-colors hover:bg-white/5 ${m.color}`}>
                  {m.cta} →
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW A ROUND WORKS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-5">HOW A HUNT ROUND WORKS</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {STEPS.map(s => (
              <div key={s.n} className="border border-white/8 p-5 bracket-box">
                <div className="font-mono text-gold/50 text-xs mb-1">{s.n}</div>
                <h3 className="font-head font-bold text-white text-sm tracking-wider mb-2">{s.title}</h3>
                <p className="text-text-muted font-head text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── DAILY GEO QUIZ ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">DAILY GEO QUIZ</h2>
          <div className="border border-electric/25 p-5 sm:p-6 font-head space-y-4"
            style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.04) 0%, transparent 60%)' }}>
            <p className="text-text-muted text-sm leading-relaxed">
              A fresh set of 20 geography trivia questions drops every day at midnight UTC. Answer as fast as you can — speed matters.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-electric font-bold text-xs tracking-widest mb-2">HOW IT WORKS</div>
                <ul className="text-text-muted text-sm space-y-1.5">
                  <li>→ 20 multiple-choice questions per quiz</li>
                  <li>→ 20 seconds to answer each question</li>
                  <li>→ Answer faster = more bonus points</li>
                  <li>→ Correct answer: <span className="text-white">100 pts + up to 100 speed bonus</span></li>
                  <li>→ Scores added to weekly leaderboard</li>
                  <li>→ New quiz every day — no repeats</li>
                </ul>
              </div>
              <div>
                <div className="text-gold font-bold text-xs tracking-widest mb-2">🎁 DAILY PRIZE POOL</div>
                <div className="space-y-1 text-sm">
                  {[
                    { label: '🥇 1st Place',       val: '150 🪙', gold: true },
                    { label: '🥈 2nd Place',       val: '100 🪙' },
                    { label: '🥉 3rd Place',       val: '75 🪙' },
                    { label: '4th – 5th',         val: '50 🪙' },
                    { label: '6th – 10th',        val: '25 🪙' },
                    { label: 'Everyone else',     val: '10 🪙' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className={`font-head ${r.gold ? 'text-gold font-bold' : 'text-text-muted'}`}>{r.label}</span>
                      <span className={`font-mono font-bold ${r.gold ? 'text-gold' : 'text-text-muted'}`}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── VS DUEL ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">VS DUEL</h2>
          <div className="border border-gold/25 p-5 sm:p-6 font-head space-y-3"
            style={{ background: 'linear-gradient(135deg, rgba(245,197,24,0.04) 0%, transparent 60%)' }}>
            <p className="text-text-muted text-sm leading-relaxed">
              Challenge any registered player to a 1v1 geography battle. Both of you get the same location riddle — whoever cracks it first wins.
            </p>
            <ul className="text-text-muted text-sm space-y-1.5">
              <li>→ Send a challenge from the <Link href="/vs" className="text-gold underline">VS DUEL</Link> page — search any username</li>
              <li>→ Your opponent receives a notification to accept</li>
              <li>→ Once accepted, both hunters get the same riddle simultaneously</li>
              <li>→ The hunter who submits the correct answer first wins the duel</li>
              <li>→ Win streaks and duel records are tracked on your profile</li>
            </ul>
          </div>
        </section>

        {/* ── THE GAME INTERFACE ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">THE HUNT INTERFACE</h2>
          <div className="border border-white/10 p-5 sm:p-6 font-head space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-electric font-bold text-xs tracking-widest mb-2">LEFT PANEL — YOUR MISSION</div>
                <ul className="text-text-muted text-sm space-y-1.5 leading-relaxed">
                  <li>📜 <span className="text-white font-bold">Riddle clues</span> — start with 1, unlock up to 4</li>
                  <li>⌨️ <span className="text-white font-bold">Answer input</span> — type the location name</li>
                  <li>📊 <span className="text-white font-bold">Attempt history</span> — track your guesses</li>
                  <li>💡 <span className="text-white font-bold">Clue buttons</span> — spend 1 token to reveal each</li>
                  <li>⏭️ <span className="text-white font-bold">Skip button</span> — skip for 2 tokens (0 points)</li>
                </ul>
              </div>
              <div>
                <div className="text-electric font-bold text-xs tracking-widest mb-2">RIGHT PANEL — GOOGLE MAPS</div>
                <ul className="text-text-muted text-sm space-y-1.5 leading-relaxed">
                  <li>🗺️ <span className="text-white font-bold">Interactive map</span> — zoom, pan, explore anywhere</li>
                  <li>🚶 <span className="text-white font-bold">Street View</span> — drop in and look around</li>
                  <li>🛰️ <span className="text-white font-bold">Satellite mode</span> — switch with [S]</li>
                  <li>📍 <span className="text-white font-bold">Pin drops</span> — click to mark locations (5 max)</li>
                  <li>📡 <span className="text-white font-bold">Token radar</span> — activate with [H]</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-white/8 pt-4">
              <div className="text-electric font-bold text-xs tracking-widest mb-2">TOP BAR — BATTLE HUD</div>
              <p className="text-text-muted text-sm leading-relaxed">
                Shows your <span className="text-white font-bold">round number</span>, <span className="text-white font-bold">difficulty</span>, <span className="text-white font-bold">live timer</span>, <span className="text-white font-bold">current rank</span>, and <span className="text-white font-bold">token balance</span>. The timer bar at the top changes from blue → orange → red as time runs out.
              </p>
            </div>
          </div>
        </section>

        {/* ── TIPS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">TIPS FROM THE FIELD</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {TIPS.map(t => (
              <div key={t.emoji} className="flex gap-3 border border-white/8 p-4">
                <span className="text-xl shrink-0">{t.emoji}</span>
                <p className="text-text-muted font-head text-sm leading-relaxed">{t.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── SCORING ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">SCORING SYSTEM</h2>
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-sm font-head border-collapse min-w-[480px]">
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
          <div className="mt-5 border border-purple-400/40 bg-purple-400/5 p-4 font-head">
            <div className="text-purple-400 font-bold text-xs tracking-widest mb-2">⚠ PRO DIFFICULTY — ROUNDS 21–25</div>
            <p className="text-text-muted text-sm leading-relaxed">
              Pro rounds are genuinely brutal. Locations are chosen from the most obscure, unexcavated, and barely-mapped places on Earth — micro-territories, unnamed ruins, and sites that don't appear in any tourist database.{' '}
              <span className="text-white font-bold">Your map always starts on a completely different continent from the answer.</span>{' '}
              No landmarks. No obvious region. Just the riddle and your instincts.
            </p>
          </div>
          <p className="text-text-muted font-head text-sm mt-3">
            Maximum possible score for a perfect week:{' '}
            <span className="text-gold font-bold">97,500 pts</span>
          </p>
        </section>

        {/* ── TOKENS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">TOKEN SYSTEM</h2>
          <p className="text-text-muted font-head mb-4 text-sm">
            Starting tokens: <span className="text-gold font-bold">2 free on signup</span>
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-success font-head font-bold text-sm tracking-wider mb-3">EARN TOKENS</h3>
              <div className="space-y-2">
                {EARN.map(e => (
                  <div key={e.action} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                    <span className="text-text-muted font-head text-sm">{e.action}</span>
                    <span className="text-success font-mono text-sm font-bold shrink-0">{e.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-danger font-head font-bold text-sm tracking-wider mb-3">SPEND TOKENS</h3>
              <div className="space-y-2">
                {SPEND.map(s => (
                  <div key={s.action} className="flex justify-between gap-2 border-b border-white/5 pb-2">
                    <span className="text-text-muted font-head text-sm">{s.action}</span>
                    <span className="text-danger font-mono text-sm font-bold shrink-0">{s.amount}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 border border-gold/20 bg-gold/5">
                <p className="text-text-muted font-head text-xs leading-relaxed">
                  Need more tokens?{' '}
                  <Link href="/tokens" className="text-gold hover:text-gold-dim transition-colors font-bold">
                    Purchase a bundle →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── STREAKS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">LOGIN STREAKS</h2>
          <div className="border border-white/10 p-5 font-head text-text-muted space-y-3">
            <p className="text-sm leading-relaxed">
              Log in every day to build a streak. The longer your streak, the bigger the token bonuses. Your streak resets if you miss a day.
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { days: '3 days', reward: '+1 token', color: 'text-white' },
                { days: '7 days', reward: '+2 tokens', color: 'text-electric' },
                { days: '30 days', reward: '+5 tokens', color: 'text-gold' },
              ].map(s => (
                <div key={s.days} className="border border-white/10 p-3">
                  <div className={`font-mono font-bold text-lg ${s.color}`}>{s.reward}</div>
                  <div className="text-xs font-head text-text-muted mt-0.5">{s.days} streak</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SHOP & COSMETICS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">SHOP & COSMETICS</h2>
          <div className="border border-white/10 p-5 font-head space-y-3">
            <p className="text-text-muted text-sm leading-relaxed">
              Spend your tokens in the <Link href="/shop" className="text-gold underline">Hunter Shop</Link> to customise how you appear across the game — on the leaderboard, in chat, and in VS duels.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { icon: '🧑', label: 'AVATARS', desc: 'Emoji or upload your own photo. Rarity from Common to Ultimate.' },
                { icon: '⬡', label: 'BORDERS', desc: 'Animated rings around your avatar. Electric, Fire, Galaxy, Rainbow and more.' },
                { icon: '🏷', label: 'TITLES', desc: 'Display a title below your name on the leaderboard and in chat.' },
                { icon: '💬', label: 'REACTIONS', desc: 'Premium emoji reactions for the global chat.' },
              ].map(c => (
                <div key={c.label} className="flex gap-3 border border-white/8 p-3">
                  <span className="text-xl shrink-0">{c.icon}</span>
                  <div>
                    <div className="text-white font-head font-bold text-xs tracking-widest mb-0.5">{c.label}</div>
                    <p className="text-text-muted font-head text-xs leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HIDDEN TOKENS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">HIDDEN TOKEN CACHES</h2>
          <div className="border border-white/10 p-5 font-head text-text-muted leading-relaxed space-y-3">
            <p className="text-sm">Each round hides 2–4 token caches somewhere in the map region. They are <span className="text-white font-bold">NOT</span> at the answer location — you must explore to find them.</p>
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              <li>Press <kbd className="bg-white/10 px-1.5 font-mono text-xs text-gold">[H]</kbd> to activate your token radar</li>
              <li>Navigate your map view around the region</li>
              <li>When within 500m of a hidden token, the radar blips</li>
              <li>The closer you get, the faster the radar pulses</li>
              <li>Come within 50m and the token is automatically collected</li>
            </ol>
            <p className="text-sm">Hidden tokens are yours regardless of whether you solve the round — exploration is always rewarded.</p>
          </div>
        </section>

        {/* ── KEYBOARD CONTROLS ── */}
        <section>
          <h2 className="font-head font-bold text-xl text-gold tracking-wider mb-4">KEYBOARD CONTROLS</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {groups.map(group => (
              <div key={group}>
                <h3 className="text-text-muted font-head font-bold text-xs tracking-widest mb-3">{group}</h3>
                <div className="space-y-2">
                  {KEYBOARD_SHORTCUTS.filter(s => s.group === group).map(s => (
                    <div key={s.key} className="flex justify-between gap-2">
                      <span className="text-text-muted font-head text-sm">{s.action}</span>
                      <kbd className="bg-white/10 px-1.5 py-0.5 font-mono text-xs text-gold shrink-0">{s.key}</kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="text-center pt-4 pb-8">
          {user ? (
            <Link
              href="/play"
              className="inline-block px-8 sm:px-10 py-4 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all gold-glow"
            >
              GO TO YOUR ROUNDS →
            </Link>
          ) : (
            <Link
              href="/auth/signup"
              className="inline-block px-8 sm:px-10 py-4 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all gold-glow"
            >
              START HUNTING — FREE
            </Link>
          )}
        </div>

      </div>
    </div>
  )
}
