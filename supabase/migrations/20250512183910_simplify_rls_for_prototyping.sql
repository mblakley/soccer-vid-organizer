-- Drop all existing policies
DROP POLICY IF EXISTS "Admins can do everything with teams" ON teams;
DROP POLICY IF EXISTS "Coaches can view their teams" ON teams;
DROP POLICY IF EXISTS "Team members can view their teams" ON teams;
DROP POLICY IF EXISTS "Admins can do everything with team members" ON team_members;
DROP POLICY IF EXISTS "Coaches can manage their team members" ON team_members;
DROP POLICY IF EXISTS "Team members can view their team members" ON team_members;
DROP POLICY IF EXISTS "Admins can do everything with games" ON games;
DROP POLICY IF EXISTS "Coaches can manage their team's games" ON games;
DROP POLICY IF EXISTS "Team members can view their team's games" ON games;
DROP POLICY IF EXISTS "Admins can do everything with game_attendance" ON game_attendance;
DROP POLICY IF EXISTS "Admins can do everything with game_videos" ON game_videos;
DROP POLICY IF EXISTS "Admins can do everything with counters" ON counters;
DROP POLICY IF EXISTS "Admins can do everything with timers" ON timers;
DROP POLICY IF EXISTS "Admins can do everything with counter_events" ON counter_events;
DROP POLICY IF EXISTS "Admins can do everything with timer_events" ON timer_events;

-- Drop the helper functions
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_team_coach(uuid);
DROP FUNCTION IF EXISTS is_team_member(uuid);

-- Create simple policies for all tables
CREATE POLICY "Allow all operations for authenticated users"
  ON teams FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON team_members FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON games FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON game_attendance FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON game_videos FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON counters FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON timers FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON counter_events FOR ALL
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations for authenticated users"
  ON timer_events FOR ALL
  USING (auth.role() = 'authenticated');
