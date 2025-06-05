DROP FUNCTION IF EXISTS public.debug_jwt_claims(text);

-- Fix search paths for functions to prevent security vulnerabilities
ALTER FUNCTION public.get_team_member_roles() SET search_path = public;
ALTER FUNCTION public.track_user_id_change() SET search_path = public;
ALTER FUNCTION public.handle_user_login() SET search_path = public;
ALTER FUNCTION public.handle_new_user_creation() SET search_path = public;
ALTER FUNCTION public.ensure_league_division() SET search_path = public;
ALTER FUNCTION public.ensure_tournament_division() SET search_path = public;

-- Note: The auth_otp_long_expiry and auth_leaked_password_protection warnings
-- are related to Supabase Auth settings and should be configured through the
-- Supabase dashboard or CLI configuration, not through SQL migrations.
