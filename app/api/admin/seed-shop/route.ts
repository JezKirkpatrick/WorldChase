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
    // ← do NOT return here; fall through so Step 3 still runs
  } else {
  // ── only insert if not already seeded ──────────────────────────────
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
    { type: 'avatar', name: 'Trident',       value: '🔱', rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'avatar', name: 'Comet',         value: '☄️', rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'avatar', name: 'Trophy',        value: '🏆', rarity: 'legendary', token_cost: 25, is_default: false },
    { type: 'avatar', name: 'Infinity',      value: '♾️', rarity: 'legendary', token_cost: 30, is_default: false },
  ]

  const borders = [
    { type: 'border', name: 'No Border',    value: 'none',      rarity: 'common',    token_cost: 0,  is_default: true  },
    { type: 'border', name: 'Neon Pulse',   value: 'electric',  rarity: 'rare',      token_cost: 5,  is_default: false },
    { type: 'border', name: 'Thorns',       value: 'thorns',    rarity: 'rare',      token_cost: 6,  is_default: false },
    { type: 'border', name: 'Fire Ring',    value: 'fire',      rarity: 'epic',      token_cost: 10, is_default: false },
    { type: 'border', name: 'Gold Crown',   value: 'gold',      rarity: 'epic',      token_cost: 12, is_default: false },
    { type: 'border', name: 'Crystal Aura', value: 'diamond',   rarity: 'legendary', token_cost: 20, is_default: false },
    { type: 'border', name: 'Void Ring',    value: 'legendary', rarity: 'legendary', token_cost: 25, is_default: false },
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
  } // end else (step 2 insert)

  // ── Step 3: Seed chat reaction emojis (always runs) ──────────────
  const { data: alreadySeededEmojis } = await admin
    .from('cosmetics')
    .select('id')
    .eq('type', 'chat_emoji')
    .limit(1)

  if (!alreadySeededEmojis || alreadySeededEmojis.length === 0) {
    const chatEmojis = [
      // Common — 2-3 tokens
      { name: 'Fire',        value: '🔥', rarity: 'common',    token_cost: 2  },
      { name: 'Zap',         value: '⚡', rarity: 'common',    token_cost: 2  },
      { name: 'Wave',        value: '🌊', rarity: 'common',    token_cost: 2  },
      { name: 'Sparkles',    value: '✨', rarity: 'common',    token_cost: 3  },
      { name: 'Target',      value: '🎯', rarity: 'common',    token_cost: 3  },
      // Rare — 5-6 tokens
      { name: 'Rocket',      value: '🚀', rarity: 'rare',      token_cost: 5  },
      { name: 'Boom',        value: '💥', rarity: 'rare',      token_cost: 5  },
      { name: 'Gold Medal',  value: '🥇', rarity: 'rare',      token_cost: 5  },
      { name: 'Eyes',        value: '👀', rarity: 'rare',      token_cost: 5  },
      { name: 'Brain',       value: '🧠', rarity: 'rare',      token_cost: 6  },
      { name: 'Hot Face',    value: '🥵', rarity: 'rare',      token_cost: 5  },
      // Epic — 10-12 tokens
      { name: 'Mind Blown',  value: '🤯', rarity: 'epic',      token_cost: 10 },
      { name: 'Gem',         value: '💎', rarity: 'epic',      token_cost: 10 },
      { name: 'Crown',       value: '👑', rarity: 'epic',      token_cost: 12 },
      // Legendary — 15-20 tokens
      { name: 'Comet',       value: '☄️', rarity: 'legendary', token_cost: 15 },
      { name: 'Galaxy',      value: '🌌', rarity: 'legendary', token_cost: 20 },
    ].map(item => ({
      ...item,
      type: 'chat_emoji',
      is_default: false,
      metadata: { chat_emoji_item: 'true' },
    }))

    const { error: emojiError } = await admin.from('cosmetics').insert(chatEmojis)
    if (emojiError) {
      results.push(`Chat emoji seed error: ${emojiError.message}`)
    } else {
      results.push(`Inserted ${chatEmojis.length} chat reaction emojis`)
    }
  } else {
    results.push('Chat emoji reactions already seeded — skipped')
  }

  // ── Step 4: Insert any missing new borders (idempotent) ──────────
  const newBorders = [
    { name: 'Fire Ring', value: 'fire',   rarity: 'epic', token_cost: 10 },
    { name: 'Thorns',    value: 'thorns', rarity: 'rare', token_cost: 6  },
  ]
  for (const b of newBorders) {
    const { data: exists } = await admin.from('cosmetics').select('id')
      .eq('type', 'border').eq('value', b.value).limit(1)
    if (!exists || exists.length === 0) {
      const { error: bErr } = await admin.from('cosmetics').insert({
        ...b, type: 'border', is_default: false, metadata: { shop_item: 'true' },
      })
      results.push(bErr ? `Border error (${b.name}): ${bErr.message}` : `Inserted border: ${b.name}`)
    } else {
      results.push(`Border already exists: ${b.name}`)
    }
  }

  // ── Step 5: Insert ultimate avatar item (idempotent) ────────────
  const { data: ultimateExists } = await admin.from('cosmetics').select('id')
    .eq('type', 'avatar').eq('value', 'custom_upload').limit(1)

  if (!ultimateExists || ultimateExists.length === 0) {
    const { error: ultErr } = await admin.from('cosmetics').insert({
      type: 'avatar',
      name: 'Ultimate Avatar',
      value: 'custom_upload',
      rarity: 'ultimate',
      token_cost: 50,
      is_default: false,
      metadata: { shop_item: 'true' },
    })
    results.push(ultErr ? `Ultimate avatar error: ${ultErr.message}` : 'Inserted ultimate avatar item')
  } else {
    results.push('Ultimate avatar already exists — skipped')
  }

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
