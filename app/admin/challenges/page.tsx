'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import type { Challenge, MonthlyEvent, Difficulty } from '@/types/game'

export default function AdminChallengesPage() {
  const [events, setEvents] = useState<MonthlyEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [generating, setGenerating] = useState(false)
  const [genRound, setGenRound] = useState(1)
  const [genDiff, setGenDiff] = useState<Difficulty>('easy')
  const supabase = createClient()

  useEffect(() => {
    supabase.from('monthly_events').select('*').order('starts_at', { ascending: false }).then(({ data }) => {
      if (data) { setEvents(data); if (data[0]) setSelectedEvent(data[0].id) }
    })
  }, [supabase])

  useEffect(() => {
    if (!selectedEvent) return
    supabase.from('challenges').select('*').eq('event_id', selectedEvent).order('round_number').then(({ data }) => data && setChallenges(data))
  }, [selectedEvent, supabase])

  async function handleGenerate() {
    setGenerating(true)
    const existing = challenges.map(c => c.location_name)
    const res = await fetch('/api/admin/generate-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: genRound, difficulty: genDiff, eventId: selectedEvent, existingLocations: existing }),
    })
    const data = await res.json()
    console.log('API response:', data)
    if (data.error) console.error('Generate error:', data.error, data.detail)
    if (data.challenge) setChallenges(prev => [...prev, data.challenge].sort((a, b) => a.round_number - b.round_number))
    setGenerating(false)
  }

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center gap-4 px-6">
        <Link href="/admin" className="text-text-muted font-head text-sm">← ADMIN</Link>
        <span className="font-head font-bold text-gold tracking-widest">CHALLENGES</span>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-head font-bold text-2xl text-white">MANAGE CHALLENGES</h1>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
            className="bg-navy-light border border-white/20 px-3 py-2 text-white font-head text-sm outline-none">
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
          </select>
        </div>

        {/* AI Generate */}
        <div className="bg-navy-light border border-electric/30 p-5 mb-8 flex items-end gap-4 flex-wrap">
          <div>
            <label className="text-xs font-head text-text-muted tracking-widest mb-1 block">ROUND</label>
            <input type="number" value={genRound} onChange={e => setGenRound(parseInt(e.target.value))}
              min={1} max={20} className="w-20 bg-navy border border-white/20 px-3 py-2 text-white font-mono outline-none" />
          </div>
          <div>
            <label className="text-xs font-head text-text-muted tracking-widest mb-1 block">DIFFICULTY</label>
            <select value={genDiff} onChange={e => setGenDiff(e.target.value as Difficulty)}
              className="bg-navy border border-white/20 px-3 py-2 text-white font-head outline-none">
              {['easy','medium','hard','extreme'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={generating || !selectedEvent}
            className="px-6 py-2 bg-electric text-navy font-head font-bold text-sm tracking-wider hover:bg-electric-dim disabled:opacity-50">
            {generating ? '⚡ GENERATING...' : '⚡ GENERATE WITH AI'}
          </button>
        </div>

        <div className="space-y-2">
          {challenges.map(c => (
            <div key={c.id} className="flex items-start justify-between border border-white/10 px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="font-mono text-text-muted text-sm w-8">R{c.round_number}</span>
                <DifficultyBadge difficulty={c.difficulty} />
                <div>
                  <div className="font-head font-bold text-white text-sm">{c.location_name}</div>
                  <div className="text-text-muted font-head text-xs">{c.location_country}</div>
                </div>
              </div>
              <span className="font-mono text-xs text-text-muted">{c.points_value.toLocaleString()} pts</span>
            </div>
          ))}
          {challenges.length === 0 && (
            <div className="text-center py-12 text-text-muted font-head">No challenges yet. Generate with AI above.</div>
          )}
        </div>
      </div>
    </div>
  )
}
