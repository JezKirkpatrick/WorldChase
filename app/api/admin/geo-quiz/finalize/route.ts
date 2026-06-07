import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const PRIZES = [5000, 2500, 1000, 500, 500, 250, 250, 250, 250, 250]
const PARTICIPATION = 50

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { quizId } = await req.json()
    if (!quizId) return NextResponse.json({ error: 'Missing quizId' }, { status: 400 })

    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Aggregate all answers by user
    const { data: answers } = await service.from('geo_quiz_answers')
      .select('user_id, points_earned, is_correct')
      .eq('quiz_id', quizId)

    const userStats = new Map<string, { score: number; correct: number }>()
    for (const a of answers ?? []) {
      const prev = userStats.get(a.user_id) ?? { score: 0, correct: 0 }
      userStats.set(a.user_id, {
        score: prev.score + (a.points_earned ?? 0),
        correct: prev.correct + (a.is_correct ? 1 : 0),
      })
    }

    const ranked = Array.from(userStats.entries())
      .sort((a, b) => b[1].score - a[1].score)

    // Insert results + award tokens
    const results = []
    for (let i = 0; i < ranked.length; i++) {
      const [userId, stats] = ranked[i]
      const rank = i + 1
      const tokens = PRIZES[i] ?? PARTICIPATION

      results.push({
        quiz_id: quizId,
        user_id: userId,
        final_rank: rank,
        total_score: stats.score,
        correct_answers: stats.correct,
        tokens_awarded: tokens,
      })

      if (tokens > 0) {
        await service.rpc('adjust_tokens', { p_user_id: userId, p_amount: tokens })
        await service.from('token_transactions').insert({
          user_id: userId,
          type: 'quiz_prize',
          amount: tokens,
          description: `Geo Quiz rank #${rank}${rank > 10 ? ' (participation)' : ''}`,
        })
      }
    }

    await service.from('geo_quiz_results').upsert(results, { onConflict: 'quiz_id,user_id' })
    await service.from('geo_quizzes').update({
      status: 'completed',
      ended_at: new Date().toISOString(),
    }).eq('id', quizId)

    return NextResponse.json({ awarded: ranked.length })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
