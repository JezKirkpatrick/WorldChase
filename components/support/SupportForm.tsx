'use client'
import { useState } from 'react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'bug',        label: '🐛 Bug Report',        desc: 'Something is broken or not working' },
  { value: 'gameplay',   label: '🎮 Gameplay Issue',     desc: 'Problem with a round, scoring, or map' },
  { value: 'account',    label: '👤 Account Problem',    desc: 'Login, tokens, or profile issues' },
  { value: 'payment',    label: '💳 Payment / Tokens',   desc: 'Billing or token purchase issue' },
  { value: 'suggestion', label: '💡 Suggestion',         desc: 'Feature request or improvement idea' },
  { value: 'other',      label: '📋 Other',              desc: 'Anything else' },
]

export default function SupportForm() {
  const [category, setCategory] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, category, subject, description }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(false); return }
    setSent(true)
    setLoading(false)
  }

  if (sent) return (
    <div className="animate-scale-in bg-navy-light border border-success/30 p-8 text-center card-gradient-electric">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="font-head font-bold text-xl text-white mb-2">Ticket Submitted!</h2>
      <p className="text-text-muted font-head text-sm mb-6">
        We'll get back to you at <span className="text-electric">{email}</span> within 24 hours.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/dashboard" className="px-6 py-3 bg-gold text-navy font-head font-bold text-sm hover:bg-gold-dim transition-all">
          BACK TO DASHBOARD
        </Link>
        <button
          onClick={() => { setSent(false); setCategory(''); setSubject(''); setDescription('') }}
          className="px-6 py-3 border border-white/20 text-text-muted font-head font-bold text-sm hover:border-white/40 hover:text-white transition-all">
          SUBMIT ANOTHER
        </button>
      </div>
    </div>
  )

  return (
    <form onSubmit={submit} className="space-y-5 animate-fade-up stagger-1">
      {/* Category */}
      <div>
        <label className="block text-xs font-head text-text-muted tracking-widest mb-3">CATEGORY</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map(c => (
            <button key={c.value} type="button" onClick={() => setCategory(c.value)}
              className={`p-3 border text-left transition-all ${category === c.value
                ? 'border-electric/60 bg-electric/10 text-white'
                : 'border-white/10 bg-navy-light text-text-muted hover:border-white/25 hover:text-white'}`}>
              <div className="font-head font-bold text-xs mb-0.5">{c.label}</div>
              <div className="text-xs text-text-muted font-head leading-tight">{c.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs font-head text-text-muted tracking-widest mb-2">YOUR EMAIL</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
          placeholder="hunter@example.com"
          className="w-full bg-navy-light border border-white/10 px-4 py-3 text-white font-head text-sm focus:outline-none focus:border-electric/50 placeholder:text-text-muted transition-colors" />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-xs font-head text-text-muted tracking-widest mb-2">SUBJECT</label>
        <input type="text" required value={subject} onChange={e => setSubject(e.target.value)}
          placeholder="Brief description of the issue" maxLength={120}
          className="w-full bg-navy-light border border-white/10 px-4 py-3 text-white font-head text-sm focus:outline-none focus:border-electric/50 placeholder:text-text-muted transition-colors" />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-head text-text-muted tracking-widest mb-2">
          DESCRIPTION <span className="text-text-muted/60">(be as specific as possible)</span>
        </label>
        <textarea required rows={5} value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe what happened, what you expected, and steps to reproduce..."
          className="w-full bg-navy-light border border-white/10 px-4 py-3 text-white font-head text-sm focus:outline-none focus:border-electric/50 placeholder:text-text-muted resize-none transition-colors" />
        <div className={`text-right text-xs mt-1 font-mono ${description.length < 20 ? 'text-danger' : 'text-text-muted'}`}>
          {description.length} / 1000
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 border border-danger/40 bg-danger/10 text-danger font-head text-sm">{error}</div>
      )}

      <button type="submit" disabled={loading || !category}
        className="w-full py-4 font-head font-bold text-sm tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: loading ? '#555' : 'linear-gradient(90deg, #00d4ff, #0099bb)', color: '#0a0e27' }}>
        {loading ? 'SUBMITTING...' : 'SUBMIT TICKET →'}
      </button>
    </form>
  )
}
