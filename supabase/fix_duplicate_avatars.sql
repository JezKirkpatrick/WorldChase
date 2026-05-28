-- Fix duplicate avatar cosmetics in the shop
-- Run once in the Supabase SQL Editor.

-- 1. Change the legendary/expensive Diamond avatar to "Stardust" (🌟)
--    The epic 💎 Diamond (10 tokens) stays as-is.
--    The legendary 💎 duplicate becomes a unique prestige item.
UPDATE cosmetics
SET name = 'Stardust', value = '🌟'
WHERE id = (
  SELECT id FROM cosmetics
  WHERE type = 'avatar' AND value = '💎'
  ORDER BY token_cost DESC, id DESC
  LIMIT 1
);

-- 2. Change the cheaper/duplicate Crown avatar to "Trident" (🔱)
--    The legendary 👑 Crown stays.
--    Any duplicate 👑 with a lower cost becomes a Trident.
UPDATE cosmetics
SET name = 'Trident', value = '🔱'
WHERE id = (
  SELECT id FROM cosmetics
  WHERE type = 'avatar' AND value = '👑'
  ORDER BY token_cost ASC, id ASC
  LIMIT 1
);
