-- VS duel points for all-time Hall of Fame ranking
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS vs_score      INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vs_duels_won  INT NOT NULL DEFAULT 0;

-- Atomic increment — called when a VS duel is won
CREATE OR REPLACE FUNCTION increment_vs_stats(p_user_id UUID, p_score INT)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET vs_score     = vs_score     + p_score,
      vs_duels_won = vs_duels_won + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
