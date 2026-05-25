import { NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// One-time endpoint — visit once to grant admin, then delete this file.
export async function GET() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await admin
    .from('profiles')
    .update({ is_admin: true })
    .ilike('username', 'biohazard')
    .select('id, username, is_admin')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      error: 'No profile found with username "Biohazard". Make sure you have signed in at least once.',
    }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    message: `✓ Admin granted to "${data[0].username}". Go to /admin — then delete this endpoint.`,
    profile: { username: data[0].username, is_admin: data[0].is_admin },
  })
}
