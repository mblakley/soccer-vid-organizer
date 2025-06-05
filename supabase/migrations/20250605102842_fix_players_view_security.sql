-- Drop the existing players view
DROP VIEW IF EXISTS public.players;

-- Create a new secure players view
CREATE VIEW public.players AS
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

-- Grant appropriate permissions
GRANT SELECT ON public.players TO service_role;
