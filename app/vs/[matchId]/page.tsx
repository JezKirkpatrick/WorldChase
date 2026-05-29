export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import VsBattle from './VsBattle'

interface PageProps { params: { matchId: string } }

export default async function VsMatchPage({ params }: PageProps) {
  const user = await getUser()
  if (!user) redirect('/auth/login')

  const admin = createServiceClient()

  const { data: match } = await admin
    .from('vs_matches')
    .select('*')
    .eq('id', params.matchId)
    .single()

  if (!match) notFound()

  // Only participants or public (pending matches) can view
  const isParticipant = match.challenger_id === user.id || match.opponent_id === user.id
  if (!isParticipant && match.status !== 'pending') redirect('/vs')

  // Challenge data — answer fields deliberately excluded
  const { data: challenge } = await admin
    .from('challenges')
    .select('riddle_text, clues, difficulty, location_country')
    .eq('id', match.challenge_id)
    .single()

  // Load both participant profiles in one query
  const participantIds = [match.challenger_id, match.opponent_id].filter(Boolean) as string[]
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, username, display_name, equipped_avatar, equipped_border, country_code')
    .in('id', participantIds)

  const challenger = profiles?.find(p => p.id === match.challenger_id) ?? null
  const opponent   = profiles?.find(p => p.id === match.opponent_id)   ?? null

  return (
    <VsBattle
      match={match}
      challenge={challenge}
      currentUserId={user.id}
      challenger={challenger}
      opponent={opponent}
    />
  )
}
