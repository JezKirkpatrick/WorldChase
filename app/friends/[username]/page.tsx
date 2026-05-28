export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getUser } from '@/lib/auth'
import GlobalNav from '@/components/ui/GlobalNav'
import DMClient from '@/components/friends/DMClient'

export default async function DMPage({ params }: { params: { username: string } }) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const supabase = createClient()

  // Get friend's profile
  const { data: friend } = await supabase
    .from('profiles')
    .select('id,username,display_name,equipped_avatar')
    .eq('username', params.username)
    .maybeSingle()

  if (!friend) notFound()
  if (friend.id === user.id) redirect('/friends')

  // Verify they are actually friends
  const { data: friendship } = await supabase
    .from('friendships')
    .select('status')
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friend.id}),and(requester_id.eq.${friend.id},addressee_id.eq.${user.id})`)
    .eq('status', 'accepted')
    .maybeSingle()

  if (!friendship) redirect('/friends')

  return (
    <div className="min-h-screen bg-navy text-text flex flex-col">
      <GlobalNav />
      <DMClient myId={user.id} friend={friend} />
    </div>
  )
}
