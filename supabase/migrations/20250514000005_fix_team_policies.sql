-- Drop existing policies that have ambiguous is_admin references
DROP POLICY IF EXISTS "Admins can do everything with teams" ON teams;
DROP POLICY IF EXISTS "Admins can do everything with team members" ON team_members;
DROP POLICY IF EXISTS "Admins can do everything with games" ON games;
DROP POLICY IF EXISTS "Admins can do everything with game_attendance" ON game_attendance;
DROP POLICY IF EXISTS "Admins can do everything with game_videos" ON game_videos;
DROP POLICY IF EXISTS "Admins can do everything with counters" ON counters;
DROP POLICY IF EXISTS "Admins can do everything with timers" ON timers;
DROP POLICY IF EXISTS "Admins can do everything with counter_events" ON counter_events;
DROP POLICY IF EXISTS "Admins can do everything with timer_events" ON timer_events;

-- Drop existing policies that have ambiguous team_id references
DROP POLICY IF EXISTS "Coaches can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Coaches can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Team members can view their team members" ON team_members;
DROP POLICY IF EXISTS "Coaches can manage their team's games" ON games;
DROP POLICY IF EXISTS "Team members can view their team's games" ON games;

-- Create new policies with explicit is_admin checks
CREATE POLICY "Admins can do everything with teams"
  ON teams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with games"
  ON games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with game_attendance"
  ON game_attendance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with game_videos"
  ON game_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with counters"
  ON counters FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with timers"
  ON timers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with counter_events"
  ON counter_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

CREATE POLICY "Admins can do everything with timer_events"
  ON timer_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.is_admin = true
    )
  );

-- Create new policies with explicit table references
CREATE POLICY "Coaches can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = teams.id
      AND 'coach' = ANY(tm.roles)
      AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = teams.id
      AND tm.is_active = true
    )
  );

CREATE POLICY "Coaches can manage their team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = team_members.team_id
      AND 'coach' = ANY(tm.roles)
      AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND tm.team_id = team_members.team_id
      AND tm.is_active = true
    )
  );

CREATE POLICY "Coaches can manage their team's games"
  ON games FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND (
        tm.team_id = games.home_team_id OR
        tm.team_id = games.away_team_id
      )
      AND 'coach' = ANY(tm.roles)
      AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's games"
  ON games FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.user_id = auth.uid()
      AND (
        tm.team_id = games.home_team_id OR
        tm.team_id = games.away_team_id
      )
      AND tm.is_active = true
    )
  ); 