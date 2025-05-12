-- Add team_id column to videos table
ALTER TABLE videos ADD COLUMN team_id uuid REFERENCES teams(id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Enable read access for videos" ON videos;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON videos;
DROP POLICY IF EXISTS "Enable update for authenticated users based on user_id" ON videos;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON videos;

DROP POLICY IF EXISTS "Enable read access for clips" ON clips;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON clips;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON clips;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON clips;

DROP POLICY IF EXISTS "Enable read access for comments" ON comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON comments;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON comments;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON comments;

-- Drop existing policies
DROP POLICY IF EXISTS "Global admins can manage all videos" ON videos;
DROP POLICY IF EXISTS "Team coaches can manage their team's videos" ON videos;
DROP POLICY IF EXISTS "Team members can view their team's videos" ON videos;

DROP POLICY IF EXISTS "Global admins can manage all clips" ON clips;
DROP POLICY IF EXISTS "Team coaches can manage their team's clips" ON clips;
DROP POLICY IF EXISTS "Team members can view their team's clips" ON clips;

DROP POLICY IF EXISTS "Global admins can manage all comments" ON comments;
DROP POLICY IF EXISTS "Team coaches can manage their team's comments" ON comments;
DROP POLICY IF EXISTS "Team members can view their team's comments" ON comments;

-- Create new policies for videos
CREATE POLICY "Global admins can manage all videos" ON videos
  FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Team coaches can manage their team's videos" ON videos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = videos.team_id
        AND 'coach' = ANY(tm.roles)
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's videos" ON videos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = videos.team_id
        AND tm.is_active = true
    )
  );

-- Create new policies for clips
CREATE POLICY "Global admins can manage all clips" ON clips
  FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Team coaches can manage their team's clips" ON clips
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN videos v ON v.id = clips.video_id
      WHERE tm.user_id::TEXT = auth.uid()::TEXT
        AND tm.team_id = v.team_id
        AND 'coach' = ANY(tm.roles::TEXT[])
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's clips" ON clips
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN videos v ON v.id = clips.video_id
      WHERE tm.user_id::text = auth.uid()
        AND tm.team_id = v.team_id
        AND tm.is_active = true
    )
  );

-- Create new policies for comments
CREATE POLICY "Global admins can manage all comments" ON comments
  FOR ALL
  USING (public.user_has_global_role('admin'));

CREATE POLICY "Team coaches can manage their team's comments" ON comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN videos v ON v.id = comments.video_id
      WHERE tm.user_id::text = auth.uid()
        AND tm.team_id = v.team_id
        AND 'coach' = ANY(tm.roles::TEXT[])
        AND tm.is_active = true
    )
  );

CREATE POLICY "Team members can view their team's comments" ON comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM team_members tm
      JOIN videos v ON v.id = comments.video_id
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = v.team_id
        AND tm.is_active = true
    )
  );

-- Allow members to create comments on videos they have access to
CREATE POLICY "Team members can create comments on their team's clips" ON comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM clips c
      JOIN videos v ON c.video_id = v.id
      JOIN game_videos gv ON gv.video_id = v.id
      JOIN games g ON g.id = gv.game_id
      JOIN team_members tm ON tm.team_id IN (g.home_team_id, g.away_team_id)
      WHERE comments.clip_id = c.id
        AND tm.user_id = auth.uid()
        AND tm.is_active = true
    )
  );

-- Allow users to update/delete only their own comments
CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE
  USING (auth.uid() = user_id); 