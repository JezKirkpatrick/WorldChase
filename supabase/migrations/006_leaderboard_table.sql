-- Ensure leaderboard table exists with correct structure
CREATE TABLE IF NOT EXISTS leaderboard (
  user_id              uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_id             uuid NOT NULL REFERENCES monthly_events(id) ON DELETE CASCADE,
  total_score          integer NOT NULL DEFAULT 0,
  challenges_completed integer NOT NULL DEFAULT 0,
  previous_rank        integer,
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);

-- Index for fast leaderboard page queries
CREATE INDEX IF NOT EXISTS idx_leaderboard_event_score
  ON leaderboard (event_id, total_score DESC);

-- RLS
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "leaderboard_read_all"
  ON leaderboard FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "leaderboard_service_write"
  ON leaderboard FOR ALL USING (auth.role() = 'service_role');
