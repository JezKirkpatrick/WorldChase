import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createAdmin } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function runSeed() {
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const results: string[] = []

  // ── Step 1: Price existing non-default, non-arena items ──────────
  const { data: existing } = await admin
    .from('cosmetics')
    .select('id, rarity, token_cost, is_default, metadata')
    .in('type', ['avatar', 'border', 'title'])

  const pricingMap: Record<string, number> = { common: 2, rare: 5, epic: 10, legendary: 20 }
  const toPrice = (existing ?? []).filter(c =>
    !c.is_default &&
    c.token_cost === 0 &&
    c.metadata?.arena_reward !== 'true' &&
    c.metadata?.shop_item !== 'true'
  )

  let priced = 0
  for (const item of toPrice) {
    const cost = pricingMap[item.rarity] ?? 0
    if (cost > 0) {
      await admin.from('cosmetics').update({ token_cost: cost }).eq('id', item.id)
      priced++
    }
  }
  results.push(`Priced ${priced} existing items`)

  // ── Step 2: Insert new shop catalogue (idempotent) ────────────────
  const { data: alreadySeeded } = await admin
    .from('cosmetics')
    .select('id')
    .filter('metadata->>shop_item', 'eq', 'true')
    .limit(1)

  if (alreadySeeded && alreadySeeded.length > 0) {
    results.push('Shop catalogue already seeded — skipped')
    return NextResponse.json({ ok: true, results })
  }

  const avatars = [
    { type: 'avatar', name: 'Globe',         value: '🌍', rarity: 'common',    token_cost: 0,  is_default: true  },
    { type: 'avatar', name: 'Americas',      value: '🌎', rarity: 'common',    token_cost: 0,  is_default: true  },
    { type: 'avatar', name: 'Asia Pacific',  value: '🌏', rarity: 'common',    token_cost: 0,  is_default: true  },
    { type: 'avatar', name: 'Compass',       value: '🧭', rarity: 'common',    token_cost: 2,  is_default: false },
    { type: 'avatar', name: 'Telescope',     value: '🔭', rarity: 'common',    token_cost: 2,  is_default: false },
    { type: 'avatar', name: 'Eagle',         value: '🦅', rarity: 'common',    token_cost: 3,  is_default: false },
    { type: 'avatar', name: 'Moon',          value: '🌙', rarity: 'common',    token_cost: 3,  is_default: false },
    { type: 'avatar', name: 'Dragon',        value: '🐉', rarity: 'rare',      token_cost: 5,  is_default: false },
    { type: 'avatar', name: 'Lion',          value: '🦁', rarity: 'rare',      token_cost: 5,  is_default: false },
    { type: 'avatar', name: 'Old Map',       value: '🗺️', rarity: 'rare',      token_cost: 5,  is_default: false },
    { type: 'avatar', name: 'Wolf',          value: '🐺', rarity: 'rare',      token_cost: 6,  is_default: false },
    { type: 'avatar', name: 'Lightning',     value: '⚡', rarity: 'rare',      token_cost: 6,  is_default: false },
    { type: 'avatar', name: 'Crystal Ball',  value: '🔮', rarity: 'epic',      token_cost: 10, is_default: false },
    { type: 'avatar', name: 'Diamond',       value: '💎', rarity: 'epic',      token_cost: 10, is_default: false },
    { type: 'avatar', name: 'Fox',           value: '🦊', rarity: 'epic',      token_cost: 12, is_default: false },
    { type: 'avatar', name: 'Galaxy',        value: '🌌', rarity: 'epic',      token_cost: 12, is_default: false },
    { type: 'avatar', name: 'Crown',         value: '👑', rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'avatar', name: 'Comet',         value: '☄️', rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'avatar', name: 'Trophy',        value: '🏆', rarity: 'legendary', token_cost: 25, is_default: false },
    { type: 'avatar', name: 'Infinity',      value: '♾️', rarity: 'legendary', token_cost: 30, is_default: false },
  ]

  const borders = [
    { type: 'border', name: 'No Border',    value: 'none',      rarity: 'common',    token_cost: 0,  is_default: true  },
    { type: 'border', name: 'Electric',     value: 'electric',  rarity: 'rare',      token_cost: 5,  is_default: false },
    { type: 'border', name: 'Gold Ring',    value: 'gold',      rarity: 'epic',      token_cost: 10, is_default: false },
    { type: 'border', name: 'Diamond Aura', value: 'diamond',   rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'border', name: 'Void Crown',   value: 'legendary', rarity: 'legendary', token_cost: 25, is_default: false },
  ]

  const titles = [
    { type: 'title', name: 'Rookie Hunter',    value: 'Rookie Hunter',    rarity: 'common',    token_cost: 2,  is_default: false },
    { type: 'title', name: 'Map Lover',        value: 'Map Lover',        rarity: 'common',    token_cost: 3,  is_default: false },
    { type: 'title', name: 'World Traveler',   value: 'World Traveler',   rarity: 'rare',      token_cost: 5,  is_default: false },
    { type: 'title', name: 'Geo Expert',       value: 'Geo Expert',       rarity: 'rare',      token_cost: 6,  is_default: false },
    { type: 'title', name: 'The Cartographer', value: 'The Cartographer', rarity: 'epic',      token_cost: 10, is_default: false },
    { type: 'title', name: 'Ghost Hunter',     value: 'Ghost Hunter',     rarity: 'epic',      token_cost: 12, is_default: false },
    { type: 'title', name: "World's Greatest", value: "World's Greatest", rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'title', name: 'The Legend',       value: 'The Legend',       rarity: 'legendary', token_cost: 25, is_default: false },
  ]

  const allItems = [...avatars, ...borders, ...titles].map(item => ({
    ...item,
    metadata: { shop_item: 'true' },
  }))

  const { error } = await admin.from('cosmetics').insert(allItems)
  if (error) {
    return NextResponse.json({ error: error.message, results }, { status: 500 })
  }

  results.push(`Inserted ${allItems.length} new shop items`)
  return NextResponse.json({ ok: true, results })
}

// ── GET: open for one-time seeding (idempotent — safe to expose) ──
export async function GET() {
  return runSeed()
}

// ── POST: protected by is_admin flag ─────────────────────────────
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return runSeed()
}
