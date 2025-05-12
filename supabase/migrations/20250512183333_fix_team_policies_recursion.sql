-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can do everything with teams" ON teams;
DROP POLICY IF EXISTS "Coaches can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Admins can do everything with team members" ON team_members;
DROP POLICY IF EXISTS "Coaches can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Team members can view their team members" ON team_members;

-- Create a function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Create a function to check if user is coach for a team
CREATE OR REPLACE FUNCTION is_team_coach(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = p_team_id
    AND 'coach' = ANY(tm.roles)
    AND tm.is_active = true
  );
END;
$$;

-- Create a function to check if user is member of a team
CREATE OR REPLACE FUNCTION is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.user_id = auth.uid()
    AND tm.team_id = p_team_id
    AND tm.is_active = true
  );
END;
$$;

-- Create new policies using the functions
CREATE POLICY "Admins can do everything with teams"
  ON teams FOR ALL
  USING (is_admin());

CREATE POLICY "Coaches can view their teams"
  ON teams FOR SELECT
  USING (is_team_coach(id));

CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (is_team_member(id));

CREATE POLICY "Admins can do everything with team members"
  ON team_members FOR ALL
  USING (is_admin());

CREATE POLICY "Coaches can manage their team members"
  ON team_members FOR ALL
  USING (is_team_coach(team_id));

CREATE POLICY "Team members can view their team members"
  ON team_members FOR SELECT
  USING (is_team_member(team_id));
