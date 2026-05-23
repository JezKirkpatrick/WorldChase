'use client'

export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-head font-bold text-gold text-2xl tracking-widest">WORLD CHASE</Link>
          <p className="text-text-muted font-head text-sm mt-2 tracking-wider">HUNTER AUTHENTICATION</p>
        </div>

        <div className="bg-navy-light border border-white/10 bracket-box p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="text-danger text-sm font-head border border-danger/30 bg-danger/10 px-3 py-2">{error}</div>}
            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head placeholder-text-muted/40" placeholder="hunter@example.com" />
            </div>
            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-colors disabled:opacity-50">
              {loading ? 'AUTHENTICATING...' : 'ENTER THE HUNT'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-text-muted text-xs font-head">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <button onClick={handleGoogle}
            className="w-full py-3 border border-white/20 text-text font-head text-sm tracking-wider hover:border-gold/40 transition-colors">
            CONTINUE WITH GOOGLE
          </button>
        </div>

        <p className="text-center mt-4 text-text-muted font-head text-sm">
          New hunter?{' '}
          <Link href="/auth/signup" className="text-gold hover:text-gold-dim transition-colors">Join the chase</Link>
        </p>
      </div>
    </div>
  )
}
