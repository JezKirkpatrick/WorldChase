'use client'

export const dynamic = 'force-dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') router.push('/dashboard')
    })
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <div className="text-gold font-head font-bold text-lg tracking-widest mb-2">AUTHENTICATING</div>
        <div className="text-text-muted font-head text-sm animate-pulse">Verifying credentials...</div>
      </div>
    </div>
  )
}
