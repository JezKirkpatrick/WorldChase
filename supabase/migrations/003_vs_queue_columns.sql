-- Add match type and friend invite target to vs_matches
ALTER TABLE vs_matches
  ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS invited_friend_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Valid match types: open (anyone can join), friend_invite (targeted), queue (random matchmaking)
ALTER TABLE vs_matches
  DROP CONSTRAINT IF EXISTS vs_matches_match_type_check;
ALTER TABLE vs_matches
  ADD CONSTRAINT vs_matches_match_type_check
    CHECK (match_type IN ('open', 'friend_invite', 'queue'));

-- Index for the queue lookup (find open queue matches by wager)
CREATE INDEX IF NOT EXISTS idx_vs_matches_queue
  ON vs_matches (match_type, wager, status, expires_at)
  WHERE match_type = 'queue' AND status = 'pending';

-- Index for friend invite lookup
CREATE INDEX IF NOT EXISTS idx_vs_matches_invited_friend
  ON vs_matches (invited_friend_id, status)
  WHERE invited_friend_id IS NOT NULL;
