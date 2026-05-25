import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// One-time endpoint — visit once to grant admin, then delete this file.
export async function GET(request: Request) {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const grant = searchParams.get('grant') // ?grant=1 to actually apply

  // Always list all profiles so we can find the right username
  const { data: allProfiles, error: listError } = await admin
    .from('profiles')
    .select('id, username, display_name, is_admin')
    .order('created_at', { ascending: false })
    .limit(20)

  if (listError) {
    return NextResponse.json({ error: listError.message }, { status: 500 })
  }

  // If ?grant=1 not present, just return the list so we can identify the account
  if (grant !== '1') {
    return NextResponse.json({
      info: 'Add ?grant=1 to the URL to grant admin to the first profile listed, or check usernames below.',
      profiles: allProfiles,
    })
  }

  // ?grant=1 — grant admin to ALL profiles for now (user can revoke others later)
  // Actually just grant to the most recently created profile that isn't already admin
  const target = allProfiles?.find(p => !p.is_admin) ?? allProfiles?.[0]
  if (!target) {
    return NextResponse.json({ error: 'No profiles found at all.' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', target.id)
    .select('id, username, is_admin')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `✓ Admin granted to "${data?.[0]?.username}". Go to /admin — then delete this endpoint.`,
    profile: data?.[0],
  })
}
