import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak,last_login_date,tokens')
      .eq('id', userId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const today = new Date().toISOString().split('T')[0]
    const last = profile.last_login_date
    if (last === today) return NextResponse.json({ streak: profile.current_streak, bonus: 0 })

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = last === yesterday ? (profile.current_streak ?? 0) + 1 : 1

    // Milestone bonuses: 3 days = +2 tokens, 7 days = +5, 30 days = +20
    const milestones: Record<number, number> = { 3: 2, 7: 5, 30: 20 }
    const bonus = milestones[newStreak] ?? 0
    const newTokens = (profile.tokens ?? 0) + bonus

    await supabase.from('profiles').update({
      current_streak: newStreak,
      last_login_date: today,
      tokens: newTokens,
    }).eq('id', userId)

    if (bonus > 0) {
      await supabase.from('token_transactions').insert({
        user_id: userId, type: 'earned_login', amount: bonus,
        description: `${newStreak}-day login streak bonus`,
      })
    }

    return NextResponse.json({ streak: newStreak, bonus, newTokenBalance: newTokens })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
