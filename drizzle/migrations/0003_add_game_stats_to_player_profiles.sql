ALTER TABLE public.player_profiles
  ADD COLUMN IF NOT EXISTS game_stats jsonb NOT NULL DEFAULT '{}'::jsonb;