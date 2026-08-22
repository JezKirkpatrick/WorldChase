import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

// Guards every route under /admin, not just the index page — individual admin
// subpages (players, events, challenges, geo-quiz) had no auth check of their
// own and rendered fully for any logged-in non-admin who navigated there directly.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) redirect('/dashboard')

  return <>{children}</>
}
