-- Remove spoofable header-based policies; all access goes through trusted server functions.
DROP POLICY IF EXISTS "Players can create their profile" ON public.player_profiles;
DROP POLICY IF EXISTS "Players can read their profile" ON public.player_profiles;
DROP POLICY IF EXISTS "Players can update their profile" ON public.player_profiles;

ALTER TABLE public.player_profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.player_profiles FROM anon;
REVOKE ALL ON public.player_profiles FROM authenticated;
GRANT ALL ON public.player_profiles TO service_role;