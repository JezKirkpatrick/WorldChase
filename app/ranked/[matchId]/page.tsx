import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import RankedBattle from './RankedBattle'

export const dynamic = 'force-dynamic'

export default async function RankedMatchPage({ params }: { params: { matchId: string } }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const admin = createServiceClient()

  const { data: match } = await admin
    .from('ranked_matches')
    .select('id, format, arena_level, status, challenge_id, invited_user_id, started_at')
    .eq('id', params.matchId)
    .maybeSingle()

  if (!match) redirect('/ranked')

  // Verify user is a participant
  const { data: myPlayerRow } = await admin
    .from('ranked_match_players')
    .select('user_id')
    .eq('match_id', params.matchId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!myPlayerRow) redirect('/ranked')

  // Get all players with profiles
  const { data: players } = await admin
    .from('ranked_match_players')
    .select(`
      user_id, score, result, trophy_change, token_change, submitted_at, team,
      profiles!user_id (display_name, username, equipped_avatar, equipped_border)
    `)
    .eq('match_id', params.matchId)

  // Safe challenge data (no answer keywords)
  let challenge = null
  if (match.challenge_id && match.status === 'active') {
    const { data: ch } = await admin
      .from('challenges')
      .select('riddle_text, clues, difficulty, location_country')
      .eq('id', match.challenge_id)
      .maybeSingle()
    challenge = ch
  }

  // Get inviter name if this is an invite match
  let inviterName: string | null = null
  if (match.invited_user_id === user.id) {
    const inviterPlayer = (players ?? []).find(p => p.user_id !== user.id)
    if (inviterPlayer) {
      const prof = inviterPlayer.profiles as any
      inviterName = prof?.display_name ?? prof?.username ?? null
    }
  }

  return (
    <RankedBattle
      match={match as any}
      players={(players ?? []) as any}
      challenge={challenge as any}
      currentUserId={user.id}
      inviterName={inviterName}
    />
  )
}
