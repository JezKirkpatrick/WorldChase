-- ================================================================
-- WorldChase: Shop Cosmetics Update
-- ----------------------------------------------------------------
-- Run this ONCE in the Supabase SQL Editor.
-- Safe to re-run — idempotent inserts and updates.
--
-- What this does:
--   1. Gives token costs to existing non-default shop items
--   2. Adds a full catalogue of shop-purchasable cosmetics
--      (avatars, borders, titles) with proper rarity pricing
-- ================================================================


-- ── STEP 1: Price existing non-default, non-arena shop items ─────
--
-- These are items already in the DB that came with the initial setup.
-- Arena reward items (metadata->>'arena_reward' = 'true') are skipped
-- — they are earned through ranked play, never purchased.

UPDATE cosmetics
SET token_cost = CASE rarity
  WHEN 'common'    THEN CASE WHEN token_cost = 0 THEN 2  ELSE token_cost END
  WHEN 'rare'      THEN CASE WHEN token_cost = 0 THEN 5  ELSE token_cost END
  WHEN 'epic'      THEN CASE WHEN token_cost = 0 THEN 10 ELSE token_cost END
  WHEN 'legendary' THEN CASE WHEN token_cost = 0 THEN 20 ELSE token_cost END
  ELSE token_cost
END
WHERE is_default  = false
  AND type        IN ('avatar', 'border', 'title')
  AND (metadata IS NULL OR metadata->>'arena_reward' != 'true');


-- ── STEP 2: Add new shop catalogue ──────────────────────────────

DO $$
BEGIN
  -- Only insert if catalogue hasn't been seeded yet
  IF NOT EXISTS (SELECT 1 FROM cosmetics WHERE metadata->>'shop_item' = 'true' LIMIT 1) THEN

    -- ── AVATARS ────────────────────────────────────────────────
    -- 3 free defaults + common/rare/epic/legendary paid tiers

    INSERT INTO cosmetics (type, name, value, rarity, token_cost, is_default, metadata) VALUES
      -- Free defaults (is_default = true so they're always unlocked)
      ('avatar', 'Globe',          '🌍', 'common',    0,  true,  '{"shop_item":"true"}'),
      ('avatar', 'Americas',       '🌎', 'common',    0,  true,  '{"shop_item":"true"}'),
      ('avatar', 'Asia Pacific',   '🌏', 'common',    0,  true,  '{"shop_item":"true"}'),

      -- Common (2–3 tokens)
      ('avatar', 'Compass',        '🧭', 'common',    2,  false, '{"shop_item":"true"}'),
      ('avatar', 'Telescope',      '🔭', 'common',    2,  false, '{"shop_item":"true"}'),
      ('avatar', 'Eagle',          '🦅', 'common',    3,  false, '{"shop_item":"true"}'),
      ('avatar', 'Moon',           '🌙', 'common',    3,  false, '{"shop_item":"true"}'),

      -- Rare (5–6 tokens)
      ('avatar', 'Dragon',         '🐉', 'rare',      5,  false, '{"shop_item":"true"}'),
      ('avatar', 'Lion',           '🦁', 'rare',      5,  false, '{"shop_item":"true"}'),
      ('avatar', 'Old Map',        '🗺️', 'rare',      5,  false, '{"shop_item":"true"}'),
      ('avatar', 'Wolf',           '🐺', 'rare',      6,  false, '{"shop_item":"true"}'),
      ('avatar', 'Lightning',      '⚡', 'rare',      6,  false, '{"shop_item":"true"}'),

      -- Epic (10–12 tokens)
      ('avatar', 'Crystal Ball',   '🔮', 'epic',     10,  false, '{"shop_item":"true"}'),
      ('avatar', 'Diamond',        '💎', 'epic',     10,  false, '{"shop_item":"true"}'),
      ('avatar', 'Fox',            '🦊', 'epic',     12,  false, '{"shop_item":"true"}'),
      ('avatar', 'Galaxy',         '🌌', 'epic',     12,  false, '{"shop_item":"true"}'),

      -- Legendary (20–30 tokens)
      ('avatar', 'Crown',          '👑', 'legendary', 20, false, '{"shop_item":"true"}'),
      ('avatar', 'Comet',          '☄️', 'legendary', 20, false, '{"shop_item":"true"}'),
      ('avatar', 'Trophy',         '🏆', 'legendary', 25, false, '{"shop_item":"true"}'),
      ('avatar', 'Infinity',       '♾️', 'legendary', 30, false, '{"shop_item":"true"}');


    -- ── BORDERS ────────────────────────────────────────────────
    -- 'none' is always free; others cost tokens by rarity

    INSERT INTO cosmetics (type, name, value, rarity, token_cost, is_default, metadata) VALUES
      ('border', 'No Border',      'none',     'common',    0,  true,  '{"shop_item":"true"}'),
      ('border', 'Electric',       'electric', 'rare',      5,  false, '{"shop_item":"true"}'),
      ('border', 'Gold Ring',      'gold',     'epic',      10, false, '{"shop_item":"true"}'),
      ('border', 'Diamond Aura',   'diamond',  'legendary', 20, false, '{"shop_item":"true"}'),
      ('border', 'Void Crown',     'legendary','legendary', 25, false, '{"shop_item":"true"}');


    -- ── TITLES ─────────────────────────────────────────────────
    -- Common through Legendary; arena titles (Explorer, Pathfinder, etc.)
    -- are separate and earned through ranked play — NOT listed here.

    INSERT INTO cosmetics (type, name, value, rarity, token_cost, is_default, metadata) VALUES
      -- Common (2–3 tokens)
      ('title', 'Rookie Hunter',     'Rookie Hunter',    'common',    2,  false, '{"shop_item":"true"}'),
      ('title', 'Map Lover',         'Map Lover',        'common',    3,  false, '{"shop_item":"true"}'),
      -- Rare (5–6 tokens)
      ('title', 'World Traveler',    'World Traveler',   'rare',      5,  false, '{"shop_item":"true"}'),
      ('title', 'Geo Expert',        'Geo Expert',       'rare',      6,  false, '{"shop_item":"true"}'),
      -- Epic (10–12 tokens)
      ('title', 'The Cartographer',  'The Cartographer', 'epic',      10, false, '{"shop_item":"true"}'),
      ('title', 'Ghost Hunter',      'Ghost Hunter',     'epic',      12, false, '{"shop_item":"true"}'),
      -- Legendary (20–25 tokens)
      ('title', 'World''s Greatest', 'World''s Greatest','legendary', 20, false, '{"shop_item":"true"}'),
      ('title', 'The Legend',        'The Legend',       'legendary', 25, false, '{"shop_item":"true"}');

  END IF;
END $$;
