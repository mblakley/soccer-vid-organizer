-- The foreign key constraint comments_clip_id_fkey already exists.

-- Add comment to explain the relationship
COMMENT ON CONSTRAINT comments_clip_id_fkey ON comments IS 'Each comment must reference a valid clip';

-- Add comment to explain the clip_id column
COMMENT ON COLUMN comments.clip_id IS 'References the id in the clips table';

-- Add index to improve join performance
CREATE INDEX IF NOT EXISTS idx_comments_clip_id ON comments(clip_id); 