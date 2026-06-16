import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as Blob | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 5_000_000) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'File must be an image' }, { status: 400 })

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const path = `${user.id}/avatar.jpg`
  const { error: upErr } = await admin.storage
    .from('avatars')
    .upload(path, file, { contentType: 'image/jpeg', upsert: true })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
  const url = `${publicUrl}?t=${Date.now()}`

  const { error: profErr } = await admin
    .from('profiles')
    .update({ equipped_avatar: url })
    .eq('id', user.id)
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 })

  return NextResponse.json({ url })
}
