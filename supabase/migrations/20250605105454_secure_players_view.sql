-- Create private schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS private;

-- Drop the existing public players view
DROP VIEW IF EXISTS public.players;

-- Create a secure version of the players view in the private schema
CREATE MATERIALIZED VIEW private.players AS
SELECT 
    tm.id,
    tm.user_id,
    COALESCE(auth.users.raw_user_meta_data->>'full_name', auth.users.email) as name,
    tm.position,
    tm.jersey_number
FROM team_members tm
JOIN auth.users ON tm.user_id = auth.users.id
JOIN team_member_roles tmr ON tm.id = tmr.team_member_id
WHERE tmr.role = 'player';

-- Create a secure function to access the players view
CREATE OR REPLACE FUNCTION public.get_players()
RETURNS TABLE (
    id uuid,
    user_id uuid,
    name text,
    "position" text,
    jersey_number text
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
    SELECT * FROM private.players
    WHERE EXISTS (
        SELECT 1 FROM team_members viewer
        JOIN team_member_roles viewer_role ON viewer.id = viewer_role.team_member_id
        WHERE viewer.user_id = auth.uid()
        AND viewer_role.role IN ('manager', 'coach', 'player')
        AND viewer.team_id = (
            SELECT team_id 
            FROM team_members 
            WHERE id = private.players.id
        )
    );
$$;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA private TO service_role;
GRANT SELECT ON private.players TO service_role;
GRANT EXECUTE ON FUNCTION public.get_players() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_players() TO service_role;
