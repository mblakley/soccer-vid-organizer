-- Drop existing JWT claims function
DROP FUNCTION IF EXISTS public.jwt_custom_claims;

-- Drop existing policies that depend on pending_review
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can request new roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can't update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can't delete roles" ON public.user_roles;

-- Update user_roles table
ALTER TABLE public.user_roles 
  DROP COLUMN role,
  ADD COLUMN is_admin boolean NOT NULL DEFAULT false;

-- Update the JWT custom claims function
CREATE OR REPLACE FUNCTION public.jwt_custom_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  claims jsonb;
  current_user_id uuid;
  user_is_admin boolean;
  team_roles jsonb;
BEGIN
  -- Log the incoming event
  RAISE NOTICE 'Incoming event: %', event;
  
  current_user_id := (event->>'user_id')::uuid;
  RAISE NOTICE 'Current user ID: %', current_user_id;
  
  -- Initialize claims
  claims := event->'claims';
  RAISE NOTICE 'Initial claims: %', claims;
  
  -- Check if user is an admin
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    WHERE ur.user_id = current_user_id 
    AND ur.is_admin = true
  ) INTO user_is_admin;

  -- Debug log
  RAISE NOTICE 'User ID: %, Is Admin: %', current_user_id, user_is_admin;

  -- Set the is_admin claim
  claims := jsonb_set(claims, '{is_admin}', to_jsonb(user_is_admin));
  RAISE NOTICE 'Claims after setting is_admin: %', claims;

  -- Fetch team-specific roles for the user
  WITH team_user_roles AS (
    SELECT 
      tm.team_id,
      t.name AS team_name,
      jsonb_agg(DISTINCT r.role) AS roles
    FROM team_members tm
    CROSS JOIN LATERAL unnest(tm.roles) as r(role)
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = current_user_id AND tm.is_active = true
    GROUP BY tm.team_id, t.name
  )
  SELECT jsonb_object_agg(
    team_id, 
    jsonb_build_object(
      'name', team_name,
      'roles', roles
    )
  )
  INTO team_roles
  FROM team_user_roles;

  -- Debug log
  RAISE NOTICE 'Team Roles: %', team_roles;

  -- Set the team roles object or empty object if none
  IF team_roles IS NOT NULL THEN
    claims := jsonb_set(claims, '{team_roles}', team_roles);
  ELSE
    claims := jsonb_set(claims, '{team_roles}', '{}'::jsonb);
  END IF;

  -- Debug log final claims
  RAISE NOTICE 'Final Claims: %', claims;

  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);
  RAISE NOTICE 'Final event: %', event;

  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE
  ON FUNCTION public.jwt_custom_claims
  TO supabase_auth_admin;

-- Revoke execute from other roles
REVOKE EXECUTE
  ON FUNCTION public.jwt_custom_claims
  FROM authenticated, anon, public;

-- Update RLS policies for user_roles
CREATE POLICY "Users can view their own admin status"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage admin status"
  ON public.user_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND is_admin = true
    )
  );

-- Update the public.user_has_global_role function
CREATE OR REPLACE FUNCTION public.user_has_global_role(role text)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Only 'admin' is a global role now
  IF role = 'admin' THEN
    SELECT is_admin INTO is_admin FROM user_roles WHERE user_id = auth.uid();
    RETURN COALESCE(is_admin, false);
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_global_role(text) TO authenticated;
REVOKE ALL ON FUNCTION public.user_has_global_role(text) FROM anon; 