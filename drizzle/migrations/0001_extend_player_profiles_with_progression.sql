ALTER TABLE public.player_profiles
  ADD COLUMN player_name text NOT NULL DEFAULT 'Divine Seeker',
  ADD COLUMN level integer NOT NULL DEFAULT 1,
  ADD COLUMN xp integer NOT NULL DEFAULT 0,
  ADD COLUMN coins integer NOT NULL DEFAULT 0,
  ADD COLUMN current_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN best_score integer NOT NULL DEFAULT 0,
  ADD COLUMN completed_games integer NOT NULL DEFAULT 0,
  ADD COLUMN achievements jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.player_profiles
  ADD CONSTRAINT player_profiles_player_name_length CHECK (char_length(player_name) BETWEEN 1 AND 40),
  ADD CONSTRAINT player_profiles_level_nonnegative CHECK (level >= 1),
  ADD CONSTRAINT player_profiles_xp_nonnegative CHECK (xp >= 0),
  ADD CONSTRAINT player_profiles_coins_nonnegative CHECK (coins >= 0),
  ADD CONSTRAINT player_profiles_streak_nonnegative CHECK (current_streak >= 0),
  ADD CONSTRAINT player_profiles_best_score_nonnegative CHECK (best_score >= 0),
  ADD CONSTRAINT player_profiles_completed_games_nonnegative CHECK (completed_games >= 0),
  ADD CONSTRAINT player_profiles_achievements_array CHECK (jsonb_typeof(achievements) = 'array');