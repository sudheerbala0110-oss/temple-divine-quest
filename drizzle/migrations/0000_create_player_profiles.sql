CREATE TABLE public.player_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_key text NOT NULL UNIQUE,
  selected_college_name text NOT NULL,
  selected_college_location text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.player_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_profiles TO authenticated;
GRANT ALL ON public.player_profiles TO service_role;
ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Players can read their profile" ON public.player_profiles FOR SELECT TO anon, authenticated USING (player_key = current_setting('request.headers', true)::json->>'x-player-key');
CREATE POLICY "Players can create their profile" ON public.player_profiles FOR INSERT TO anon, authenticated WITH CHECK (player_key = current_setting('request.headers', true)::json->>'x-player-key');
CREATE POLICY "Players can update their profile" ON public.player_profiles FOR UPDATE TO anon, authenticated USING (player_key = current_setting('request.headers', true)::json->>'x-player-key') WITH CHECK (player_key = current_setting('request.headers', true)::json->>'x-player-key');