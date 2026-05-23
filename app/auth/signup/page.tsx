'use client'

export const dynamic = 'force-dynamic'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!username.trim()) { setError('Username is required'); return }
    if (username.length < 3) { setError('Username must be at least 3 characters'); return }
    setLoading(true); setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { username: username.trim(), display_name: username.trim() },
      }
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    // If email confirmation is disabled, user is logged in immediately
    if (data.session) {
      router.push('/dashboard')
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="text-5xl mb-6">ðŸ“¬</div>
          <div className="text-gold font-head font-bold text-2xl tracking-widest mb-4">CHECK YOUR EMAIL</div>
          <p className="text-text-muted font-head mb-2">Confirmation sent to <span className="text-white">{email}</span></p>
          <p className="text-text-muted font-head text-sm">Click the link in the email to activate your hunter account.</p>
          <Link href="/auth/login" className="inline-block mt-6 text-gold font-head text-sm hover:text-gold-dim">
            Already confirmed? Sign in â†’
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm relative">
        <div className="text-center mb-8">
          <Link href="/" className="font-head font-bold text-gold text-2xl tracking-widest hover:text-gold-dim transition-colors">WORLD CHASE</Link>
          <p className="text-text-muted font-head text-sm mt-2 tracking-wider">JOIN THE HUNT â€” FREE</p>
        </div>

        <div className="bg-navy-light border border-white/10 p-8" style={{ boxShadow: '0 0 40px rgba(245,197,24,0.05)' }}>
          <form onSubmit={handleSignup} className="space-y-4">
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-danger text-sm font-head border border-danger/30 bg-danger/10 px-3 py-2">
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">USERNAME</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/\s/g, ''))}
                required minLength={3} maxLength={20}
                className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head placeholder-text-muted/40 transition-colors"
                placeholder="YourHunterName" />
            </div>

            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">EMAIL</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head placeholder-text-muted/40 transition-colors"
                placeholder="hunter@example.com" />
            </div>

            <div>
              <label className="block text-xs font-head text-text-muted tracking-widest mb-1.5">PASSWORD</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full bg-navy border border-white/20 focus:border-gold/60 outline-none px-4 py-3 text-white font-head transition-colors"
                placeholder="Min. 8 characters" />
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={loading ? {} : { boxShadow: '0 0 20px rgba(245,197,24,0.3)' }}>
              {loading ? 'CREATING ACCOUNT...' : 'START HUNTING â€” FREE'}
            </button>

            <p className="text-xs text-text-muted font-head text-center">ðŸª™ Your first 3 tokens are free on signup</p>
          </form>
        </div>

        <p className="text-center mt-4 text-text-muted font-head text-sm">
          Already hunting?{' '}
          <Link href="/auth/login" className="text-gold hover:text-gold-dim transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
