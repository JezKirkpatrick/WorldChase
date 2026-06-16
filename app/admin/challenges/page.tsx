'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import DifficultyBadge from '@/components/ui/DifficultyBadge'
import { EVENT_THEMES } from '@/lib/eventThemes'
import type { Challenge, MonthlyEvent, Difficulty } from '@/types/game'

export default function AdminChallengesPage() {
  const [events, setEvents] = useState<MonthlyEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [generating, setGenerating] = useState(false)
  const [genRound, setGenRound] = useState(1)
  const [genDiff, setGenDiff] = useState<Difficulty>('easy')
  const [genTheme, setGenTheme] = useState<string>('global')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Challenge>>({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
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
    const { data: allChallenges } = await supabase.from('challenges').select('location_name')
    const existing = (allChallenges ?? []).map(c => c.location_name).filter(Boolean)
    const selectedTheme = EVENT_THEMES.find(t => t.id === genTheme)
    const selectedEventName = events.find(e => e.id === selectedEvent)?.name
    const res = await fetch('/api/admin/generate-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roundNumber: genRound,
        difficulty: genDiff,
        eventId: selectedEvent,
        existingLocations: existing,
        eventTheme: selectedTheme,
        eventName: selectedEventName,
      }),
    })
    const data = await res.json()
    if (data.error) console.error('Generate error:', data.error, data.detail)
    if (data.challenge) setChallenges(prev => [...prev, data.challenge].sort((a, b) => a.round_number - b.round_number))
    setGenerating(false)
  }

  function startEdit(c: Challenge) {
    setEditingId(c.id)
    setEditForm({
      map_start_lat: c.map_start_lat,
      map_start_lng: c.map_start_lng,
      street_view_heading: c.street_view_heading,
      street_view_pitch: c.street_view_pitch,
      street_view_only: c.street_view_only,
    })
    setSaveMsg(null)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setSaveMsg(null)
    const { error } = await supabase.from('challenges').update({
      map_start_lat: Number(editForm.map_start_lat),
      map_start_lng: Number(editForm.map_start_lng),
      street_view_heading: Number(editForm.street_view_heading),
      street_view_pitch: Number(editForm.street_view_pitch),
      street_view_only: editForm.street_view_only,
    }).eq('id', id)
    setSaving(false)
    if (error) { setSaveMsg('❌ ' + error.message); return }
    setSaveMsg('✅ Saved!')
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, ...editForm } as Challenge : c))
    setTimeout(() => { setEditingId(null); setSaveMsg(null) }, 1200)
  }

  function previewUrl(lat: number, lng: number, heading: number, pitch: number) {
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=${heading}&pitch=${pitch}`
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
              {['easy','medium','hard','extreme','pro'].map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-head text-text-muted tracking-widest mb-1 block">THEME</label>
            <select value={genTheme} onChange={e => setGenTheme(e.target.value)}
              className="bg-navy border border-white/20 px-3 py-2 text-white font-head outline-none">
              {EVENT_THEMES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={generating || !selectedEvent}
            className="px-6 py-2 bg-electric text-navy font-head font-bold text-sm tracking-wider hover:bg-electric-dim disabled:opacity-50">
            {generating ? '⚡ GENERATING...' : '⚡ GENERATE WITH AI'}
          </button>
        </div>

        <div className="space-y-2">
          {challenges.map(c => (
            <div key={c.id} className="border border-white/10 bg-navy-light">
              {/* Row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="font-mono text-text-muted text-sm w-8 shrink-0">R{c.round_number}</span>
                  <DifficultyBadge difficulty={c.difficulty} />
                  <div className="min-w-0">
                    <div className="font-head font-bold text-white text-sm truncate">{c.location_name}</div>
                    <div className="text-text-muted font-head text-xs">{c.location_country}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono text-xs text-text-muted">{c.points_value.toLocaleString()} pts</span>
                  <button
                    onClick={() => editingId === c.id ? setEditingId(null) : startEdit(c)}
                    className={`px-3 py-1.5 font-head text-xs font-bold border transition-colors ${editingId === c.id ? 'border-gold/50 text-gold bg-gold/10' : 'border-white/20 text-text-muted hover:border-gold/40 hover:text-gold'}`}
                  >
                    {editingId === c.id ? 'CLOSE ✕' : '✏ EDIT LOCATION'}
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {editingId === c.id && (
                <div className="border-t border-white/10 bg-navy/60 px-4 py-4">
                  <div className="text-xs font-head text-gold tracking-widest mb-4">EDIT STREET VIEW LOCATION</div>

                  <div className="bg-navy/80 border border-electric/20 px-3 py-2 mb-4 text-xs font-head text-text-muted">
                    💡 <strong className="text-white">How to get coordinates:</strong> Open Google Maps → find the exact spot → right-click → copy the lat/lng numbers at the top of the menu. For heading (0–360°): 0=North, 90=East, 180=South, 270=West.
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-[10px] font-head text-text-muted tracking-widest mb-1 block">START LAT</label>
                      <input
                        type="number" step="0.0001"
                        value={editForm.map_start_lat ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, map_start_lat: parseFloat(e.target.value) }))}
                        className="w-full bg-navy border border-white/20 px-2 py-2 text-white font-mono text-sm outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-head text-text-muted tracking-widest mb-1 block">START LNG</label>
                      <input
                        type="number" step="0.0001"
                        value={editForm.map_start_lng ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, map_start_lng: parseFloat(e.target.value) }))}
                        className="w-full bg-navy border border-white/20 px-2 py-2 text-white font-mono text-sm outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-head text-text-muted tracking-widest mb-1 block">HEADING (0–360°)</label>
                      <input
                        type="number" min={0} max={360}
                        value={editForm.street_view_heading ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, street_view_heading: parseInt(e.target.value) }))}
                        className="w-full bg-navy border border-white/20 px-2 py-2 text-white font-mono text-sm outline-none focus:border-gold/50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-head text-text-muted tracking-widest mb-1 block">PITCH (−90 to 90)</label>
                      <input
                        type="number" min={-90} max={90}
                        value={editForm.street_view_pitch ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, street_view_pitch: parseInt(e.target.value) }))}
                        className="w-full bg-navy border border-white/20 px-2 py-2 text-white font-mono text-sm outline-none focus:border-gold/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      id={`sv-only-${c.id}`}
                      checked={!!editForm.street_view_only}
                      onChange={e => setEditForm(f => ({ ...f, street_view_only: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    <label htmlFor={`sv-only-${c.id}`} className="text-xs font-head text-text-muted">
                      Street View only (hides the regular map)
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveEdit(c.id)}
                      disabled={saving}
                      className="px-5 py-2 bg-gold text-navy font-head font-bold text-xs tracking-wider hover:bg-gold-dim disabled:opacity-50"
                    >
                      {saving ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                    <a
                      href={previewUrl(
                        editForm.map_start_lat ?? c.map_start_lat,
                        editForm.map_start_lng ?? c.map_start_lng,
                        editForm.street_view_heading ?? c.street_view_heading,
                        editForm.street_view_pitch ?? c.street_view_pitch,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2 border border-electric/40 text-electric font-head text-xs font-bold hover:bg-electric/10 transition-colors"
                    >
                      👁 PREVIEW IN GOOGLE MAPS →
                    </a>
                    {saveMsg && <span className="font-head text-sm">{saveMsg}</span>}
                  </div>
                </div>
              )}
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
