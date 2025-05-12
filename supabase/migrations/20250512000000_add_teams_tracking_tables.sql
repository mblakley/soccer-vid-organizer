-- Teams table to track team information
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_affiliation TEXT,
  season TEXT,
  age_group TEXT,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Team members table to track players, coaches, etc.
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  name TEXT NOT NULL,
  roles TEXT[] NOT NULL DEFAULT '{}'::TEXT[], -- Array of roles: 'player', 'coach', 'manager', 'parent'
  jersey_number TEXT,
  position TEXT,
  joined_date DATE NOT NULL,
  left_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(team_id, user_id) -- A user can be on a team only once, but with multiple roles
);

-- Games table to track matches
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  location TEXT,
  game_date DATE NOT NULL,
  game_time TIME,
  score_home INTEGER,
  score_away INTEGER,
  status TEXT CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Game attendance to track which players attended each game
CREATE TABLE IF NOT EXISTS game_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('Available', 'Unavailable', 'Injured', 'Partial', 'Unknown')) DEFAULT 'Unknown',
  minutes_played INTEGER,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  -- A member can only attend once per game
  UNIQUE(game_id, team_member_id)
);

-- Game videos to associate videos with games
CREATE TABLE IF NOT EXISTS game_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  video_type TEXT CHECK (video_type IN ('full_game', 'highlights', 'analysis', 'other')),
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(game_id, video_id)
);

-- Counters table to store counter data (for analyze-video page)
CREATE TABLE IF NOT EXISTS counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('standard', 'resettable', 'player-based')),
  count INTEGER DEFAULT 0,
  timestamps JSONB DEFAULT '[]'::JSONB,
  player_counts JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Timers table to store timer data (for analyze-video page)
CREATE TABLE IF NOT EXISTS timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('standard', 'player-based')),
  duration INTEGER DEFAULT 0,
  sessions JSONB DEFAULT '[]'::JSONB,
  player_times JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Counter events table to store individual counter events
CREATE TABLE IF NOT EXISTS counter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_id UUID REFERENCES counters(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id),
  timestamp DECIMAL NOT NULL, -- Video timestamp in seconds
  value INTEGER DEFAULT 1,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Timer events table to store individual timer events
CREATE TABLE IF NOT EXISTS timer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id UUID REFERENCES timers(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id),
  start_time DECIMAL NOT NULL, -- Video timestamp in seconds for start
  end_time DECIMAL, -- Video timestamp in seconds for end (null if ongoing)
  duration DECIMAL, -- Duration in seconds (null if ongoing)
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_events ENABLE ROW LEVEL SECURITY;

-- Policy: Coaches and admins can manage all team data
CREATE POLICY "Coaches and admins can manage teams" ON teams
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage team_members" ON team_members
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage games" ON games
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage game_attendance" ON game_attendance
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage game_videos" ON game_videos
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage counters" ON counters
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage timers" ON timers
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage counter_events" ON counter_events
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

CREATE POLICY "Coaches and admins can manage timer_events" ON timer_events
  FOR ALL
  USING (auth.role() IN ('coach', 'admin'));

-- Policy: Players and parents can view but not edit
CREATE POLICY "Players and parents can view teams" ON teams
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view team_members" ON team_members
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view games" ON games
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view game_attendance" ON game_attendance
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view game_videos" ON game_videos
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view counters" ON counters
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view timers" ON timers
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view counter_events" ON counter_events
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

CREATE POLICY "Players and parents can view timer_events" ON timer_events
  FOR SELECT
  USING (auth.role() IN ('player', 'parent'));

-- Create functions to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at
BEFORE UPDATE ON games
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_attendance_updated_at
BEFORE UPDATE ON game_attendance
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counters_updated_at
BEFORE UPDATE ON counters
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timers_updated_at
BEFORE UPDATE ON timers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counter_events_updated_at
BEFORE UPDATE ON counter_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_timer_events_updated_at
BEFORE UPDATE ON timer_events
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create a function to validate team member roles
CREATE OR REPLACE FUNCTION validate_team_member_roles()
RETURNS TRIGGER AS $$
DECLARE
  valid_roles TEXT[] := ARRAY['player', 'coach', 'manager', 'parent'];
  role TEXT;
BEGIN
  -- Check that all roles are valid
  FOREACH role IN ARRAY NEW.roles
  LOOP
    IF NOT (role = ANY(valid_roles)) THEN
      RAISE EXCEPTION 'Invalid role: %. Allowed roles are: player, coach, manager, parent', role;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate team member roles
CREATE TRIGGER validate_team_member_roles_trigger
BEFORE INSERT OR UPDATE ON team_members
FOR EACH ROW
EXECUTE FUNCTION validate_team_member_roles();

-- Team roles view for easier querying
CREATE VIEW team_member_roles AS
SELECT 
  tm.id,
  tm.team_id,
  tm.user_id,
  tm.name,
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