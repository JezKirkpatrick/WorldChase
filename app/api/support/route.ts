import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { email, category, subject, description } = await req.json()

  if (!email || !category || !subject || !description) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
  }
  if (description.trim().length < 20) {
    return NextResponse.json({ error: 'Please describe the issue in more detail (20+ characters)' }, { status: 400 })
  }

  const { error } = await supabase.from('support_tickets').insert({
    user_id: user?.id ?? null,
    email: email.trim(),
    category,
    subject: subject.trim(),
    description: description.trim(),
    status: 'open',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
