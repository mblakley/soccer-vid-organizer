-- Enable RLS on all tables
ALTER TABLE film_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE film_review_session_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE film_review_session_shares ENABLE ROW LEVEL SECURITY;

-- Create policies for film_review_sessions
CREATE POLICY "Team members can view their team's sessions"
ON film_review_sessions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = film_review_sessions.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Team members can create sessions for their team"
ON film_review_sessions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.team_id = film_review_sessions.team_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Creators can update their own sessions"
ON film_review_sessions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = film_review_sessions.creator_team_member_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Creators can delete their own sessions"
ON film_review_sessions
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM team_members
    WHERE team_members.id = film_review_sessions.creator_team_member_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

-- Create policies for film_review_session_clips
CREATE POLICY "Team members can view clips for their team's sessions"
ON film_review_session_clips
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_clips.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Team members can add clips to their team's sessions"
ON film_review_session_clips
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_clips.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Team members can update clips in their team's sessions"
ON film_review_session_clips
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_clips.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Team members can delete clips from their team's sessions"
ON film_review_session_clips
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_clips.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

-- Create policies for film_review_session_shares
CREATE POLICY "Team members can view shares for their team's sessions"
ON film_review_session_shares
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_shares.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Team members can share their team's sessions"
ON film_review_session_shares
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_shares.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);

CREATE POLICY "Team members can remove shares from their team's sessions"
ON film_review_session_shares
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM film_review_sessions
    JOIN team_members ON team_members.team_id = film_review_sessions.team_id
    WHERE film_review_sessions.id = film_review_session_shares.film_review_session_id
    AND team_members.user_id = auth.uid()
    AND team_members.is_active = true
  )
);
