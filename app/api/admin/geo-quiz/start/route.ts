import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { quizId } = await req.json()
    if (!quizId) return NextResponse.json({ error: 'Missing quizId' }, { status: 400 })

    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existing } = await service.from('geo_quizzes').select('questions, status').eq('id', quizId).maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    if (existing.status === 'live') return NextResponse.json({ error: 'Already live' }, { status: 400 })
    if (!existing.questions || existing.questions.length === 0)
      return NextResponse.json({ error: 'No questions generated yet' }, { status: 400 })

    // Start 5 seconds from now so all clients can prepare
    const startedAt = new Date(Date.now() + 5000).toISOString()
    const { data, error } = await service.from('geo_quizzes').update({
      status: 'live',
      started_at: startedAt,
    }).eq('id', quizId).select().maybeSingle()

    if (error) throw error
    return NextResponse.json({ quiz: data })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
