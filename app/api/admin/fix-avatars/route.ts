import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const NEW_AVATARS = [
  // Free defaults — 3 distinct, exploration-themed
  { name: 'Globe',        value: '🌍', rarity: 'common',    token_cost: 0,  is_default: true  },
  { name: 'Compass',      value: '🧭', rarity: 'common',    token_cost: 0,  is_default: true  },
  { name: 'Telescope',    value: '🔭', rarity: 'common',    token_cost: 0,  is_default: true  },
  // Common paid
  { name: 'Sailboat',     value: '⛵', rarity: 'common',    token_cost: 2,  is_default: false },
  { name: 'Mountain',     value: '🏔️', rarity: 'common',    token_cost: 2,  is_default: false },
  { name: 'Wave',         value: '🌊', rarity: 'common',    token_cost: 3,  is_default: false },
  { name: 'Moon',         value: '🌙', rarity: 'common',    token_cost: 3,  is_default: false },
  // Rare
  { name: 'Dragon',       value: '🐉', rarity: 'rare',      token_cost: 5,  is_default: false },
  { name: 'Lion',         value: '🦁', rarity: 'rare',      token_cost: 5,  is_default: false },
  { name: 'Wolf',         value: '🐺', rarity: 'rare',      token_cost: 5,  is_default: false },
  { name: 'Eagle',        value: '🦅', rarity: 'rare',      token_cost: 6,  is_default: false },
  { name: 'Shark',        value: '🦈', rarity: 'rare',      token_cost: 6,  is_default: false },
  // Epic
  { name: 'Crystal Ball', value: '🔮', rarity: 'epic',      token_cost: 10, is_default: false },
  { name: 'Galaxy',       value: '🌌', rarity: 'epic',      token_cost: 10, is_default: false },
  { name: 'Fox',          value: '🦊', rarity: 'epic',      token_cost: 12, is_default: false },
  { name: 'Volcano',      value: '🌋', rarity: 'epic',      token_cost: 12, is_default: false },
  // Legendary
  { name: 'Trident',      value: '🔱', rarity: 'legendary', token_cost: 20, is_default: false },
  { name: 'Comet',        value: '☄️', rarity: 'legendary', token_cost: 20, is_default: false },
  { name: 'Trophy',       value: '🏆', rarity: 'legendary', token_cost: 25, is_default: false },
  { name: 'Crown',        value: '👑', rarity: 'legendary', token_cost: 30, is_default: false },
]

async function run() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: string[] = []

  // 1. Get all existing avatar cosmetics except the ultimate custom_upload
  const { data: existing } = await admin
    .from('cosmetics')
    .select('id, value')
    .eq('type', 'avatar')
    .neq('value', 'custom_upload')

  if (existing && existing.length > 0) {
    const ids = existing.map((c: any) => c.id)
    const values = existing.map((c: any) => c.value)

    // 2. Remove user ownership records for these avatars
    await admin.from('user_cosmetics').delete().in('cosmetic_id', ids)

    // 3. Reset any profile that had one of the removed emojis equipped
    await admin.from('profiles').update({ equipped_avatar: '🌍' }).in('equipped_avatar', values)

    // 4. Delete the old cosmetic rows
    const { error: delErr } = await admin.from('cosmetics').delete().in('id', ids)
    if (delErr) results.push(`Delete error: ${delErr.message}`)
    else results.push(`Removed ${ids.length} old avatar cosmetics (duplicates + old set)`)
  } else {
    results.push('No existing avatar cosmetics found')
  }

  // 5. Insert the clean new set
  const rows = NEW_AVATARS.map(a => ({ ...a, type: 'avatar', metadata: { shop_item: 'true' } }))
  const { error: insErr } = await admin.from('cosmetics').insert(rows)
  if (insErr) results.push(`Insert error: ${insErr.message}`)
  else results.push(`Inserted ${rows.length} fresh avatars`)

  return NextResponse.json({ ok: !results.some(r => r.includes('error')), results })
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return run()
}

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return run()
}
