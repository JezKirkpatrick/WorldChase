import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

    let { data: profile } = await supabase
      .from('profiles')
      .select('current_streak,last_login_date,tokens')
      .eq('id', userId)
      .maybeSingle()

    // Auto-create profile for new users on their first login after signup
    if (!profile) {
      // Try to get real username from auth metadata (set during signup or via OAuth)
      let username = `hunter_${userId.slice(0, 8)}`
      let displayName: string | null = null
      try {
        const { data: authData } = await supabase.auth.admin.getUserById(userId)
        const meta = authData?.user?.user_metadata ?? {}
        const rawName: string = meta.username || meta.full_name || meta.name || ''
        const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
        if (cleaned.length >= 3) username = cleaned
        displayName = meta.full_name || meta.name || null
      } catch {
        // Fall through to default username
      }

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          username,
          display_name: displayName,
          tokens: 2,   // 2 starter tokens on account creation
          current_streak: 0,
          last_login_date: null,
        })
        .select('current_streak,last_login_date,tokens')
        .single()

      if (createError?.code === '23505') {
        // Username conflict — retry with guaranteed-unique fallback
        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            username: `hunter_${userId.slice(0, 8)}`,
            display_name: displayName,
            tokens: 2,   // 2 starter tokens on account creation
            current_streak: 0,
            last_login_date: null,
          })
          .select('current_streak,last_login_date,tokens')
          .single()
        if (retryError || !retryProfile) return NextResponse.json({ streak: 0, bonus: 0 })
        profile = retryProfile
      } else if (createError || !newProfile) {
        console.error('Profile auto-create failed:', createError?.message)
        return NextResponse.json({ streak: 0, bonus: 0 })
      } else {
        profile = newProfile
      }
    }

    const today = new Date().toISOString().split('T')[0]
    const last = profile.last_login_date

    // Already processed today — return current streak without updating
    if (last === today) return NextResponse.json({ streak: profile.current_streak, bonus: 0 })

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak = last === yesterday ? (profile.current_streak ?? 0) + 1 : 1

    // Milestone bonuses: 3 days = +1, 7 days = +2, 30 days = +5
    const milestones: Record<number, number> = { 3: 1, 7: 2, 30: 5 }
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
    console.error('daily-login error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
