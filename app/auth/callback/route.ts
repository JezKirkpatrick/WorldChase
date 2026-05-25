import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {}
          },
        },
      }
    )

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      const user = session.user
      const meta = user.user_metadata ?? {}

      // Create profile if it doesn't exist yet
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!existing) {
        const rawName: string =
          meta.username || meta.full_name || meta.name ||
          user.email?.split('@')[0] || 'hunter'

        const cleaned = rawName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
        const username = cleaned.length >= 3 ? cleaned : `hunter_${user.id.slice(0, 8)}`

        const { error: insertError } = await supabase.from('profiles').insert({
          id: user.id,
          username,
          display_name: meta.full_name || meta.name || null,
          tokens: 2,
          current_streak: 0,
          last_login_date: null,
        })

        // Username conflict — fall back to hunter_XXXXXXXX
        if (insertError?.code === '23505') {
          await supabase.from('profiles').insert({
            id: user.id,
            username: `hunter_${user.id.slice(0, 8)}`,
            display_name: meta.full_name || meta.name || null,
            tokens: 2,
            current_streak: 0,
            last_login_date: null,
          })
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    }
  }

  // No code or exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/auth/login?error=auth-failed`)
}
