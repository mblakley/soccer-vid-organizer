-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
        CREATE TYPE team_member_role AS ENUM ('player', 'coach', 'manager', 'parent', 'analyst');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_status') THEN
        CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status') THEN
        CREATE TYPE attendance_status AS ENUM ('Available', 'Unavailable', 'Injured', 'Partial', 'Unknown');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'video_type') THEN
        CREATE TYPE video_type AS ENUM ('full_game', 'highlights', 'analysis', 'other');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'counter_type') THEN
        CREATE TYPE counter_type AS ENUM ('standard', 'resettable', 'player-based');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timer_type') THEN
        CREATE TYPE timer_type AS ENUM ('standard', 'player-based');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gender_type') THEN
        CREATE TYPE gender_type AS ENUM ('male', 'female', 'unknown');
    END IF;
END $$;

CREATE OR REPLACE FUNCTION get_team_member_roles()
RETURNS text[] AS $$
  SELECT enum_range(NULL::team_member_role)::text[];
$$ LANGUAGE sql STABLE;

-- Create tables
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_affiliation TEXT,
  season TEXT,
  age_group TEXT,
  gender TEXT,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  jersey_number TEXT,
  position TEXT,
  joined_date DATE NOT NULL,
  left_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  is_guest_player BOOLEAN DEFAULT FALSE,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_member_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  role team_member_role NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(team_member_id, role)
);

CREATE TABLE IF NOT EXISTS team_member_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  requested_roles TEXT[] NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_member_role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  club_affiliation TEXT,
  season TEXT,
  age_group TEXT,
  gender TEXT,
  additional_info JSONB DEFAULT '{}'::JSONB,
  requested_by UUID REFERENCES auth.users,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  location TEXT,
  game_date DATE NOT NULL,
  game_time TIME,
  score_home INTEGER,
  score_away INTEGER,
  status game_status DEFAULT 'scheduled',
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  CONSTRAINT different_teams CHECK (home_team_id != away_team_id)
);

CREATE TABLE IF NOT EXISTS game_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  status attendance_status DEFAULT 'Unknown',
  minutes_played INTEGER,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(game_id, team_member_id)
);

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  source TEXT CHECK (source IN ('youtube', 'veo', 'facebook')),
  status TEXT CHECK (status IN ('processing', 'ready', 'error')) DEFAULT 'processing',
  team_id UUID REFERENCES teams(id),
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  video_type video_type,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(game_id, video_id)
);

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  start_time DECIMAL NOT NULL,
  end_time DECIMAL NOT NULL,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  content TEXT NOT NULL,
  visible_to team_member_role[] NOT NULL DEFAULT '{coach}'::team_member_role[],
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type counter_type NOT NULL,
  count INTEGER DEFAULT 0,
  timestamps JSONB DEFAULT '[]'::JSONB,
  player_counts JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type timer_type NOT NULL,
  duration INTEGER DEFAULT 0,
  sessions JSONB DEFAULT '[]'::JSONB,
  player_times JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS counter_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counter_id UUID REFERENCES counters(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id),
  timestamp DECIMAL NOT NULL,
  value INTEGER DEFAULT 1,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS timer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timer_id UUID REFERENCES timers(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team_members(id),
  start_time DECIMAL NOT NULL,
  end_time DECIMAL,
  duration DECIMAL,
  additional_info JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS film_review_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS film_review_session_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES film_review_sessions(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(session_id, clip_id)
);

CREATE TABLE IF NOT EXISTS film_review_session_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES film_review_sessions(id) ON DELETE CASCADE,
  shared_with UUID REFERENCES auth.users,
  access_level TEXT CHECK (access_level IN ('view', 'edit')) DEFAULT 'view',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(session_id, shared_with)
);

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(user_id)
);

-- Add the foreign key constraint with deferrable option
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_roles_user_id_fkey'
    ) THEN
        ALTER TABLE user_roles
        ADD CONSTRAINT user_roles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id)
        ON DELETE CASCADE
        DEFERRABLE INITIALLY DEFERRED;
    END IF;
END $$;

-- Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    season TEXT NOT NULL,
    age_group TEXT,
    gender TEXT,
    additional_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create team_league_memberships table
CREATE TABLE IF NOT EXISTS team_league_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    division TEXT,
    additional_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(team_id, league_id)
);

-- Create league_games table to track which games belong to which leagues
CREATE TABLE IF NOT EXISTS league_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(game_id, league_id)
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT CHECK (status IN ('upcoming', 'in_progress', 'completed', 'cancelled')) DEFAULT 'upcoming',
    format TEXT,
    additional_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

-- Create tournament_games table
CREATE TABLE IF NOT EXISTS tournament_games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- e.g., 'group_stage', 'round_of_16', 'quarter_finals', 'semi_finals', 'finals'
    group_name TEXT, -- for group stage games
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(game_id, tournament_id)
);

-- Create team_stats table
CREATE TABLE IF NOT EXISTS team_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    goals_scored INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    clean_sheets INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(team_id, league_id)
);

-- Create team_injuries table
CREATE TABLE IF NOT EXISTS team_injuries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    injury_type TEXT NOT NULL,
    expected_return_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'recovered')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create tournament_teams table
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    division TEXT NOT NULL,
    seed INTEGER,
    group_name TEXT, -- for group stage tournaments
    status TEXT CHECK (status IN ('registered', 'confirmed', 'withdrawn')) DEFAULT 'registered',
    additional_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(tournament_id, team_id)
);

-- Create game_rosters table
CREATE TABLE IF NOT EXISTS game_rosters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('active', 'inactive', 'injured', 'suspended')) DEFAULT 'active',
    additional_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(game_id, team_id, team_member_id)
);

-- Create practice_sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    practice_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location TEXT,
    created_by UUID REFERENCES auth.users,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT valid_times CHECK (end_time > start_time)
);

-- Create practice_session_notes table
CREATE TABLE IF NOT EXISTS practice_session_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    practice_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    visible_to team_member_role[] NOT NULL DEFAULT '{coach}'::team_member_role[],
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create practice_attendance table
CREATE TABLE IF NOT EXISTS practice_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    practice_id UUID NOT NULL REFERENCES practice_sessions(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'Unknown',
    minutes_attended INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    UNIQUE(practice_id, team_member_id)
);

-- Create player_parent_relationships table
CREATE TABLE IF NOT EXISTS player_parent_relationships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    parent_team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
    relationship_type TEXT, -- e.g., 'mother', 'father', 'guardian'
    is_primary_contact BOOLEAN DEFAULT false,
    additional_info JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    CONSTRAINT different_members CHECK (player_team_member_id != parent_team_member_id),
    UNIQUE(player_team_member_id, parent_team_member_id)
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_team_league_memberships_team_id ON team_league_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_league_memberships_league_id ON team_league_memberships(league_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team_id ON team_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_league_id ON team_stats(league_id);
CREATE INDEX IF NOT EXISTS idx_team_injuries_team_id ON team_injuries(team_id);
CREATE INDEX IF NOT EXISTS idx_team_injuries_team_member_id ON team_injuries(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_injuries_status ON team_injuries(status);
CREATE INDEX IF NOT EXISTS idx_league_games_league_id ON league_games(league_id);
CREATE INDEX IF NOT EXISTS idx_league_games_game_id ON league_games(game_id);
CREATE INDEX IF NOT EXISTS idx_games_home_team_id ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team_id ON games(away_team_id);
CREATE INDEX IF NOT EXISTS idx_games_game_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_league_id ON tournaments(league_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_games_tournament_id ON tournament_games(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_games_game_id ON tournament_games(game_id);
CREATE INDEX IF NOT EXISTS idx_tournament_games_stage ON tournament_games(stage);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_team_id ON tournament_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_division ON tournament_teams(division);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_group ON tournament_teams(group_name);
CREATE INDEX IF NOT EXISTS idx_game_rosters_game_id ON game_rosters(game_id);
CREATE INDEX IF NOT EXISTS idx_game_rosters_team_id ON game_rosters(team_id);
CREATE INDEX IF NOT EXISTS idx_game_rosters_team_member_id ON game_rosters(team_member_id);
CREATE INDEX IF NOT EXISTS idx_game_rosters_status ON game_rosters(status);
CREATE INDEX IF NOT EXISTS idx_team_members_guest ON team_members(is_guest_player);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_team_id ON practice_sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_date ON practice_sessions(practice_date);
CREATE INDEX IF NOT EXISTS idx_practice_attendance_practice_id ON practice_attendance(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_attendance_team_member_id ON practice_attendance(team_member_id);
CREATE INDEX IF NOT EXISTS idx_practice_attendance_status ON practice_attendance(status);
CREATE INDEX IF NOT EXISTS idx_practice_session_notes_practice_id ON practice_session_notes(practice_id);
CREATE INDEX IF NOT EXISTS idx_practice_session_notes_team_member_id ON practice_session_notes(team_member_id);
CREATE INDEX IF NOT EXISTS idx_practice_session_notes_visible_to ON practice_session_notes USING GIN (visible_to);
CREATE INDEX IF NOT EXISTS idx_player_parent_relationships_player ON player_parent_relationships(player_team_member_id);
CREATE INDEX IF NOT EXISTS idx_player_parent_relationships_parent ON player_parent_relationships(parent_team_member_id);
CREATE INDEX IF NOT EXISTS idx_comments_visible_to ON comments USING GIN (visible_to);

-- Disable RLS for all tables
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_role_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE games DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clips DISABLE ROW LEVEL SECURITY;
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE counters DISABLE ROW LEVEL SECURITY;
ALTER TABLE timers DISABLE ROW LEVEL SECURITY;
ALTER TABLE counter_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE timer_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE film_review_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE film_review_session_clips DISABLE ROW LEVEL SECURITY;
ALTER TABLE film_review_session_shares DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_member_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_league_memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_injuries DISABLE ROW LEVEL SECURITY;
ALTER TABLE league_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE game_rosters DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE practice_session_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE player_parent_relationships DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT ALL ON teams TO authenticated;
GRANT ALL ON team_members TO authenticated;
GRANT ALL ON team_member_requests TO authenticated;
GRANT ALL ON team_member_role_requests TO authenticated;
GRANT ALL ON team_requests TO authenticated;
GRANT ALL ON games TO authenticated;
GRANT ALL ON game_attendance TO authenticated;
GRANT ALL ON videos TO authenticated;
GRANT ALL ON game_videos TO authenticated;
GRANT ALL ON clips TO authenticated;
GRANT ALL ON comments TO authenticated;
GRANT ALL ON counters TO authenticated;
GRANT ALL ON timers TO authenticated;
GRANT ALL ON counter_events TO authenticated;
GRANT ALL ON timer_events TO authenticated;
GRANT ALL ON film_review_sessions TO authenticated;
GRANT ALL ON film_review_session_clips TO authenticated;
GRANT ALL ON film_review_session_shares TO authenticated;
GRANT ALL ON team_member_roles TO authenticated;
GRANT ALL ON user_roles TO authenticated;
GRANT ALL ON leagues TO authenticated;
GRANT ALL ON team_league_memberships TO authenticated;
GRANT ALL ON team_stats TO authenticated;
GRANT ALL ON team_injuries TO authenticated;
GRANT ALL ON league_games TO authenticated;
GRANT ALL ON tournaments TO authenticated;
GRANT ALL ON tournament_games TO authenticated;
GRANT ALL ON tournament_teams TO authenticated;
GRANT ALL ON game_rosters TO authenticated;
GRANT ALL ON practice_sessions TO authenticated;
GRANT ALL ON practice_attendance TO authenticated;
GRANT ALL ON practice_session_notes TO authenticated;
GRANT ALL ON player_parent_relationships TO authenticated;

-- Create the auth hook function
CREATE OR REPLACE FUNCTION public.jwt_custom_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  current_user_id uuid;
  user_is_admin boolean := false;
  team_roles jsonb := '{}'::jsonb;
  ensure_result jsonb;
BEGIN
  -- Get the user ID from the event
  current_user_id := (event->>'user_id')::uuid;
  
  -- Initialize claims - CRITICAL: Make sure claims is never null
  IF event->'claims' IS NULL OR event->'claims' = 'null' THEN
    claims := '{}'::jsonb;
  ELSE
    claims := event->'claims';
    IF claims IS NULL THEN
      claims := '{}'::jsonb;
    END IF;
  END IF;
  
  -- Call ensure_user_role with explicit user ID parameter
  BEGIN
    RAISE NOTICE 'Calling ensure_user_role for user %', current_user_id;
    ensure_result := ensure_user_role(current_user_id);
    RAISE NOTICE 'ensure_user_role result: %', ensure_result;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error calling ensure_user_role from jwt_custom_claims: %', SQLERRM;
  END;
  
  -- Try to get admin status if the user exists in user_roles
  BEGIN
    SELECT is_admin INTO user_is_admin
    FROM public.user_roles
    WHERE user_id = current_user_id;
    
    -- If no result, default to false
    IF user_is_admin IS NULL THEN
      user_is_admin := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If any error, use default admin value
    user_is_admin := false;
  END;
  
  -- Try to get team roles if the user has any
  BEGIN
    WITH team_user_roles AS (
      SELECT 
        tm.team_id,
        t.name AS team_name,
        jsonb_agg(DISTINCT tmr.role) AS roles
      FROM team_members tm
      JOIN team_member_roles tmr ON tm.id = tmr.team_member_id
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
    
    -- If no roles, use empty object
    IF team_roles IS NULL THEN
      team_roles := '{}'::jsonb;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- If any error, use empty object
    team_roles := '{}'::jsonb;
  END;
  
  -- Set the claims - always use jsonb_set to ensure proper structure
  claims := jsonb_set(coalesce(claims, '{}'::jsonb), '{is_admin}', to_jsonb(coalesce(user_is_admin, false)));
  claims := jsonb_set(coalesce(claims, '{}'::jsonb), '{team_roles}', coalesce(team_roles, '{}'::jsonb));
  
  -- Update the claims in the event
  event := jsonb_set(event, '{claims}', coalesce(claims, '{}'::jsonb));
  
  -- Return the event, ensuring it's never null
  RETURN coalesce(event, '{}'::jsonb);
EXCEPTION WHEN OTHERS THEN
  -- If anything goes wrong, return minimal valid claims
  RAISE WARNING 'Error in jwt_custom_claims: %', SQLERRM;
  
  -- Create minimal valid claims structure
  claims := '{}'::jsonb;
  claims := jsonb_set(claims, '{is_admin}', 'false'::jsonb);
  claims := jsonb_set(claims, '{team_roles}', '{}'::jsonb);
  
  -- Make sure the event has a valid structure too
  IF event IS NULL OR event = 'null' THEN
    event := '{}'::jsonb;
  END IF;
  
  -- Set the claims in the event
  event := jsonb_set(coalesce(event, '{}'::jsonb), '{claims}', claims);
  
  RETURN event;
END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.jwt_custom_claims(jsonb) TO supabase_auth_admin;

-- Create table to track placeholder users that need cleanup
CREATE TABLE IF NOT EXISTS placeholder_users_cleanup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placeholder_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  real_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  cleaned_at TIMESTAMP,
  is_cleaned BOOLEAN DEFAULT FALSE
);

ALTER TABLE placeholder_users_cleanup DISABLE ROW LEVEL SECURITY;
GRANT ALL ON placeholder_users_cleanup TO authenticated;

-- Create function to track user_id changes in team_members
CREATE OR REPLACE FUNCTION track_user_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user_id has changed
  IF OLD.user_id != NEW.user_id THEN
    -- Check if the old user_id is for a placeholder user (email with placeholder.com)
    DECLARE
      old_user_email TEXT;
    BEGIN
      SELECT email INTO old_user_email FROM auth.users WHERE id = OLD.user_id;
      
      IF old_user_email LIKE 'temp_%@placeholder.com' THEN
        -- Add record to cleanup table
        INSERT INTO placeholder_users_cleanup 
          (placeholder_user_id, real_user_id)
        VALUES 
          (OLD.user_id, NEW.user_id);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue
      RAISE WARNING 'Error checking old user email: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists before creating it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'team_member_user_id_change'
  ) THEN
    DROP TRIGGER team_member_user_id_change ON team_members;
  END IF;
END $$;

-- Create trigger on team_members table
CREATE TRIGGER team_member_user_id_change
AFTER UPDATE OF user_id ON team_members
FOR EACH ROW
EXECUTE FUNCTION track_user_id_change();

-- Create function to handle new user login and cleanup
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
DECLARE
  placeholder_ids UUID[];
BEGIN
  -- Always ensure the user has a role entry when they log in
  INSERT INTO user_roles (user_id, is_admin)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;

  -- Find placeholder users ready for cleanup where real user has logged in
  SELECT array_agg(placeholder_user_id) INTO placeholder_ids
  FROM placeholder_users_cleanup
  WHERE real_user_id = NEW.id
    AND is_cleaned = FALSE;
    
  -- If we have placeholder users to clean up
  IF placeholder_ids IS NOT NULL AND array_length(placeholder_ids, 1) > 0 THEN
    -- Mark as cleaned
    UPDATE placeholder_users_cleanup
    SET is_cleaned = TRUE,
        cleaned_at = now()
    WHERE placeholder_user_id = ANY(placeholder_ids);
    
    -- Delete the placeholder users from auth.users
    -- Note: This requires auth admin privileges
    FOR i IN 1..array_length(placeholder_ids, 1) LOOP
      BEGIN
        PERFORM supabase_functions.http(
          'POST',
          'http://auth:9999/admin/users/' || placeholder_ids[i],
          ARRAY[
            ARRAY['Authorization', 'Bearer ' || current_setting('request.jwt.claim.service_role', TRUE)],
            ARRAY['Content-Type', 'application/json']
          ],
          '{"should_soft_delete": false}'::jsonb
        );
      EXCEPTION WHEN OTHERS THEN
        -- Log error but continue
        RAISE WARNING 'Failed to delete placeholder user %: %', placeholder_ids[i], SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If anything goes wrong, log the error but allow the login to proceed
  RAISE WARNING 'Error in handle_user_login: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop triggers if they exist before creating new one
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'user_login_handler'
  ) THEN
    DROP TRIGGER user_login_cleanup_placeholders ON auth.users;
  END IF;
END $$;

-- Create single trigger on auth.users table for login events
CREATE TRIGGER user_login_handler
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
WHEN (OLD.last_sign_in_at IS NULL AND NEW.last_sign_in_at IS NOT NULL)
EXECUTE FUNCTION handle_user_login();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Create the user role immediately upon user creation
  INSERT INTO user_roles (user_id, is_admin)
  VALUES (NEW.id, false)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but allow the creation to proceed
  RAISE WARNING 'Error in handle_new_user_creation: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the new trigger if it exists before creating it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    DROP TRIGGER on_auth_user_created ON auth.users;
  END IF;
END $$;

-- Create a trigger for new user creation
-- This will fire immediately when a user is created through any method (Google, email, etc.)
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user_creation();

-- Create a direct SQL function to insert a user role that works in any context
CREATE OR REPLACE FUNCTION ensure_user_role(user_id_param uuid DEFAULT NULL) 
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  result JSONB;
  current_user_id uuid;
  err_msg TEXT;
  err_detail TEXT;
  err_hint TEXT;
BEGIN
  -- If parameter is provided, use it; otherwise try to get from auth context
  IF user_id_param IS NOT NULL THEN
    current_user_id := user_id_param;
    RAISE NOTICE 'Using provided user ID: %', current_user_id;
  ELSE
    -- Try to get the current user ID
    BEGIN
      current_user_id := auth.uid();
      RAISE NOTICE 'Current user ID from auth.uid(): %', current_user_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error getting auth.uid(): %. Using NULL instead.', SQLERRM;
      current_user_id := NULL;
    END;
  END IF;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'No current user ID found';
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated or no user ID provided',
      'debug_info', jsonb_build_object(
        'function', 'ensure_user_role',
        'error_location', 'No valid user ID'
      )
    );
  END IF;
  
  -- Check if the user already has a role
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = current_user_id) THEN
    RAISE NOTICE 'User % already has a role', current_user_id;
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User role already exists',
      'user_id', current_user_id
    );
  END IF;
  
  -- Try to insert directly with exception handling
  BEGIN
    -- Direct SQL insert
    INSERT INTO user_roles (user_id, is_admin) 
    VALUES (current_user_id, false);
    
    RAISE NOTICE 'Successfully inserted user role for %', current_user_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'User role created successfully',
      'user_id', current_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      err_msg = MESSAGE_TEXT,
      err_detail = PG_EXCEPTION_DETAIL,
      err_hint = PG_EXCEPTION_HINT;
      
    RAISE NOTICE 'Error in ensure_user_role: %, %, %', err_msg, err_detail, err_hint;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', err_msg,
      'detail', err_detail,
      'hint', err_hint,
      'debug_info', jsonb_build_object(
        'function', 'ensure_user_role',
        'error_location', 'direct insert',
        'user_id', current_user_id
      )
    );
  END;
END;
$$;

-- Create a more reliable debug function with proper UUID handling
CREATE OR REPLACE FUNCTION debug_jwt_claims(test_id text)
RETURNS jsonb AS $$
DECLARE
  test_event jsonb;
  result jsonb;
  ensure_result jsonb;
  user_role record;
  log_messages text[] := array[]::text[];
  start_time timestamptz;
  end_time timestamptz;
  err_msg text;
  err_detail text;
  user_id_uuid uuid;
BEGIN
  start_time := clock_timestamp();
  log_messages := array_append(log_messages, 'Debug started at ' || start_time);
  
  -- Convert string to UUID
  BEGIN
    user_id_uuid := test_id::uuid;
    log_messages := array_append(log_messages, 'Successfully converted user ID to UUID: ' || user_id_uuid::text);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
    log_messages := array_append(log_messages, 'ERROR converting to UUID: ' || err_msg);
    user_id_uuid := null;
  END;
  
  -- Check if user already has a role
  BEGIN
    IF user_id_uuid IS NOT NULL THEN
      SELECT * INTO user_role FROM user_roles WHERE user_id = user_id_uuid;
      IF user_role IS NOT NULL THEN
        log_messages := array_append(log_messages, 'User already has role in user_roles table: ' || user_role.id::text);
      ELSE
        log_messages := array_append(log_messages, 'User does not have a role in user_roles table');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
    log_messages := array_append(log_messages, 'ERROR checking user_roles: ' || err_msg);
  END;
  
  -- Create a test event similar to what auth would send
  test_event := jsonb_build_object(
    'user_id', user_id_uuid,
    'claims', '{}'::jsonb
  );
  log_messages := array_append(log_messages, 'Created test event: ' || test_event::text);
  
  -- Directly try to insert a user role to see if it works
  BEGIN
    log_messages := array_append(log_messages, 'Attempting direct insertion into user_roles...');
    IF user_id_uuid IS NOT NULL THEN
      INSERT INTO user_roles (user_id, is_admin) 
      VALUES (user_id_uuid, false)
      ON CONFLICT (user_id) DO NOTHING;
      
      GET DIAGNOSTICS user_role.id = ROW_COUNT;
      IF user_role.id > 0 THEN
        log_messages := array_append(log_messages, 'Direct insertion succeeded, rows affected: ' || user_role.id);
      ELSE
        log_messages := array_append(log_messages, 'Direct insertion did not affect any rows (likely already exists)');
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      err_msg = MESSAGE_TEXT,
      err_detail = PG_EXCEPTION_DETAIL;
    log_messages := array_append(log_messages, 'ERROR in direct insertion: ' || err_msg);
    log_messages := array_append(log_messages, 'ERROR detail: ' || err_detail);
  END;
  
  -- Now call jwt_custom_claims with our test event
  BEGIN
    log_messages := array_append(log_messages, 'Calling jwt_custom_claims...');
    result := jwt_custom_claims(test_event);
    log_messages := array_append(log_messages, 'jwt_custom_claims result: ' || result::text);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      err_msg = MESSAGE_TEXT,
      err_detail = PG_EXCEPTION_DETAIL;
    log_messages := array_append(log_messages, 'ERROR in jwt_custom_claims: ' || err_msg);
    log_messages := array_append(log_messages, 'ERROR detail: ' || err_detail);
  END;
  
  -- Check if the ensure_user_role function works when called correctly
  BEGIN
    -- We can't call auth.uid() directly from this context, so we'll call with parameters
    log_messages := array_append(log_messages, 'Getting ensure_user_role source code for analysis...');
    SELECT pg_get_functiondef(oid) INTO err_msg FROM pg_proc WHERE proname = 'ensure_user_role';
    log_messages := array_append(log_messages, 'Function definition snippet: ' || substr(err_msg, 1, 200) || '...');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
    log_messages := array_append(log_messages, 'ERROR getting function definition: ' || err_msg);
  END;
  
  end_time := clock_timestamp();
  log_messages := array_append(log_messages, 'Debug finished at ' || end_time || ', took ' || (extract(epoch from (end_time - start_time)) * 1000)::text || ' ms');
  
  -- Return the comprehensive debug info
  RETURN jsonb_build_object(
    'input', test_event,
    'output', result,
    'logs', to_jsonb(log_messages),
    'user_id_type', pg_typeof(user_id_uuid)::text,
    'execution_time_ms', (extract(epoch from (end_time - start_time)) * 1000),
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql;
