-- Drop the team_member_roles view first since it depends on the name column
DROP VIEW IF EXISTS team_member_roles;

-- Remove name column from team_members table
ALTER TABLE team_members DROP COLUMN name;

-- Recreate the team_member_roles view without the name field
CREATE VIEW team_member_roles AS
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  t.name as team_name,
  r.role,
  tm.jersey_number,
  tm.position,
  tm.joined_date,
  tm.left_date,
  tm.is_active
FROM team_members tm
CROSS JOIN LATERAL unnest(tm.roles) as r(role)
JOIN teams t ON tm.team_id = t.id;
