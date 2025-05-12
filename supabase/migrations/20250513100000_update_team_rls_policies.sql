-- Drop existing policies that use global roles for team-related tables
DROP POLICY IF EXISTS "Coaches and admins can manage teams" ON teams;
DROP POLICY IF EXISTS "Coaches and admins can manage team_members" ON team_members;
DROP POLICY IF EXISTS "Coaches and admins can manage games" ON games;
DROP POLICY IF EXISTS "Coaches and admins can manage game_attendance" ON game_attendance;
DROP POLICY IF EXISTS "Coaches and admins can manage game_videos" ON game_videos;
DROP POLICY IF EXISTS "Coaches and admins can manage counters" ON counters;
DROP POLICY IF EXISTS "Coaches and admins can manage timers" ON timers;
DROP POLICY IF EXISTS "Coaches and admins can manage counter_events" ON counter_events;
DROP POLICY IF EXISTS "Coaches and admins can manage timer_events" ON timer_events;

DROP POLICY IF EXISTS "Players and parents can view teams" ON teams;
DROP POLICY IF EXISTS "Players and parents can view team_members" ON team_members;
DROP POLICY IF EXISTS "Players and parents can view games" ON games;
DROP POLICY IF EXISTS "Players and parents can view game_attendance" ON game_attendance;
DROP POLICY IF EXISTS "Players and parents can view game_videos" ON game_videos;
DROP POLICY IF EXISTS "Players and parents can view counters" ON counters;
DROP POLICY IF EXISTS "Players and parents can view timers" ON timers;
DROP POLICY IF EXISTS "Players and parents can view counter_events" ON counter_events;
DROP POLICY IF EXISTS "Players and parents can view timer_events" ON timer_events;

-- Create helper functions for role checks
CREATE OR REPLACE FUNCTION public.user_has_team_role(team_id uuid, role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE user_id = auth.uid()
      AND team_id = team_id
      AND role = ANY(roles)
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_is_team_member(team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE user_id = auth.uid()
      AND team_id = team_id
      AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_has_global_role(role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role = role
  );
END;
$$;

-- Update RLS policies to use the new functions
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything with teams"
  ON teams FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can view their teams"
  ON teams FOR SELECT
  USING (public.user_has_team_role(id, 'coach'));

CREATE POLICY "Team members can view their teams"
  ON teams FOR SELECT
  USING (public.user_is_team_member(id));

CREATE POLICY "Admins can do everything with team members"
  ON team_members FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team members"
  ON team_members FOR ALL
  USING (public.user_has_team_role(team_id, 'coach'));

CREATE POLICY "Team members can view their team members"
  ON team_members FOR SELECT
  USING (public.user_is_team_member(team_id));

CREATE POLICY "Admins can do everything with games"
  ON games FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team's games"
  ON games FOR ALL
  USING (
    public.user_has_team_role(home_team_id, 'coach') OR
    public.user_has_team_role(away_team_id, 'coach')
  );

CREATE POLICY "Team members can view their team's games"
  ON games FOR SELECT
  USING (
    public.user_is_team_member(home_team_id) OR
    public.user_is_team_member(away_team_id)
  );

CREATE POLICY "Admins can do everything with game videos"
  ON game_videos FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team's game videos"
  ON game_videos FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN games g ON g.id = game_videos.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND 'coach' = ANY(tm.roles)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's game videos"
  ON game_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN games g ON g.id = game_videos.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Admins can do everything with counters"
  ON counters FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team's counters"
  ON counters FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN game_videos gv ON gv.video_id = counters.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND 'coach' = ANY(tm.roles)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's counters"
  ON counters FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN game_videos gv ON gv.video_id = counters.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Admins can do everything with timers"
  ON timers FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team's timers"
  ON timers FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN game_videos gv ON gv.video_id = timers.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND 'coach' = ANY(tm.roles)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's timers"
  ON timers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN game_videos gv ON gv.video_id = timers.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Admins can do everything with counter events"
  ON counter_events FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team's counter events"
  ON counter_events FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN counters c ON c.id = counter_events.counter_id
      JOIN game_videos gv ON gv.video_id = c.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND 'coach' = ANY(tm.roles)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's counter events"
  ON counter_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN counters c ON c.id = counter_events.counter_id
      JOIN game_videos gv ON gv.video_id = c.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Admins can do everything with timer events"
  ON timer_events FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Coaches can manage their team's timer events"
  ON timer_events FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN timers t ON t.id = timer_events.timer_id
      JOIN game_videos gv ON gv.video_id = t.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND 'coach' = ANY(tm.roles)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's timer events"
  ON timer_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN timers t ON t.id = timer_events.timer_id
      JOIN game_videos gv ON gv.video_id = t.video_id
      JOIN games g ON g.id = gv.game_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id IN (g.home_team_id, g.away_team_id)
        AND tm.is_active = true
    )
  ); 