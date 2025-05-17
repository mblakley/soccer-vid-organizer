-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE team_member_role AS ENUM ('player', 'coach', 'manager', 'parent', 'analyst');
CREATE TYPE game_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE attendance_status AS ENUM ('Available', 'Unavailable', 'Injured', 'Partial', 'Unknown');
CREATE TYPE video_type AS ENUM ('full_game', 'highlights', 'analysis', 'other');
CREATE TYPE counter_type AS ENUM ('standard', 'resettable', 'player-based');
CREATE TYPE timer_type AS ENUM ('standard', 'player-based');
CREATE TYPE comment_visibility AS ENUM ('coach', 'player', 'both');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'unknown');

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
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_member_role_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id) ON DELETE CASCADE,
  requested_role TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
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
  updated_at TIMESTAMP DEFAULT now()
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
  role_visibility comment_visibility NOT NULL,
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
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    UNIQUE(user_id)
);

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

-- Create the auth hook function
create or replace function public.jwt_custom_claims(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = 'public'
security definer
as $$
  DECLARE
  claims jsonb;
  current_user_id uuid;
  user_is_admin boolean;
  team_roles jsonb;
  BEGIN
    -- Log the incoming event
    RAISE NOTICE 'Incoming event: %', event;
    
    current_user_id := (event->>'user_id')::uuid;
    RAISE NOTICE 'Current user ID: %', current_user_id;
    
    -- Initialize claims
    claims := event->'claims';
    RAISE NOTICE 'Initial claims: %', claims;
    
    -- Check if user is an admin
    SELECT EXISTS (
      SELECT 1 
      FROM public.user_roles ur
      WHERE ur.user_id = current_user_id 
      AND ur.is_admin = true
    ) INTO user_is_admin;

    -- Debug log
    RAISE NOTICE 'User ID: %, Is Admin: %', current_user_id, user_is_admin;

    -- Set the is_admin claim
    claims := jsonb_set(claims, '{is_admin}', to_jsonb(user_is_admin));
    RAISE NOTICE 'Claims after setting is_admin: %', claims;

    -- Fetch team-specific roles for the user using the new team_member_roles table
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

    -- Debug log
    RAISE NOTICE 'Team Roles: %', team_roles;

    -- Set the team roles object or empty object if none
    IF team_roles IS NOT NULL THEN
      claims := jsonb_set(claims, '{team_roles}', team_roles);
    ELSE
      claims := jsonb_set(claims, '{team_roles}', '{}'::jsonb);
    END IF;

    -- Debug log final claims
    RAISE NOTICE 'Final Claims: %', claims;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);
    RAISE NOTICE 'Final event: %', event;

    RETURN event;
  END;
$$;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.jwt_custom_claims(jsonb) TO supabase_auth_admin;

-- Insert default "pending" team
INSERT INTO teams (id, name, club_affiliation, season, age_group, gender)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Pending',
    'System',
    '2025',
    'All',
    'Unknown'
);
