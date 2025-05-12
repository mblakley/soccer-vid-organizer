-- Update the JWT custom claims function to handle team-specific roles
CREATE OR REPLACE FUNCTION public.jwt_custom_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  claims jsonb;
  user_id uuid;
  global_roles jsonb;
  team_roles jsonb;
BEGIN
  user_id := (event->>'user_id')::uuid;
  
  -- Initialize claims
  claims := event->'claims';
  
  -- Fetch all global roles for the user as a JSON array
  SELECT jsonb_agg(role) 
  INTO global_roles
  FROM public.user_roles 
  WHERE user_id = user_id;

  -- Set the global roles array or null if none
  IF global_roles IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_roles}', global_roles);
  ELSE
    claims := jsonb_set(claims, '{user_roles}', 'null'::jsonb);
  END IF;

  -- Fetch team-specific roles for the user
  WITH team_user_roles AS (
    SELECT 
      tm.team_id,
      t.name AS team_name,
      jsonb_agg(DISTINCT r.role) AS roles
    FROM team_members tm
    CROSS JOIN LATERAL unnest(tm.roles) as r(role)
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.user_id = user_id AND tm.is_active = true
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

  -- Set the team roles object or empty object if none
  IF team_roles IS NOT NULL THEN
    claims := jsonb_set(claims, '{team_roles}', team_roles);
  ELSE
    claims := jsonb_set(claims, '{team_roles}', '{}'::jsonb);
  END IF;

  -- Update the 'claims' object in the original event
  event := jsonb_set(event, '{claims}', claims);

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