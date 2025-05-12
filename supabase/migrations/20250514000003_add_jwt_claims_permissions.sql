-- Grant necessary permissions for jwt_custom_claims function
GRANT SELECT ON public.team_members TO supabase_auth_admin;
GRANT SELECT ON public.teams TO supabase_auth_admin;
GRANT SELECT ON public.user_roles TO supabase_auth_admin;

-- Ensure the function has the right security context
ALTER FUNCTION public.jwt_custom_claims(jsonb) SECURITY DEFINER;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.jwt_custom_claims(jsonb) TO supabase_auth_admin; 