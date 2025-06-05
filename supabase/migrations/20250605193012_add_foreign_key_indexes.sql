-- Add indexes for unindexed foreign keys to improve query performance

-- Clips table
CREATE INDEX IF NOT EXISTS idx_clips_created_by ON public.clips(created_by);
CREATE INDEX IF NOT EXISTS idx_clips_video_id ON public.clips(video_id);

-- Comments table
CREATE INDEX IF NOT EXISTS idx_comments_clip_id ON public.comments(clip_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Counter events table
CREATE INDEX IF NOT EXISTS idx_counter_events_counter_id ON public.counter_events(counter_id);
CREATE INDEX IF NOT EXISTS idx_counter_events_team_member_id ON public.counter_events(team_member_id);

-- Counters table
CREATE INDEX IF NOT EXISTS idx_counters_created_by ON public.counters(created_by);
CREATE INDEX IF NOT EXISTS idx_counters_video_id ON public.counters(video_id);

-- Film review session clips table
CREATE INDEX IF NOT EXISTS idx_film_review_session_clips_clip_id ON public.film_review_session_clips(clip_id);

-- Film review session shares table
CREATE INDEX IF NOT EXISTS idx_film_review_session_shares_shared_with ON public.film_review_session_shares(shared_with);

-- Film review sessions table
CREATE INDEX IF NOT EXISTS idx_film_review_sessions_created_by ON public.film_review_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_film_review_sessions_video_id ON public.film_review_sessions(video_id);

-- Game attendance table
CREATE INDEX IF NOT EXISTS idx_game_attendance_team_member_id ON public.game_attendance(team_member_id);

-- Game videos table
CREATE INDEX IF NOT EXISTS idx_game_videos_video_id ON public.game_videos(video_id);

-- Games table
CREATE INDEX IF NOT EXISTS idx_games_created_by ON public.games(created_by);

-- Placeholder users cleanup table
CREATE INDEX IF NOT EXISTS idx_placeholder_users_cleanup_placeholder_user_id ON public.placeholder_users_cleanup(placeholder_user_id);
CREATE INDEX IF NOT EXISTS idx_placeholder_users_cleanup_real_user_id ON public.placeholder_users_cleanup(real_user_id);

-- Practice sessions table
CREATE INDEX IF NOT EXISTS idx_practice_sessions_created_by ON public.practice_sessions(created_by);

-- Team league memberships table
CREATE INDEX IF NOT EXISTS idx_team_league_memberships_division ON public.team_league_memberships(division);

-- Team member requests table
CREATE INDEX IF NOT EXISTS idx_team_member_requests_team_id ON public.team_member_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_member_requests_user_id ON public.team_member_requests(user_id);

-- Team member role requests table
CREATE INDEX IF NOT EXISTS idx_team_member_role_requests_team_member_id ON public.team_member_role_requests(team_member_id);

-- Team members table
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

-- Team requests table
CREATE INDEX IF NOT EXISTS idx_team_requests_requested_by ON public.team_requests(requested_by);

-- Teams table
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);

-- Timer events table
CREATE INDEX IF NOT EXISTS idx_timer_events_team_member_id ON public.timer_events(team_member_id);
CREATE INDEX IF NOT EXISTS idx_timer_events_timer_id ON public.timer_events(timer_id);

-- Timers table
CREATE INDEX IF NOT EXISTS idx_timers_created_by ON public.timers(created_by);
CREATE INDEX IF NOT EXISTS idx_timers_video_id ON public.timers(video_id);

-- Videos table
CREATE INDEX IF NOT EXISTS idx_videos_created_by ON public.videos(created_by);
CREATE INDEX IF NOT EXISTS idx_videos_team_id ON public.videos(team_id);
