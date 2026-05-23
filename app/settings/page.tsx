'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types/user'

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [keyboardControls, setKeyboardControls] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return router.push('/auth/login')
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setProfile(data)
          setUsername(data.username)
          setDisplayName(data.display_name ?? '')
          setSoundEnabled(data.sound_enabled)
          setKeyboardControls(data.keyboard_controls)
        }
      })
    })
  }, [supabase, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      username, display_name: displayName, sound_enabled: soundEnabled, keyboard_controls: keyboardControls,
    }).eq('id', profile.id)
    setSaving(false)
    setMessage(error ? `Error: ${error.message}` : 'Settings saved.')
    setTimeout(() => setMessage(''), 3000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-gold font-head animate-pulse tracking-widest">LOADING...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center justify-between px-6">
        <Link href="/dashboard" className="font-head font-bold text-gold text-lg tracking-widest">WORLD CHASE</Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="font-head font-bold text-2xl text-white mb-8 tracking-wider">ACCOUNT SETTINGS</h1>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">HUNTER NAME</label>
            <input value={username} onChange={e => setUsername(e.target.value)}
              className="w-full bg-navy-light border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head" />
          </div>
          <div>
            <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">DISPLAY NAME</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-navy-light border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head" />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div>
              <div className="font-head font-bold text-sm text-white">Keyboard Controls</div>
              <div className="text-xs text-text-muted font-head">Enable keyboard shortcuts in game</div>
            </div>
            <button type="button" onClick={() => setKeyboardControls(k => !k)}
              className={`w-12 h-6 rounded-full transition-colors relative ${keyboardControls ? 'bg-gold' : 'bg-white/20'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${keyboardControls ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-white/10">
            <div>
              <div className="font-head font-bold text-sm text-white">Sound Effects</div>
              <div className="text-xs text-text-muted font-head">Game audio (muted by default)</div>
            </div>
            <button type="button" onClick={() => setSoundEnabled(s => !s)}
              className={`w-12 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-gold' : 'bg-white/20'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${soundEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {message && <div className="text-success font-head text-sm">{message}</div>}

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-50">
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10">
          <button onClick={handleSignOut} className="text-sm font-head text-danger hover:text-white transition-colors">
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  )
}
