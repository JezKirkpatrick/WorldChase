'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

async function createProfileIfNeeded(supabase: ReturnType<typeof createClient>, user: any) {
  const meta = user.user_metadata ?? {}

  const { data: existing } = await supabase
    .from('profiles').select('id').eq('id', user.id).maybeSingle()

  if (existing) return

  const rawName: string =
    meta.username || meta.full_name || meta.name ||
    user.email?.split('@')[0] || 'hunter'
  const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
  const username = cleaned.length >= 3 ? cleaned : `hunter_${user.id.slice(0, 8)}`

  const countryCode = meta.country_code && meta.country_code.length === 2 ? meta.country_code : null

  const { error: insertError } = await supabase.from('profiles').insert({
    id: user.id, username,
    display_name: meta.display_name || meta.full_name || meta.name || null,
    country_code: countryCode,
    tokens: 2, current_streak: 0, last_login_date: null,
  })

  if (insertError?.code === '23505') {
    await supabase.from('profiles').insert({
      id: user.id,
      username: `hunter_${user.id.slice(0, 8)}`,
      display_name: meta.display_name || meta.full_name || meta.name || null,
      country_code: countryCode,
      tokens: 2, current_streak: 0, last_login_date: null,
    })
  }
}

export default function AuthCallbackPage() {
  const router = useRouter()
  const [hint, setHint] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      try {
        // ── PKCE flow (email confirmation on mobile) ──────────────
        // The email link contains ?code=XXXX — exchange it for a session.
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
          if (data.session) {
            await createProfileIfNeeded(supabase, data.session.user)
            router.replace('/dashboard')
            return
          }
        }

        // ── Implicit / already-authenticated flow ─────────────────
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await createProfileIfNeeded(supabase, session.user)
          router.replace('/dashboard')
          return
        }

        // ── Last resort: listen for auth state change ─────────────
        const timeout = setTimeout(() => setHint('show'), 8000)

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, sess) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && sess) {
              clearTimeout(timeout)
              subscription.unsubscribe()
              await createProfileIfNeeded(supabase, sess.user)
              router.replace('/dashboard')
            }
          }
        )

        return () => { clearTimeout(timeout); subscription.unsubscribe() }

      } catch (err) {
        console.error('Auth callback error:', err)
        router.replace('/auth/login?error=auth-failed')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-spin inline-block">🌍</div>
        <div className="text-gold font-head font-bold text-lg tracking-widest mb-2">AUTHENTICATING</div>
        <div className="text-text-muted font-head text-sm animate-pulse">Verifying credentials...</div>

        {/* Fallback link shown after 8 seconds */}
        {hint === 'show' && (
          <div className="mt-8 space-y-3">
            <p className="text-text-muted font-head text-xs">Taking longer than expected.</p>
            <a
              href="/dashboard"
              className="inline-block text-gold font-head text-sm font-bold border border-gold/30 px-5 py-2 hover:border-gold transition-colors"
            >
              GO TO DASHBOARD →
            </a>
            <div>
              <a href="/auth/login" className="text-text-muted font-head text-xs hover:text-white transition-colors">
                or sign in again
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
