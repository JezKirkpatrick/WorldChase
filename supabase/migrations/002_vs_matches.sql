DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vs_matches') THEN

    CREATE TABLE vs_matches (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      challenge_id          UUID        NOT NULL,
      challenger_id         UUID        NOT NULL,
      opponent_id           UUID,
      wager                 INTEGER     NOT NULL DEFAULT 10,
      status                TEXT        NOT NULL DEFAULT 'pending',
      winner_id             UUID,
      challenger_solved_at  TIMESTAMPTZ,
      opponent_solved_at    TIMESTAMPTZ,
      started_at            TIMESTAMPTZ,
      expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    ALTER TABLE vs_matches ENABLE ROW LEVEL SECURITY;

    -- Any authenticated user can view pending matches (for the lobby)
    -- or their own matches
    CREATE POLICY "vs_select" ON vs_matches FOR SELECT TO authenticated
      USING (status = 'pending' OR challenger_id = auth.uid() OR opponent_id = auth.uid());

    -- Users can only create matches as themselves
    CREATE POLICY "vs_insert" ON vs_matches FOR INSERT TO authenticated
      WITH CHECK (challenger_id = auth.uid());

    -- Enable realtime so the battle UI gets live updates
    ALTER PUBLICATION supabase_realtime ADD TABLE vs_matches;

  END IF;
END $$;

-- Extend token_transactions type constraint to include VS types (safe no-op if constraint is different)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'token_transactions_type_check'
      AND conrelid = 'token_transactions'::regclass
  ) THEN
    ALTER TABLE token_transactions DROP CONSTRAINT token_transactions_type_check;
    ALTER TABLE token_transactions ADD CONSTRAINT token_transactions_type_check
      CHECK (type IN (
        'purchase','earned_round','earned_login','earned_hidden',
        'earned_referral','spent_clue','spent_skip','admin_grant',
        'vs_wager','vs_win','vs_refund'
      ));
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
