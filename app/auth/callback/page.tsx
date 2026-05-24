'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user
        const meta = user.user_metadata ?? {}

        // Check if profile already exists
        const { data: existing } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', user.id)
          .maybeSingle()

        if (!existing) {
          // Build username from available metadata
          // Email signup sets meta.username; Google OAuth sets meta.full_name / meta.name
          const rawName: string =
            meta.username ||
            meta.full_name ||
            meta.name ||
            user.email?.split('@')[0] ||
            'hunter'

          // Sanitise: lowercase, alphanumeric only, 3–20 chars
          const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
          const username = cleaned.length >= 3 ? cleaned : `hunter_${user.id.slice(0, 8)}`

          // Try to insert; if username conflicts fall back to hunter_XXXXXXXX
          const { error: insertError } = await supabase.from('profiles').insert({
            id: user.id,
            username,
            display_name: meta.full_name || meta.name || null,
            tokens: 2,   // 2 starter tokens on account creation
            current_streak: 0,
            last_login_date: null,
          })

          if (insertError?.code === '23505') {
            // Username taken — use unique fallback
            await supabase.from('profiles').insert({
              id: user.id,
              username: `hunter_${user.id.slice(0, 8)}`,
              display_name: meta.full_name || meta.name || null,
              tokens: 2,   // 2 starter tokens on account creation
              current_streak: 0,
              last_login_date: null,
            })
          }
        }

        router.push('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-spin inline-block">🌍</div>
        <div className="text-gold font-head font-bold text-lg tracking-widest mb-2">AUTHENTICATING</div>
        <div className="text-text-muted font-head text-sm animate-pulse">Verifying credentials...</div>
      </div>
    </div>
  )
}
