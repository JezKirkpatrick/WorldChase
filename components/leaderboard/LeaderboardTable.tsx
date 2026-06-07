'use client'
import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import RankBadge from './RankBadge'
import Avatar from '@/components/ui/Avatar'
import { ACHIEVEMENTS } from '@/lib/achievements'
import { safeDisplayName, safeHandle } from '@/lib/userDisplay'

type ActiveTab = 'score' | 'global' | 'allEvents'
type Scope = 'global' | 'country'

interface LeaderboardTableProps {
  eventId: string
  currentUserId?: string
  userCountry?: string | null
}

const TABS: { id: ActiveTab; icon: string; label: string; desc: string }[] = [
  { id: 'score',     icon: '🥇', label: 'TOP SCORE',    desc: 'Highest score this event' },
  { id: 'global',    icon: '🌍', label: 'GLOBAL STAGE', desc: 'All hunters worldwide' },
  { id: 'allEvents', icon: '📅', label: 'ALL EVENTS',   desc: 'Cumulative all-time totals' },
]

const PODIUM_BG: Record<number, string> = {
  1: 'bg-yellow-400/8 border-yellow-400/40',
  2: 'bg-gray-300/5 border-gray-300/25',
  3: 'bg-amber-600/5 border-amber-600/25',
}
const RANK_GLOW: Record<number, string> = {
  1: 'shadow-[0_0_20px_rgba(250,204,21,0.15)]',
  2: 'shadow-[0_0_12px_rgba(200,200,200,0.08)]',
  3: 'shadow-[0_0_12px_rgba(180,100,20,0.08)]',
}

function safeStr(val: any): string | null {
  if (!val || val === 'null' || val === 'undefined') return null
  return String(val)
}

function countryFlag(code: string) {
  try {
    return code.toUpperCase().replace(/./g, c =>
      String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
    )
  } catch { return '🌍' }
}

function EntryRow({ entry, isMe, delay = 0, allTime = false }: { entry: any; isMe: boolean; delay?: number; allTime?: boolean }) {
  const profile     = entry.profiles
  const rank        = typeof entry.rank === 'number' ? entry.rank : null
  const podiumStyle = rank ? (PODIUM_BG[rank] ?? 'border-white/5') : 'border-white/5'
  const glowStyle   = rank ? (RANK_GLOW[rank] ?? '') : ''
  const equippedTitle = safeStr(profile?.equipped_title)

  return (
    <motion.div layout initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.25 }}>
      <Link
        href={`/profile/${safeHandle(profile) === 'new-player' ? entry.user_id : safeHandle(profile)}`}
        className={`grid grid-cols-[52px_1fr_72px] sm:grid-cols-[52px_1fr_72px_72px] md:grid-cols-[64px_1fr_80px_100px_90px] gap-2 px-3 md:px-4 py-3 border items-center transition-all cursor-pointer group
          ${isMe ? 'border-gold/60 bg-gold/10 shadow-[0_0_20px_rgba(245,197,24,0.08)]' : podiumStyle}
          ${!isMe ? glowStyle : ''}
          hover:border-gold/30 hover:bg-white/3`}
      >
        <RankBadge rank={rank} previousRank={entry.previous_rank} />

        <div className="flex items-center gap-2 min-w-0">
          <div className="relative shrink-0" style={{ overflow: 'visible' }}>
            {rank != null && rank <= 3 && (
              <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-sm leading-none pointer-events-none select-none ${
                rank === 1 ? 'text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]' :
                rank === 2 ? 'text-slate-300 drop-shadow-[0_0_4px_rgba(200,200,220,0.7)]' :
                             'text-amber-700 drop-shadow-[0_0_4px_rgba(180,100,20,0.7)]'
              }`}>♛</span>
            )}
            <Avatar emoji={safeStr(profile?.equipped_avatar) ?? '🌍'} border={profile?.equipped_border ?? 'none'} size="xs" countryCode={profile?.country_code} />
          </div>
          <div className="min-w-0">
            <div className={`flex items-center gap-1.5 font-head font-bold text-sm truncate group-hover:text-gold transition-colors ${isMe ? 'text-gold' : 'text-white'}`}>
              <span className="truncate">
                {safeDisplayName(profile)}
                {isMe && <span className="text-xs text-gold/60 ml-1">(you)</span>}
              </span>
              {profile?.equipped_badge && (() => {
                const badge = ACHIEVEMENTS.find(a => a.id === profile.equipped_badge)
                return badge ? (
                  <span className="badge-wrap shrink-0">
                    <span className="text-sm leading-none">{badge.emoji}</span>
                    <span className="badge-tip">{badge.label} — {badge.desc}</span>
                  </span>
                ) : null
              })()}
            </div>
            {equippedTitle && (
              <div className="text-xs text-text-muted font-head truncate">{equippedTitle}</div>
            )}
          </div>
        </div>

        <span className="hidden sm:block text-right font-mono text-sm text-text-muted">
          {allTime
            ? (entry.challenges_completed > 0 ? entry.challenges_completed : '—')
            : (entry.challenges_completed > 0 ? `${entry.challenges_completed}/20` : '—')}
        </span>
        <span className={`text-right font-mono font-bold text-sm ${rank != null && (rank <= 3 || isMe) ? 'text-gold' : 'text-white'}`}>
          {entry.total_score > 0 ? entry.total_score.toLocaleString() : '—'}
        </span>
        <div className="hidden md:block text-right">
          {allTime
            ? <span className="text-xs text-electric font-head">{entry.challenges_completed} rounds</span>
            : entry.challenges_completed === 20
              ? <span className="text-xs text-success font-head tracking-wider">✓ DONE</span>
              : <span className="text-xs text-electric font-head">HUNTING</span>}
        </div>
      </Link>
    </motion.div>
  )
}

const PAGE = 50

export default function LeaderboardTable({ eventId, currentUserId, userCountry }: LeaderboardTableProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('score')
  const [scope, setScope]         = useState<Scope>('global')
  const [selectedCountry, setSelectedCountry] = useState<string>(userCountry ?? '')
  const [showCountryPicker, setShowCountryPicker] = useState(false)

  // Smart view state
  const [top, setTop]           = useState<any[]>([])
  const [neighbourhood, setNbh] = useState<any[] | null>(null)
  const [myRank, setMyRank]     = useState<number | null>(null)
  const [total, setTotal]       = useState<number | null>(null)

  // Browse / alltime state
  const [allEntries, setAllEntries]   = useState<any[]>([])
  const [loadedPages, setLoadedPages] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [allLoaded, setAllLoaded]     = useState(false)

  // Countries available in loaded data
  const [availCountries, setAvailCountries] = useState<string[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)

  function extractCountries(entries: any[]) {
    const set = new Set<string>()
    for (const e of entries) {
      const cc = e.profiles?.country_code
      if (cc) set.add(cc)
    }
    return Array.from(set).sort()
  }

  function mergeCountries(existing: string[], fromEntries: any[]) {
    const combined = new Set([...existing, ...extractCountries(fromEntries)])
    return Array.from(combined).sort()
  }

  // ── Smart view ────────────────────────────────────────────────────────────
  function loadSmart() {
    setLoading(true)
    setError(false)
    const url = currentUserId
      ? `/api/leaderboard?eventId=${eventId}&userId=${currentUserId}&mode=smart`
      : `/api/leaderboard?eventId=${eventId}&mode=smart`
    fetch(url)
      .then(r => r.json())
      .then(d => {
        const topEntries = d.top ?? []
        const nbh        = d.neighbourhood ?? null
        setTop(topEntries)
        setNbh(nbh)
        setMyRank(d.myRank ?? null)
        setTotal(d.total ?? null)
        setAvailCountries(mergeCountries([], [...topEntries, ...(nbh ?? [])]))
        setLoading(false)
      })
      .catch(() => { setLoading(false); setError(true) })
  }

  // ── Browse all (paginated) ─────────────────────────────────────────────────
  const loadFirstPage = useCallback(() => {
    setLoadingMore(true)
    setAllEntries([])
    setLoadedPages(0)
    setAllLoaded(false)
    fetch(`/api/leaderboard?eventId=${eventId}&limit=${PAGE}&offset=0`)
      .then(r => r.json())
      .then(d => {
        const entries = d.entries ?? []
        setAllEntries(entries)
        setLoadedPages(1)
        setAllLoaded(entries.length < PAGE)
        setTotal(prev => d.total ?? prev)
        setAvailCountries(prev => mergeCountries(prev, entries))
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }, [eventId])

  function loadMore() {
    if (loadingMore || allLoaded) return
    setLoadingMore(true)
    fetch(`/api/leaderboard?eventId=${eventId}&limit=${PAGE}&offset=${loadedPages * PAGE}`)
      .then(r => r.json())
      .then(d => {
        const entries = d.entries ?? []
        setAllEntries(prev => [...prev, ...entries])
        setLoadedPages(p => p + 1)
        setAllLoaded(entries.length < PAGE)
        setAvailCountries(prev => mergeCountries(prev, entries))
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }

  // ── All-time aggregate ────────────────────────────────────────────────────
  function loadAllTime() {
    setLoading(true)
    setError(false)
    setAllEntries([])
    fetch(`/api/leaderboard?mode=alltime`)
      .then(r => r.json())
      .then(d => {
        const entries = d.entries ?? []
        setAllEntries(entries)
        setAllLoaded(true)
        setTotal(d.total ?? null)
        setAvailCountries(prev => mergeCountries(prev, entries))
        setLoading(false)
      })
      .catch(() => { setLoading(false); setError(true) })
  }

  // Initial load
  useEffect(() => { loadSmart() }, [eventId, currentUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tab switching
  function handleTabChange(tab: ActiveTab) {
    if (tab === activeTab) return
    setActiveTab(tab)
    if (tab === 'score') {
      loadSmart()
    } else if (tab === 'global') {
      setLoading(false)
      loadFirstPage()
    } else {
      loadAllTime()
    }
  }

  // ── Country filter helpers ────────────────────────────────────────────────
  function filterByCountry<T extends { profiles: any }>(entries: T[]): T[] {
    if (scope === 'global' || !selectedCountry) return entries
    return entries.filter(e => e.profiles?.country_code === selectedCountry)
  }

  function rerank<T>(entries: T[]): (T & { rank: number })[] {
    return entries.map((e, i) => ({ ...e, rank: i + 1 }))
  }

  const filteredTop = rerank(filterByCountry(top))
  const filteredNbh = neighbourhood ? rerank(filterByCountry(neighbourhood)) : null
  const filteredAll = rerank(filterByCountry(allEntries))

  const countLabel = scope === 'country' && selectedCountry
    ? `${countryFlag(selectedCountry)} ${selectedCountry.toUpperCase()} · ${activeTab === 'score' ? filteredTop.length : filteredAll.length} hunters`
    : total !== null ? `Global · ${total.toLocaleString()} hunters` : null

  // ── Tab cards + scope filter UI ───────────────────────────────────────────
  const tabsUI = (
    <div className="mb-6 space-y-3">
      {/* Three stat card tabs */}
      <div className="grid grid-cols-3 gap-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`p-3 border text-left transition-all ${
              activeTab === tab.id
                ? 'border-gold/60 bg-gold/8'
                : 'border-white/8 bg-navy-light hover:border-gold/30 hover:bg-white/3'
            }`}
          >
            <div className="text-base mb-1 leading-none">{tab.icon}</div>
            <div className={`font-head font-bold text-[10px] tracking-widest leading-tight ${activeTab === tab.id ? 'text-gold' : 'text-white'}`}>
              {tab.label}
            </div>
            <div className="text-text-muted font-head text-[9px] leading-tight mt-0.5 hidden sm:block">
              {tab.desc}
            </div>
          </button>
        ))}
      </div>

      {/* Scope filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setScope('global'); setShowCountryPicker(false) }}
          className={`flex items-center gap-1.5 px-3 py-1.5 border font-head text-xs font-bold tracking-widest transition-all ${
            scope === 'global'
              ? 'border-electric/60 text-electric bg-electric/8'
              : 'border-white/10 text-text-muted hover:border-white/30'
          }`}
        >
          🌍 GLOBAL
        </button>

        <div className="relative">
          <button
            onClick={() => {
              if (scope !== 'country') {
                setScope('country')
                if (!selectedCountry && userCountry) setSelectedCountry(userCountry)
              }
              setShowCountryPicker(p => !p)
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 border font-head text-xs font-bold tracking-widest transition-all ${
              scope === 'country'
                ? 'border-electric/60 text-electric bg-electric/8'
                : 'border-white/10 text-text-muted hover:border-white/30'
            }`}
          >
            🏳 BY COUNTRY{scope === 'country' && selectedCountry ? ` ${countryFlag(selectedCountry)}` : ''} ▾
          </button>

          {showCountryPicker && (
            <div className="absolute top-full left-0 mt-1 z-20 bg-navy border border-white/20 shadow-xl min-w-[160px] max-h-52 overflow-y-auto">
              {availCountries.length === 0 ? (
                <div className="px-3 py-3 text-text-muted font-head text-xs">Loading countries…</div>
              ) : availCountries.map(cc => (
                <button
                  key={cc}
                  onClick={() => { setSelectedCountry(cc); setShowCountryPicker(false) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 font-head text-xs text-left hover:bg-white/5 transition-colors ${selectedCountry === cc ? 'text-gold' : 'text-text-muted'}`}
                >
                  <span className="text-base leading-none">{countryFlag(cc)}</span>
                  <span className="uppercase tracking-wider flex-1">{cc}</span>
                  {selectedCountry === cc && <span className="text-gold text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {countLabel && (
          <span className="ml-auto font-head text-xs text-text-muted shrink-0">{countLabel}</span>
        )}
      </div>
    </div>
  )

  // ── Table header ──────────────────────────────────────────────────────────
  const tableHeader = (
    <div className="grid grid-cols-[52px_1fr_72px] sm:grid-cols-[52px_1fr_72px_72px] md:grid-cols-[64px_1fr_80px_100px_90px] gap-2 px-3 md:px-4 py-2 text-xs font-head text-text-muted tracking-widest border-b border-white/10 mb-2">
      <span>RANK</span>
      <span>HUNTER</span>
      <span className="hidden sm:block text-right">{activeTab === 'allEvents' ? 'ROUNDS' : 'ROUNDS'}</span>
      <span className="text-right">SCORE</span>
      <span className="hidden md:block text-right">STATUS</span>
    </div>
  )

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <>
      {tabsUI}
      <div className="text-center py-12 border border-white/10 bg-navy-light">
        <div className="text-text-muted font-head text-sm mb-3">Failed to load standings</div>
        <button onClick={() => handleTabChange(activeTab)} className="px-4 py-2 border border-gold/30 text-gold font-head text-xs font-bold hover:bg-gold/10 transition-colors">RETRY →</button>
      </div>
    </>
  )

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) return (
    <>
      {tabsUI}
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-navy-light border border-white/5 animate-pulse" style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </div>
    </>
  )

  // ── GLOBAL STAGE or ALL EVENTS — browse list ───────────────────────────────
  if (activeTab !== 'score') {
    const isAllTime = activeTab === 'allEvents'
    return (
      <div className="space-y-1.5">
        {tabsUI}
        {tableHeader}

        {loadingMore && filteredAll.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-14 bg-navy-light border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {filteredAll.map((entry, i) => (
              <EntryRow key={entry.user_id} entry={entry} isMe={entry.user_id === currentUserId} delay={Math.min(i * 0.01, 0.2)} allTime={isAllTime} />
            ))}
          </AnimatePresence>
        )}

        {activeTab === 'global' && !allLoaded && allEntries.length > 0 && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 mt-2 border border-white/10 text-text-muted font-head text-xs font-bold hover:border-gold/30 hover:text-gold transition-all disabled:opacity-50"
          >
            {loadingMore ? 'LOADING...' : `LOAD MORE (showing ${filteredAll.length.toLocaleString()}${total ? ` of ${total.toLocaleString()}` : ''})`}
          </button>
        )}

        {filteredAll.length === 0 && !loadingMore && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-text-muted font-head text-sm">
            {scope === 'country' && selectedCountry ? `No hunters from ${selectedCountry.toUpperCase()} yet.` : 'No hunters on the board yet.'}
          </motion.div>
        )}
      </div>
    )
  }

  // ── TOP SCORE — smart view ─────────────────────────────────────────────────
  const myRankInTop   = filteredTop.some(e => e.user_id === currentUserId)
  const showSeparator = scope === 'global' && filteredNbh !== null && !myRankInTop && myRank !== null
  const gapCount      = showSeparator && filteredNbh
    ? (filteredNbh[0]?.rank ?? myRank) - 10 - 1
    : 0

  return (
    <div className="space-y-1.5">
      {tabsUI}
      {tableHeader}

      <AnimatePresence>
        {filteredTop.map((entry, i) => (
          <EntryRow key={entry.user_id} entry={entry} isMe={entry.user_id === currentUserId} delay={Math.min(i * 0.025, 0.25)} />
        ))}

        {showSeparator && (
          <motion.div key="sep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 px-3 py-2">
            <div className="flex-1 border-t border-dashed border-white/10" />
            {gapCount > 0 && (
              <span className="text-text-muted font-head text-xs shrink-0">{gapCount.toLocaleString()} hunters</span>
            )}
            <div className="flex-1 border-t border-dashed border-white/10" />
          </motion.div>
        )}

        {showSeparator && filteredNbh?.map((entry, i) => (
          <EntryRow key={entry.user_id} entry={entry} isMe={entry.user_id === currentUserId} delay={Math.min(i * 0.025, 0.15)} />
        ))}
      </AnimatePresence>

      {filteredTop.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 text-text-muted font-head">
          {scope === 'country' && selectedCountry ? `No hunters from ${selectedCountry.toUpperCase()} yet.` : 'No hunters on the board yet. Be the first.'}
        </motion.div>
      )}

      {total !== null && total > 0 && scope === 'global' && (
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <span className="text-text-muted font-head text-xs">{total.toLocaleString()} hunters competing</span>
          <button
            onClick={() => handleTabChange('global')}
            className="text-xs font-head font-bold text-gold hover:text-gold-dim transition-colors tracking-widest py-2"
          >
            BROWSE ALL →
          </button>
        </div>
      )}
    </div>
  )
}
