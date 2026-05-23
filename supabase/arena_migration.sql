-- ================================================================
-- WorldChase: Competitive Arena System Migration
-- Run once in the Supabase SQL editor.
-- ================================================================


-- ── 1. ENUM TYPES ───────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE match_format_enum AS ENUM ('1v1', '2v2', 'ffa5');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_status_enum AS ENUM ('waiting', 'active', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE match_result_enum AS ENUM ('win', 'loss', 'refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE friendship_status_enum AS ENUM ('pending', 'accepted', 'declined');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE online_status_enum AS ENUM ('online', 'in_match', 'offline');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. PROFILES: ADD ONLINE PRESENCE COLUMNS ────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS online_status online_status_enum DEFAULT 'offline',
  ADD COLUMN IF NOT EXISTS last_seen timestamptz;


-- ── 3. ARENA_PROGRESS ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS arena_progress (
  user_id              uuid    PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_arena        int     NOT NULL DEFAULT 1 CHECK (current_arena >= 1 AND current_arena <= 9),
  trophies             int     NOT NULL DEFAULT 0 CHECK (trophies >= 0),
  elo                  int     NOT NULL DEFAULT 1000,
  win_streak           int     NOT NULL DEFAULT 0,
  season_highest_arena int     NOT NULL DEFAULT 1,
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE arena_progress ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "arena_progress_select_all"
    ON arena_progress FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "arena_progress_insert_own"
    ON arena_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- No direct UPDATE policy: all trophy/ELO changes go through SECURITY DEFINER functions.


-- ── 4. RANKED_MATCHES ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ranked_matches (
  id           uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  format       match_format_enum NOT NULL,
  arena_level  int               NOT NULL CHECK (arena_level >= 1 AND arena_level <= 9),
  status       match_status_enum NOT NULL DEFAULT 'waiting',
  challenge_id uuid              REFERENCES challenges(id),
  created_at   timestamptz       DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE ranked_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ranked_matches_select_all"
    ON ranked_matches FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ranked_matches_insert_authenticated"
    ON ranked_matches FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 5. RANKED_MATCH_PLAYERS ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS ranked_match_players (
  id           uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id     uuid              NOT NULL REFERENCES ranked_matches(id) ON DELETE CASCADE,
  user_id      uuid              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  team         int               CHECK (team IN (1, 2)),
  score        int,
  result       match_result_enum,
  trophy_change int,
  token_change  int,
  submitted_at  timestamptz
);

ALTER TABLE ranked_match_players ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "ranked_match_players_select_all"
    ON ranked_match_players FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "ranked_match_players_insert_authenticated"
    ON ranked_match_players FOR INSERT TO authenticated WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Players may only submit their own score/timestamp via this policy.
-- The result, trophy_change, and token_change columns are written by SECURITY DEFINER functions only.
DO $$ BEGIN
  CREATE POLICY "ranked_match_players_update_own"
    ON ranked_match_players FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 6. FRIENDSHIPS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS friendships (
  id           uuid                  DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id uuid                  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid                  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       friendship_status_enum NOT NULL DEFAULT 'pending',
  created_at   timestamptz           DEFAULT now(),
  UNIQUE (requester_id, recipient_id)
);

ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "friendships_select_involved"
    ON friendships FOR SELECT TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "friendships_insert_as_requester"
    ON friendships FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = requester_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "friendships_update_as_recipient"
    ON friendships FOR UPDATE TO authenticated
    USING (auth.uid() = recipient_id)
    WITH CHECK (auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "friendships_delete_involved"
    ON friendships FOR DELETE TO authenticated
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 7. PRIVATE_MATCHES ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS private_matches (
  id           uuid              DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id      uuid              NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  guest_id     uuid              REFERENCES profiles(id) ON DELETE SET NULL,
  challenge_id uuid              NOT NULL REFERENCES challenges(id),
  status       match_status_enum NOT NULL DEFAULT 'waiting',
  invite_code  text              NOT NULL UNIQUE,
  created_at   timestamptz       DEFAULT now()
);

ALTER TABLE private_matches ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "private_matches_select_involved"
    ON private_matches FOR SELECT TO authenticated
    USING (auth.uid() = host_id OR auth.uid() = guest_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "private_matches_insert_as_host"
    ON private_matches FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "private_matches_update_involved"
    ON private_matches FOR UPDATE TO authenticated
    USING (auth.uid() = host_id OR auth.uid() = guest_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 8. TOKEN_TRANSACTIONS: ADD REFERENCE COLUMN ─────────────────

ALTER TABLE token_transactions ADD COLUMN IF NOT EXISTS reference_id uuid;

-- If your token_transactions.type column has a CHECK constraint, run this to add the ranked types:
-- ALTER TABLE token_transactions DROP CONSTRAINT IF EXISTS token_transactions_type_check;
-- ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_type_check
--   CHECK (type IN ('purchase', 'shop_purchase', 'streak_bonus', 'daily_bonus',
--                   'achievement_reward', 'ranked_win', 'ranked_loss'));


-- ── 9. COSMETICS: ADD ARENA_REWARD TYPE & METADATA COLUMN ───────

ALTER TABLE cosmetics ADD COLUMN IF NOT EXISTS metadata jsonb;

ALTER TABLE cosmetics DROP CONSTRAINT IF EXISTS cosmetics_type_check;
ALTER TABLE cosmetics ADD CONSTRAINT cosmetics_type_check
  CHECK (type IN ('avatar', 'border', 'title', 'username_color', 'arena_reward'));


-- ── 10. ARENA REWARD COSMETICS SEED ─────────────────────────────
-- Idempotent: only inserts if no arena reward rows exist yet.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cosmetics WHERE metadata->>'arena_reward' = 'true' LIMIT 1) THEN

    INSERT INTO cosmetics (type, name, value, rarity, token_cost, metadata) VALUES
      ('title', 'Explorer',          'Explorer',          'common',    0, '{"arena": 1, "arena_reward": "true"}'),
      ('title', 'Navigator',         'Navigator',         'common',    0, '{"arena": 2, "arena_reward": "true"}'),
      ('title', 'Cartographer',      'Cartographer',      'rare',      0, '{"arena": 3, "arena_reward": "true"}'),
      ('title', 'Pathfinder',        'Pathfinder',        'rare',      0, '{"arena": 4, "arena_reward": "true"}'),
      ('title', 'Trailblazer',       'Trailblazer',       'epic',      0, '{"arena": 5, "arena_reward": "true"}'),
      ('title', 'Wayfarer',          'Wayfarer',          'epic',      0, '{"arena": 6, "arena_reward": "true"}'),
      ('title', 'Pioneer',           'Pioneer',           'legendary', 0, '{"arena": 7, "arena_reward": "true"}'),
      ('title', 'Sovereign',         'Sovereign',         'legendary', 0, '{"arena": 8, "arena_reward": "true"}'),
      ('title', 'Hall of Champions', 'Hall of Champions', 'legendary', 0, '{"arena": 9, "arena_reward": "true"}'),

      ('border', 'Bronze Trim',      'bronze',    'common',    0, '{"arena": 1, "arena_reward": "true", "border_style": "bronze"}'),
      ('border', 'Bronze Trim II',   'bronze-ii', 'common',    0, '{"arena": 2, "arena_reward": "true", "border_style": "bronze-ii"}'),
      ('border', 'Silver Edge',      'silver',    'rare',      0, '{"arena": 3, "arena_reward": "true", "border_style": "silver"}'),
      ('border', 'Silver Edge II',   'silver-ii', 'rare',      0, '{"arena": 4, "arena_reward": "true", "border_style": "silver-ii"}'),
      ('border', 'Gold Frame',       'gold',      'epic',      0, '{"arena": 5, "arena_reward": "true", "border_style": "gold"}'),
      ('border', 'Gold Frame II',    'gold-ii',   'epic',      0, '{"arena": 6, "arena_reward": "true", "border_style": "gold-ii"}'),
      ('border', 'Platinum Ring',    'platinum',  'legendary', 0, '{"arena": 7, "arena_reward": "true", "border_style": "platinum"}'),
      ('border', 'Diamond Crown',    'diamond',   'legendary', 0, '{"arena": 8, "arena_reward": "true", "border_style": "diamond"}'),
      ('border', 'Champion Aura',    'champion',  'legendary', 0, '{"arena": 9, "arena_reward": "true", "border_style": "champion"}');

  END IF;
END $$;


-- ── 11. HELPER FUNCTION: get_arena_wager ────────────────────────

CREATE OR REPLACE FUNCTION get_arena_wager(p_arena int)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_arena
    WHEN 1 THEN 10
    WHEN 2 THEN 25
    WHEN 3 THEN 50
    WHEN 4 THEN 100
    WHEN 5 THEN 200
    WHEN 6 THEN 350
    WHEN 7 THEN 500
    WHEN 8 THEN 750
    WHEN 9 THEN 1000
    ELSE 0
  END;
$$;


-- ── 12. FUNCTION: update_trophies_after_match ───────────────────
--
-- Called per-player after a match resolves.
-- For arenas 1-8: adjusts trophies, handles promotion/demotion, updates win streak.
-- For arena 9:    adjusts ELO using the standard ELO formula (K=32).
--
-- Parameters:
--   p_user_id       uuid              the player
--   p_result        match_result_enum 'win' | 'loss' | 'refund'
--   p_arena_level   int               the arena the match was played in (1-9)
--   p_opponent_elo  int               opponent's ELO before the match (only used in arena 9 1v1)
--
-- Returns jsonb with keys:
--   trophy_change, new_trophies, new_arena, promoted, demoted, new_streak, elo_change, new_elo

CREATE OR REPLACE FUNCTION update_trophies_after_match(
  p_user_id      uuid,
  p_result       match_result_enum,
  p_arena_level  int,
  p_opponent_elo int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress     arena_progress%ROWTYPE;
  v_trophy_change int;
  v_new_trophies  int;
  v_new_arena     int;
  v_new_streak    int;
  v_elo_change    int := 0;
  v_new_elo       int;
  v_expected      real;
  -- min trophies required to be in each arena (1-indexed: index = arena level)
  v_min_trophies  int[] := ARRAY[0, 50, 150, 300, 500, 750, 1000, 1350];
BEGIN
  -- Ensure row exists for this player
  INSERT INTO arena_progress (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_progress
  FROM arena_progress
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- ── Arena 9: ELO path ────────────────────────────────────────
  IF p_arena_level = 9 THEN
    IF p_result = 'win' THEN
      IF p_opponent_elo IS NOT NULL THEN
        v_expected   := 1.0 / (1.0 + power(10.0, (p_opponent_elo - v_progress.elo)::real / 400.0));
        v_elo_change := round(32.0 * (1.0 - v_expected))::int;
      ELSE
        v_elo_change := 16;
      END IF;
    ELSIF p_result = 'loss' THEN
      IF p_opponent_elo IS NOT NULL THEN
        v_expected   := 1.0 / (1.0 + power(10.0, (p_opponent_elo - v_progress.elo)::real / 400.0));
        v_elo_change := round(32.0 * (0.0 - v_expected))::int;
      ELSE
        v_elo_change := -16;
      END IF;
    ELSE
      v_elo_change := 0;
    END IF;

    v_new_elo := GREATEST(0, v_progress.elo + v_elo_change);

    UPDATE arena_progress SET
      elo        = v_new_elo,
      win_streak = CASE WHEN p_result = 'win' THEN win_streak + 1 ELSE 0 END,
      updated_at = now()
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object(
      'trophy_change', 0,
      'new_trophies',  v_progress.trophies,
      'new_arena',     9,
      'promoted',      false,
      'demoted',       false,
      'new_streak',    CASE WHEN p_result = 'win' THEN v_progress.win_streak + 1 ELSE 0 END,
      'elo_change',    v_new_elo - v_progress.elo,
      'new_elo',       v_new_elo
    );
  END IF;

  -- ── Arenas 1-8: Trophy path ──────────────────────────────────
  IF p_result = 'win' THEN
    -- Win streak bonus: +2 trophies when streak >= 3, otherwise +1
    v_trophy_change := CASE WHEN v_progress.win_streak >= 3 THEN 2 ELSE 1 END;
    v_new_streak    := v_progress.win_streak + 1;
  ELSIF p_result = 'loss' THEN
    v_trophy_change := -1;
    v_new_streak    := 0;
  ELSE -- refund
    v_trophy_change := 0;
    v_new_streak    := v_progress.win_streak;
  END IF;

  -- Floor at 0 (trophies cannot go negative)
  v_new_trophies  := GREATEST(0, v_progress.trophies + v_trophy_change);
  -- Recalculate actual change after flooring
  v_trophy_change := v_new_trophies - v_progress.trophies;

  v_new_arena := v_progress.current_arena;

  -- Promotion: check if new trophies meet the next arena's threshold (capped at arena 8)
  IF v_new_arena < 8 AND v_new_trophies >= v_min_trophies[v_new_arena + 1] THEN
    v_new_arena := v_new_arena + 1;
  END IF;

  -- Demotion: if trophies fell below the current arena's minimum, drop down
  -- Arena 1 is the floor: cannot be demoted out of it
  WHILE v_new_arena > 1 AND v_new_trophies < v_min_trophies[v_new_arena] LOOP
    v_new_arena := v_new_arena - 1;
  END LOOP;

  UPDATE arena_progress SET
    trophies             = v_new_trophies,
    current_arena        = v_new_arena,
    win_streak           = v_new_streak,
    season_highest_arena = GREATEST(season_highest_arena, v_new_arena),
    updated_at           = now()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'trophy_change', v_trophy_change,
    'new_trophies',  v_new_trophies,
    'new_arena',     v_new_arena,
    'promoted',      v_new_arena > v_progress.current_arena,
    'demoted',       v_new_arena < v_progress.current_arena,
    'new_streak',    v_new_streak,
    'elo_change',    0,
    'new_elo',       v_progress.elo
  );
END;
$$;


-- ── 13. FUNCTION: handle_match_completion ───────────────────────
--
-- Call via: SELECT handle_match_completion('<match_uuid>');
--
-- Resolves a ranked match, distributes tokens, updates trophies/ELO,
-- writes token_transactions, and marks the match completed.
--
-- Match must be in 'active' status when called.
-- NULL score = disconnected player, treated as last place / loss.
--
-- Token flow:
--   1v1:  winner +wager, loser -wager (zero-sum)
--   2v2:  higher-avg team wins; each winner +wager, each loser -wager
--   ffa5: 1st +4*wager, 2nd refund (0), 3rd-5th -wager each

CREATE OR REPLACE FUNCTION handle_match_completion(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_match        ranked_matches%ROWTYPE;
  v_wager        int;
  v_player       ranked_match_players%ROWTYPE;
  v_result_json  jsonb;
  v_token_change int;
  v_player_result match_result_enum;
  v_rank          int;

  -- 1v1 helpers
  v_p1           ranked_match_players%ROWTYPE;
  v_p2           ranked_match_players%ROWTYPE;
  v_p1_score     int;
  v_p2_score     int;
  v_p1_elo       int;
  v_p2_elo       int;

  -- 2v2 helpers
  v_team1_score  bigint;
  v_team1_count  bigint;
  v_team2_score  bigint;
  v_team2_count  bigint;
  v_team1_avg    real;
  v_team2_avg    real;
BEGIN
  SELECT * INTO v_match FROM ranked_matches WHERE id = p_match_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Match not found');
  END IF;
  IF v_match.status != 'active' THEN
    RETURN jsonb_build_object('error', 'Match is not active (status: ' || v_match.status || ')');
  END IF;

  v_wager := get_arena_wager(v_match.arena_level);

  -- ─────────────────────────────────────────────────────────────
  --  1v1
  -- ─────────────────────────────────────────────────────────────
  IF v_match.format = '1v1' THEN

    SELECT * INTO v_p1 FROM ranked_match_players WHERE match_id = p_match_id ORDER BY id LIMIT 1;
    SELECT * INTO v_p2 FROM ranked_match_players WHERE match_id = p_match_id AND id != v_p1.id ORDER BY id LIMIT 1;

    -- Treat NULL score as -1 (guaranteed loss position)
    v_p1_score := COALESCE(v_p1.score, -1);
    v_p2_score := COALESCE(v_p2.score, -1);

    -- Pre-match ELOs for Arena 9 calculation
    SELECT COALESCE(elo, 1000) INTO v_p1_elo FROM arena_progress WHERE user_id = v_p1.user_id;
    SELECT COALESCE(elo, 1000) INTO v_p2_elo FROM arena_progress WHERE user_id = v_p2.user_id;

    IF v_p1_score > v_p2_score THEN
      -- p1 wins
      v_result_json := update_trophies_after_match(v_p1.user_id, 'win',  v_match.arena_level, v_p2_elo);
      UPDATE ranked_match_players SET result = 'win',  trophy_change = (v_result_json->>'trophy_change')::int, token_change =  v_wager, submitted_at = COALESCE(submitted_at, now()) WHERE id = v_p1.id;

      v_result_json := update_trophies_after_match(v_p2.user_id, 'loss', v_match.arena_level, v_p1_elo);
      UPDATE ranked_match_players SET result = 'loss', trophy_change = (v_result_json->>'trophy_change')::int, token_change = -v_wager, submitted_at = COALESCE(submitted_at, now()) WHERE id = v_p2.id;

      UPDATE profiles SET tokens = tokens + v_wager              WHERE id = v_p1.user_id;
      UPDATE profiles SET tokens = GREATEST(0, tokens - v_wager) WHERE id = v_p2.user_id;

      INSERT INTO token_transactions (user_id, amount, type, reference_id) VALUES
        (v_p1.user_id,  v_wager, 'ranked_win',  p_match_id),
        (v_p2.user_id, -v_wager, 'ranked_loss', p_match_id);

    ELSIF v_p2_score > v_p1_score THEN
      -- p2 wins
      v_result_json := update_trophies_after_match(v_p2.user_id, 'win',  v_match.arena_level, v_p1_elo);
      UPDATE ranked_match_players SET result = 'win',  trophy_change = (v_result_json->>'trophy_change')::int, token_change =  v_wager, submitted_at = COALESCE(submitted_at, now()) WHERE id = v_p2.id;

      v_result_json := update_trophies_after_match(v_p1.user_id, 'loss', v_match.arena_level, v_p2_elo);
      UPDATE ranked_match_players SET result = 'loss', trophy_change = (v_result_json->>'trophy_change')::int, token_change = -v_wager, submitted_at = COALESCE(submitted_at, now()) WHERE id = v_p1.id;

      UPDATE profiles SET tokens = tokens + v_wager              WHERE id = v_p2.user_id;
      UPDATE profiles SET tokens = GREATEST(0, tokens - v_wager) WHERE id = v_p1.user_id;

      INSERT INTO token_transactions (user_id, amount, type, reference_id) VALUES
        (v_p2.user_id,  v_wager, 'ranked_win',  p_match_id),
        (v_p1.user_id, -v_wager, 'ranked_loss', p_match_id);

    ELSIF v_p1.score IS NULL AND v_p2.score IS NULL THEN
      -- Both disconnected: both lose, wagers burned (no winner)
      v_result_json := update_trophies_after_match(v_p1.user_id, 'loss', v_match.arena_level, v_p2_elo);
      UPDATE ranked_match_players SET result = 'loss', trophy_change = (v_result_json->>'trophy_change')::int, token_change = -v_wager, submitted_at = COALESCE(submitted_at, now()) WHERE id = v_p1.id;

      v_result_json := update_trophies_after_match(v_p2.user_id, 'loss', v_match.arena_level, v_p1_elo);
      UPDATE ranked_match_players SET result = 'loss', trophy_change = (v_result_json->>'trophy_change')::int, token_change = -v_wager, submitted_at = COALESCE(submitted_at, now()) WHERE id = v_p2.id;

      UPDATE profiles SET tokens = GREATEST(0, tokens - v_wager) WHERE id = v_p1.user_id;
      UPDATE profiles SET tokens = GREATEST(0, tokens - v_wager) WHERE id = v_p2.user_id;

      INSERT INTO token_transactions (user_id, amount, type, reference_id) VALUES
        (v_p1.user_id, -v_wager, 'ranked_loss', p_match_id),
        (v_p2.user_id, -v_wager, 'ranked_loss', p_match_id);

    ELSE
      -- True tie: refund both
      UPDATE ranked_match_players SET result = 'refund', trophy_change = 0, token_change = 0 WHERE match_id = p_match_id;
    END IF;

  -- ─────────────────────────────────────────────────────────────
  --  2v2
  -- ─────────────────────────────────────────────────────────────
  ELSIF v_match.format = '2v2' THEN

    SELECT COALESCE(SUM(COALESCE(score, 0)), 0), COUNT(*)
    INTO v_team1_score, v_team1_count
    FROM ranked_match_players WHERE match_id = p_match_id AND team = 1;

    SELECT COALESCE(SUM(COALESCE(score, 0)), 0), COUNT(*)
    INTO v_team2_score, v_team2_count
    FROM ranked_match_players WHERE match_id = p_match_id AND team = 2;

    v_team1_avg := CASE WHEN v_team1_count > 0 THEN v_team1_score::real / v_team1_count ELSE 0 END;
    v_team2_avg := CASE WHEN v_team2_count > 0 THEN v_team2_score::real / v_team2_count ELSE 0 END;

    FOR v_player IN SELECT * FROM ranked_match_players WHERE match_id = p_match_id LOOP

      IF v_team1_avg > v_team2_avg THEN
        v_player_result := CASE WHEN v_player.team = 1 THEN 'win'::match_result_enum ELSE 'loss'::match_result_enum END;
      ELSIF v_team2_avg > v_team1_avg THEN
        v_player_result := CASE WHEN v_player.team = 2 THEN 'win'::match_result_enum ELSE 'loss'::match_result_enum END;
      ELSE
        v_player_result := 'refund'::match_result_enum;
      END IF;

      v_token_change := CASE v_player_result
        WHEN 'win'    THEN  v_wager
        WHEN 'loss'   THEN -v_wager
        ELSE 0
      END;

      v_result_json := update_trophies_after_match(v_player.user_id, v_player_result, v_match.arena_level);

      UPDATE ranked_match_players SET
        result        = v_player_result,
        trophy_change = (v_result_json->>'trophy_change')::int,
        token_change  = v_token_change,
        submitted_at  = COALESCE(submitted_at, now())
      WHERE id = v_player.id;

      UPDATE profiles SET tokens = GREATEST(0, tokens + v_token_change) WHERE id = v_player.user_id;

      IF v_token_change != 0 THEN
        INSERT INTO token_transactions (user_id, amount, type, reference_id) VALUES (
          v_player.user_id,
          v_token_change,
          CASE WHEN v_token_change > 0 THEN 'ranked_win' ELSE 'ranked_loss' END,
          p_match_id
        );
      END IF;

    END LOOP;

  -- ─────────────────────────────────────────────────────────────
  --  FFA5
  -- ─────────────────────────────────────────────────────────────
  ELSIF v_match.format = 'ffa5' THEN

    v_rank := 0;

    -- Sort by score DESC; NULL scores (disconnected) sort last; ties broken by earlier submission
    FOR v_player IN
      SELECT * FROM ranked_match_players
      WHERE match_id = p_match_id
      ORDER BY COALESCE(score, -1) DESC, submitted_at ASC NULLS LAST
    LOOP
      v_rank := v_rank + 1;

      CASE v_rank
        WHEN 1 THEN
          v_player_result := 'win'::match_result_enum;
          v_token_change  := v_wager * 4;   -- takes full 5-player pot, net +4 wagers
        WHEN 2 THEN
          v_player_result := 'refund'::match_result_enum;
          v_token_change  := 0;
        ELSE
          v_player_result := 'loss'::match_result_enum;
          v_token_change  := -v_wager;
      END CASE;

      v_result_json := update_trophies_after_match(v_player.user_id, v_player_result, v_match.arena_level);

      UPDATE ranked_match_players SET
        result        = v_player_result,
        trophy_change = (v_result_json->>'trophy_change')::int,
        token_change  = v_token_change,
        submitted_at  = COALESCE(submitted_at, now())
      WHERE id = v_player.id;

      UPDATE profiles SET tokens = GREATEST(0, tokens + v_token_change) WHERE id = v_player.user_id;

      IF v_token_change != 0 THEN
        INSERT INTO token_transactions (user_id, amount, type, reference_id) VALUES (
          v_player.user_id,
          v_token_change,
          CASE WHEN v_token_change > 0 THEN 'ranked_win' ELSE 'ranked_loss' END,
          p_match_id
        );
      END IF;

    END LOOP;

  END IF;

  -- Mark the match as complete
  UPDATE ranked_matches
  SET status = 'completed', completed_at = now()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'match_id', p_match_id);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'match_id', p_match_id);
END;
$$;


-- ── 14. INDEXES ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_arena_progress_arena    ON arena_progress (current_arena, trophies DESC);
CREATE INDEX IF NOT EXISTS idx_arena_progress_elo      ON arena_progress (elo DESC) WHERE current_arena = 9;
CREATE INDEX IF NOT EXISTS idx_ranked_matches_status   ON ranked_matches (status, arena_level, format);
CREATE INDEX IF NOT EXISTS idx_rmp_match               ON ranked_match_players (match_id);
CREATE INDEX IF NOT EXISTS idx_rmp_user                ON ranked_match_players (user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_recipient   ON friendships (recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_private_matches_code    ON private_matches (invite_code);
