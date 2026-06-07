'use client'
import { useState, useRef } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import FriendButton from '@/components/ui/FriendButton'
import type { FriendStatus } from '@/components/ui/FriendButton'
import { safeDisplayName, safeHandle } from '@/lib/userDisplay'

type Result = {
  id: string
  username: string | null
  display_name: string | null
  equipped_avatar: string | null
  equipped_border: string | null
  country_code: string | null
  friendStatus: FriendStatus
}

export default function FindHunters() {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    if (timer.current) clearTimeout(timer.current)
    if (val.trim().length < 2) { setResults([]); setSearched(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(val.trim())}`)
      const json = await res.json()
      setResults(json.results ?? [])
      setLoading(false)
      setSearched(true)
    }, 350)
  }

  return (
    <div className="mb-8">
      <div className="text-xs font-head text-gold tracking-widest mb-3 flex items-center gap-2">
        FIND HUNTERS
        <div className="flex-1 h-px bg-gold/20" />
      </div>

      <div className="relative mb-3">
        <input
          value={query}
          onChange={handleChange}
          placeholder="Search by username..."
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-navy-light border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head text-sm placeholder-text-muted/50 transition-colors"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        )}
      </div>

      {searched && results.length === 0 && !loading && (
        <div className="text-text-muted font-head text-sm text-center py-4 border border-white/5 bg-navy-light">
          No hunters found for "{query}"
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(r => (
            <div key={r.id} className="bg-navy-light border border-white/10 p-3 flex items-center gap-3">
              <Link href={`/profile/${safeHandle(r)}`} className="shrink-0">
                <Avatar
                  emoji={r.equipped_avatar ?? '🌍'}
                  border={r.equipped_border ?? 'none'}
                  size="sm"
                  countryCode={r.country_code}
                />
              </Link>
              <Link href={`/profile/${safeHandle(r)}`} className="flex-1 min-w-0 overflow-hidden hover:text-gold transition-colors">
                <div className="font-head font-bold text-white text-sm truncate">{safeDisplayName(r)}</div>
                <div className="text-text-muted font-head text-xs truncate">@{safeHandle(r)}</div>
              </Link>
              <FriendButton
                targetUserId={r.id}
                targetUsername={safeHandle(r)}
                initialStatus={r.friendStatus}
              />
            </div>
          ))}
        </div>
      )}

      {!searched && query.length === 0 && (
        <p className="text-text-muted font-head text-xs text-center py-2">
          You can also find hunters on the{' '}
          <Link href="/leaderboard" className="text-gold hover:text-gold-dim transition-colors">leaderboard</Link>
          {' '}and add them from their profile.
        </p>
      )}
    </div>
  )
}
