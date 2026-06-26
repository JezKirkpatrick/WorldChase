import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createAuthClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Verify identity from session cookie — never trust body
  const authClient = createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  // Service role needed: profile auto-creation requires auth.admin + bypasses RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    let { data: profile } = await supabase
      .from('profiles')
      .select('current_streak,last_login_date,tokens')
      .eq('id', userId)
      .maybeSingle()

    // Auto-create profile for new users on their first login after signup
    if (!profile) {
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
          id: userId, username, display_name: displayName,
          tokens: 1, current_streak: 0, last_login_date: null,
        })
        .select('current_streak,last_login_date,tokens')
        .maybeSingle()

      if (createError?.code === '23505') {
        const { data: retryProfile, error: retryError } = await supabase
          .from('profiles')
          .insert({
            id: userId, username: `hunter_${userId.slice(0, 8)}`,
            display_name: displayName, tokens: 1, current_streak: 0, last_login_date: null,
          })
          .select('current_streak,last_login_date,tokens')
          .maybeSingle()
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
    const last  = profile.last_login_date

    if (last === today) return NextResponse.json({ streak: profile.current_streak, bonus: 0 })

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const newStreak  = last === yesterday ? (profile.current_streak ?? 0) + 1 : 1

    const milestones: Record<number, number> = { 7: 1, 30: 3 }
    const bonus = milestones[newStreak] ?? 0

    // Atomic streak update — only writes if not already processed today (concurrent-request guard)
    const { data: updated } = await supabase.from('profiles').update({
      current_streak: newStreak,
      last_login_date: today,
    }).eq('id', userId)
      .or(`last_login_date.is.null,last_login_date.neq.${today}`)
      .select('id')

    if (!updated || updated.length === 0) {
      // Another concurrent request already processed today's login
      return NextResponse.json({ streak: profile.current_streak, bonus: 0 })
    }

    // Award bonus tokens atomically via RPC
    if (bonus > 0) {
      await Promise.all([
        supabase.rpc('adjust_tokens', { p_user_id: userId, p_amount: bonus }),
        supabase.from('token_transactions').insert({
          user_id: userId, type: 'earned_login', amount: bonus,
          description: `${newStreak}-day login streak bonus`,
        }),
      ])
    }

    const { data: profileData } = await supabase.from('profiles').select('tokens').eq('id', userId).maybeSingle()
    return NextResponse.json({ streak: newStreak, bonus, newTokenBalance: profileData?.tokens ?? null })
  } catch (err: any) {
    console.error('daily-login error:', err)
    return NextResponse.json({ error: err?.message }, { status: 500 })
  }
}
