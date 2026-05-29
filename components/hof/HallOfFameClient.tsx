'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { ACHIEVEMENTS } from '@/lib/achievements'

type Country  = { code: string; name: string }
type HofEntry = {
  rank: number
  user_id: string
  all_time_score: number
  rounds_won: number
  events_played: number
  profiles: {
    username: string
    display_name: string | null
    equipped_avatar: string | null
    equipped_border: string | null
    equipped_title: string | null
    equipped_badge: string | null
    country: string | null
    country_code: string | null
  } | null
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const RANK_STYLES: Record<number, { row: string; score: string }> = {
  1: { row: 'bg-yellow-400/8 border-yellow-400/40 shadow-[0_0_24px_rgba(250,204,21,0.1)]', score: 'text-yellow-300' },
  2: { row: 'bg-gray-300/5 border-gray-300/25', score: 'text-gray-300' },
  3: { row: 'bg-amber-600/5 border-amber-600/25', score: 'text-amber-400' },
}

export default function HallOfFameClient({ currentUserId }: { currentUserId?: string }) {
  const [entries,   setEntries]   = useState<HofEntry[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [country,   setCountry]   = useState<string>('') // '' = global
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = '/api/hall-of-fame' + (country ? `?country=${country}` : '')
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries ?? [])
        if (d.countries?.length) setCountries(d.countries)
        setLoading(false)
      })
  }, [country])

  return (
    <div>
      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {/* Global button */}
        <button
          onClick={() => setCountry('')}
          className={`flex items-center gap-2 px-4 py-2 font-head font-bold text-xs tracking-widest border transition-all ${
            !country ? 'bg-gold text-navy border-gold' : 'text-text-muted border-white/20 hover:border-gold/40 hover:text-white'
          }`}
        >
          🌍 GLOBAL
        </button>

        {/* Country dropdown */}
        <div className="relative">
          <select
            value={country}
            onChange={e => setCountry(e.target.value)}
            className={`appearance-none font-head font-bold text-xs tracking-widest px-4 py-2 pr-8 border transition-all bg-navy outline-none cursor-pointer ${
              country ? 'bg-gold text-navy border-gold' : 'text-text-muted border-white/20 hover:border-gold/40 hover:text-white'
            }`}
          >
            <option value="">🏳 BY COUNTRY</option>
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs opacity-60">▾</span>
        </div>

        <div className="ml-auto text-xs font-head text-text-muted">
          {country
            ? `${countries.find(c => c.code === country)?.name ?? country} · ${entries.length} hunters`
            : `Global · ${entries.length} hunters`}
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-navy-light border border-white/5 animate-pulse"
                 style={{ animationDelay: `${i * 0.05}s` }} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Header */}
          <div className="grid grid-cols-[56px_1fr_90px_90px_80px] gap-2 px-4 py-2 text-xs font-head text-text-muted tracking-widest border-b border-white/10 mb-2">
            <span>RANK</span>
            <span>HUNTER</span>
            <span className="text-right">SCORE</span>
            <span className="text-right">ROUNDS</span>
            <span className="text-right">EVENTS</span>
          </div>

          {entries.map((entry, i) => {
            const isMe    = entry.user_id === currentUserId
            const profile = entry.profiles
            const style   = RANK_STYLES[entry.rank] ?? { row: 'border-white/5', score: 'text-white' }
            const name    = profile?.display_name || (profile?.username ?? 'Anonymous')
            const badge   = profile?.equipped_badge
              ? ACHIEVEMENTS.find(a => a.id === profile.equipped_badge)
              : null

            return (
              <Link
                key={entry.user_id}
                href={`/profile/${profile?.username ?? entry.user_id}`}
                className={`grid grid-cols-[56px_1fr_90px_90px_80px] gap-2 px-4 py-3 border items-center transition-all group
                  ${isMe ? 'border-gold/50 bg-gold/8' : style.row}
                  hover:border-gold/30 hover:bg-white/[0.03]`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center">
                  {entry.rank <= 3
                    ? <span className="text-xl">{MEDAL[entry.rank]}</span>
                    : <span className="font-mono font-bold text-text-muted text-sm">#{entry.rank}</span>}
                </div>

                {/* Hunter */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar
                    emoji={profile?.equipped_avatar ?? '🌍'}
                    border={profile?.equipped_border ?? 'none'}
                    size="xs"
                    countryCode={profile?.country_code}
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className={`flex items-center gap-1.5 font-head font-bold text-sm truncate group-hover:text-gold transition-colors ${isMe ? 'text-gold' : 'text-white'}`}>
                      <span className="truncate">{name}</span>
                      {isMe && <span className="text-xs text-gold/60">(you)</span>}
                      {badge && (
                        <span className="badge-wrap shrink-0">
                          <span className="text-sm leading-none">{badge.emoji}</span>
                          <span className="badge-tip">{badge.label}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {profile?.equipped_title && (
                        <span className="text-xs text-text-muted font-head truncate">{profile.equipped_title}</span>
                      )}
                      {profile?.country && (
                        <span className="text-xs text-text-muted/50 font-head shrink-0">
                          {profile.country_code && `· ${profile.country}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <span className={`text-right font-mono font-bold text-sm ${style.score}`}>
                  {entry.all_time_score.toLocaleString()}
                </span>

                {/* Rounds won */}
                <span className="text-right font-mono text-sm text-text-muted">
                  {entry.rounds_won}
                </span>

                {/* Events */}
                <span className="text-right font-mono text-sm text-text-muted">
                  {entry.events_played}
                </span>
              </Link>
            )
          })}

          {entries.length === 0 && (
            <div className="text-center py-20 text-text-muted font-head">
              <div className="text-4xl mb-3">🏆</div>
              <div className="text-sm">No hunters on the board yet{country ? ' for this country' : ''}.</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
