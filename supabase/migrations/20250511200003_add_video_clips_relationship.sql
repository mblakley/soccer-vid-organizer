-- Ensure video_id is unique in videos table
ALTER TABLE videos
ADD CONSTRAINT videos_video_id_unique UNIQUE (video_id);

-- Add foreign key constraint to clips table
ALTER TABLE clips
ADD CONSTRAINT clips_video_id_fkey
FOREIGN KEY (video_id)
REFERENCES videos(video_id)
ON DELETE CASCADE;

-- Add comment to explain the relationship
COMMENT ON CONSTRAINT clips_video_id_fkey ON clips IS 'Each clip must reference a valid video';

-- Add comment to explain the video_id column
COMMENT ON COLUMN clips.video_id IS 'References the video_id in the videos table';

-- Add index to improve join performance
CREATE INDEX IF NOT EXISTS idx_clips_video_id ON clips(video_id); 