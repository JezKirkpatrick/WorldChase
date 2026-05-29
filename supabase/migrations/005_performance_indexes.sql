-- Performance indexes for the most-queried tables
-- player_progress is hit on every game action (submit-answer, reveal-clue, skip, start)
CREATE INDEX IF NOT EXISTS idx_player_progress_user_challenge
  ON player_progress (user_id, challenge_id);

CREATE INDEX IF NOT EXISTS idx_player_progress_user_event
  ON player_progress (user_id, event_id);

CREATE INDEX IF NOT EXISTS idx_player_progress_challenge
  ON player_progress (challenge_id);

-- leaderboard sort/filter (event leaderboard page)
CREATE INDEX IF NOT EXISTS idx_leaderboard_event_score
  ON leaderboard (event_id, total_score DESC);

-- challenges by event (used in start-challenge, create-duel, queue)
CREATE INDEX IF NOT EXISTS idx_challenges_event
  ON challenges (event_id);

-- vs_matches challenger/opponent lookups (VS lobby, notifier, VsDot)
CREATE INDEX IF NOT EXISTS idx_vs_matches_challenger
  ON vs_matches (challenger_id, status);

CREATE INDEX IF NOT EXISTS idx_vs_matches_opponent
  ON vs_matches (opponent_id, status);

-- guesses per user per time window (rate limiting + history)
CREATE INDEX IF NOT EXISTS idx_guesses_user_created
  ON guesses (user_id, created_at DESC);

-- token_transactions per user (onboarding idempotency, history)
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_type
  ON token_transactions (user_id, type);

-- direct_messages recipient (unread badge query)
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_created
  ON direct_messages (recipient_id, created_at DESC);
