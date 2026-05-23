import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { ARENA_WAGERS } from '@/lib/arenas'

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { matchId } = await req.json() as { matchId: string }

    const { data: match } = await service
      .from('ranked_matches')
      .select('id, status, arena_level')
      .eq('id', matchId)
      .single()

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    if (match.status !== 'waiting') {
      return NextResponse.json({ error: 'Match already started — cannot cancel' }, { status: 400 })
    }

    // Remove this player
    const { error: delErr } = await service
      .from('ranked_match_players')
      .delete()
      .eq('match_id', matchId)
      .eq('user_id', user.id)

    if (delErr) throw delErr

    // Refund wager
    const wager = ARENA_WAGERS[match.arena_level]
    await service.rpc('adjust_tokens', { p_user_id: user.id, p_amount: wager })
    await service.from('token_transactions').insert({
      user_id: user.id,
      type: 'ranked_refund',
      amount: wager,
      description: `Ranked queue cancelled — refund`,
    })

    // Cancel match if no players remain
    const { count } = await service
      .from('ranked_match_players')
      .select('id', { count: 'exact', head: true })
      .eq('match_id', matchId)

    if ((count ?? 0) === 0) {
      await service.from('ranked_matches').update({ status: 'cancelled' }).eq('id', matchId)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[ranked/cancel]', err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
