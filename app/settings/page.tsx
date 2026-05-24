'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { sounds } from '@/lib/sounds'
import { useToast } from '@/components/ui/Toast'

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [keyboardControls, setKeyboardControls] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    sounds.init()
    // Read actual current sound state from localStorage (not just DB)
    setSoundEnabled(!sounds.isMuted())

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/auth/login'); return }
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then(({ data }) => {
        setLoading(false)
        if (data) {
          setProfile(data)
          setUsername(data.username ?? '')
          setDisplayName(data.display_name ?? '')
          setKeyboardControls(data.keyboard_controls ?? true)
          // Sound: DB value takes precedence over localStorage on first load
          if (data.sound_enabled !== null && data.sound_enabled !== undefined) {
            setSoundEnabled(data.sound_enabled)
            sounds.setMuted(!data.sound_enabled)
          }
        }
      })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSoundToggle() {
    const next = !soundEnabled
    setSoundEnabled(next)
    sounds.setMuted(!next) // update live immediately
    if (next) sounds.click()
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    const { error } = await supabase.from('profiles').update({
      username: username.trim(),
      display_name: displayName.trim() || null,
      sound_enabled: soundEnabled,
      keyboard_controls: keyboardControls,
    }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      toast(`Error: ${error.message}`, 'error')
    } else {
      toast('Settings saved!', 'success')
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light/95 backdrop-blur border-b border-white/8 flex items-center justify-between px-6 sticky top-0 z-30">
        <Link href="/dashboard" className="font-head font-bold text-gold text-base tracking-widest hover:text-gold-dim transition-colors">≡ WORLD CHASE</Link>
        <Link href="/dashboard" className="text-xs font-head text-text-muted hover:text-white transition-colors">← DASHBOARD</Link>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-12">
        <h1 className="font-head font-bold text-2xl text-white mb-8 tracking-wider">ACCOUNT SETTINGS</h1>

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">HUNTER NAME</label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              maxLength={30}
              className="w-full bg-navy-light border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head transition-colors"
            />
            <p className="text-xs text-text-muted font-head mt-1">Shown on leaderboards and your public profile</p>
          </div>

          <div>
            <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">DISPLAY NAME <span className="text-text-muted/50 normal-case">(optional)</span></label>
            <input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder="Your real name or alias"
              className="w-full bg-navy-light border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head placeholder-text-muted/40 transition-colors"
            />
          </div>

          <div className="space-y-0 border border-white/10">
            <Toggle
              label="Keyboard Controls"
              desc="Arrow keys, shortcuts, and hotkeys in-game"
              value={keyboardControls}
              onChange={setKeyboardControls}
            />
            <Toggle
              label="Sound Effects"
              desc={soundEnabled ? 'Sound is ON — hear feedback when you answer' : 'Sound is OFF — silent mode'}
              value={soundEnabled}
              onChange={handleSoundToggle}
              accent={soundEnabled ? 'gold' : undefined}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <span className="w-3 h-3 border-2 border-navy/40 border-t-navy rounded-full animate-spin" />}
            {saving ? 'SAVING...' : 'SAVE SETTINGS'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-white/10 flex items-center justify-between">
          <div>
            <div className="text-sm font-head text-white font-bold">Sign Out</div>
            <div className="text-xs font-head text-text-muted">You'll need to log back in to play</div>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm font-head text-danger border border-danger/30 hover:bg-danger/10 transition-colors"
          >
            SIGN OUT
          </button>
        </div>
      </div>
    </div>
  )
}

function Toggle({
  label, desc, value, onChange, accent,
}: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 last:border-b-0">
      <div>
        <div className="font-head font-bold text-sm text-white">{label}</div>
        <div className="text-xs text-text-muted font-head mt-0.5">{desc}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ml-4 ${value ? 'bg-gold' : 'bg-white/20'}`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-7' : 'translate-x-1'}`} />
      </button>
    </div>
  )
}
