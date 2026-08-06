'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { EVENT_THEMES } from '@/lib/eventThemes'
import type { MonthlyEvent } from '@/types/game'

export default function AdminEventsPage() {
  const [events, setEvents] = useState<MonthlyEvent[]>([])
  const [form, setForm] = useState({ name: '', starts_at: '', ends_at: '', theme: 'global' })
  const [creating, setCreating] = useState(false)
  const [genProgress, setGenProgress] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('monthly_events').select('*').order('starts_at', { ascending: false }).then(({ data }) => data && setEvents(data))
  }, [supabase])

  async function handleStatusChange(id: string, status: string) {
    await supabase.from('monthly_events').update({ status }).eq('id', id)
    setEvents(p => p.map(ev => ev.id === id ? { ...ev, status: status as MonthlyEvent['status'] } : ev))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault(); setCreating(true)
    const { data } = await supabase.from('monthly_events').insert({
      name: form.name,
      slug: form.name.toLowerCase().replace(/\s+/g, '-'),
      month: new Date(form.starts_at).getMonth() + 1,
      year: new Date(form.starts_at).getFullYear(),
      status: 'upcoming',
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      total_rounds: 25,
    }).select().single()
    if (data) {
      setEvents(p => [data, ...p])
      // Auto-generate 20 rounds
      // Keep in sync with lib/generateChallengeInline.ts's DIFFICULTY_FOR_ROUND
      const difficultyFor = (round: number) =>
        round <= 8 ? 'easy' : round <= 14 ? 'medium' : round <= 19 ? 'hard' : round <= 23 ? 'extreme' : 'pro'

      // Pre-load ALL existing challenge locations from the entire DB to avoid repeats
      setGenProgress('Loading existing locations...')
      const { data: allExisting } = await supabase.from('challenges').select('location_name')
      const existingLocations: string[] = (allExisting ?? []).map((c: any) => c.location_name).filter(Boolean)

      const selectedTheme = EVENT_THEMES.find(t => t.id === form.theme)

      for (let round = 1; round <= 25; round++) {
        setGenProgress(`Generating round ${round} of 25...`)
        const res = await fetch('/api/admin/generate-challenge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roundNumber: round,
            difficulty: difficultyFor(round),
            eventId: data.id,
            existingLocations,
            eventTheme: selectedTheme,
            eventName: form.name,
          }),
        })
        const result = await res.json()
        if (result.challenge) existingLocations.push(result.challenge.location_name)
      }
      setGenProgress(null)
    }
    setCreating(false); setForm({ name: '', starts_at: '', ends_at: '', theme: 'global' })
  }

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center gap-4 px-6">
        <Link href="/admin" className="text-text-muted font-head text-sm">← ADMIN</Link>
        <span className="font-head font-bold text-gold tracking-widest">EVENTS</span>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="font-head font-bold text-2xl text-white mb-8">MANAGE EVENTS</h1>
        <form onSubmit={handleCreate} className="bg-navy-light border border-white/10 p-6 mb-8 space-y-4">
          <h2 className="font-head font-bold text-gold text-sm tracking-wider">CREATE NEW EVENT</h2>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Global Mix Hunt — Jun 16, 2025"
            className="w-full bg-navy border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60" required />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1">STARTS</label>
              <input type="datetime-local" value={form.starts_at}
                onChange={e => {
                  const start = e.target.value
                  const autoEnd = start ? new Date(new Date(start).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16) : ''
                  setForm(f => ({ ...f, starts_at: start, ends_at: f.ends_at || autoEnd }))
                }}
                className="w-full bg-navy border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60" required />
            </div>
            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1">ENDS (7 days auto-set)</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))}
                className="w-full bg-navy border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60" required />
            </div>
          </div>
          <div>
            <label className="block text-xs font-head text-text-muted tracking-widest mb-1">EVENT THEME</label>
            <select value={form.theme} onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
              className="w-full bg-navy border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60">
              {EVENT_THEMES.map(t => (
                <option key={t.id} value={t.id}>{t.label} — {t.description}</option>
              ))}
            </select>
          </div>
          <button disabled={creating} className="px-6 py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim disabled:opacity-50">
            {creating ? 'CREATING...' : 'CREATE EVENT'}
          </button>
          {genProgress && (
            <div className="text-electric font-head text-sm animate-pulse">⚡ {genProgress}</div>
          )}
        </form>
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="flex items-center justify-between border border-white/10 px-4 py-3">
              <div>
                <div className="font-head font-bold text-white">{ev.name}</div>
                <div className="text-text-muted font-head text-xs">{new Date(ev.starts_at).toLocaleDateString()} → {new Date(ev.ends_at).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-head font-bold px-2 py-0.5 ${ev.status === 'active' ? 'text-success bg-success/10' : ev.status === 'completed' ? 'text-text-muted bg-white/5' : 'text-warning bg-warning/10'}`}>
                  {ev.status.toUpperCase()}
                </span>
                <select value={ev.status} onChange={e => handleStatusChange(ev.id, e.target.value)}
                  className="bg-navy border border-white/20 px-2 py-1 text-white font-head text-xs outline-none focus:border-gold/60">
                  <option value="upcoming">upcoming</option>
                  <option value="active">active</option>
                  <option value="completed">completed</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
