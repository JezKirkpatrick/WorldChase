'use client'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="text-xs font-head font-bold tracking-widest text-text-muted hover:text-danger transition-colors px-2 py-1"
      title="Log out"
    >
      LOG OUT
    </button>
  )
}
