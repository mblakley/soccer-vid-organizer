-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  video_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'youtube',
  duration INT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(video_id, source)
);

-- Enable Row Level Security
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Policies for videos table
-- Players and parents can view all videos
CREATE POLICY "Players and parents can view videos" ON videos
  FOR SELECT
  USING (
    auth.role() IN ('player', 'parent')
  );

-- Coaches and admins can manage videos (view, create, update, delete)
CREATE POLICY "Coaches and admins can manage videos" ON videos
  FOR ALL
  USING (
    auth.role() IN ('coach', 'admin')
  );

-- Add reference type for clips.video_id to the videos table
COMMENT ON COLUMN clips.video_id IS 'References a video_id in the videos table';

-- Create a function to check if clips reference valid videos
CREATE OR REPLACE FUNCTION public.validate_clip_video()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the video_id exists in videos.video_id
  -- For backward compatibility we only check YouTube videos
  IF NOT EXISTS (SELECT 1 FROM videos WHERE video_id = NEW.video_id AND source = 'youtube') THEN
    -- Allow the clip even if no matching video (for backward compatibility)
    -- But log a notice
    RAISE NOTICE 'Warning: Clip references a video_id % that does not exist in the videos table', NEW.video_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to validate clips
CREATE TRIGGER validate_clip_video_trigger
BEFORE INSERT OR UPDATE ON clips
FOR EACH ROW
EXECUTE FUNCTION validate_clip_video(); 