-- Add status field to videos table
ALTER TABLE videos 
ADD COLUMN status text NOT NULL DEFAULT 'active' 
CHECK (status IN ('active', 'removed', 'private', 'deleted'));

-- Add last_synced field to track when the video was last checked
ALTER TABLE videos
ADD COLUMN last_synced timestamp with time zone;

-- Add playlist_metadata JSONB field to store playlist-specific info
ALTER TABLE videos
ADD COLUMN playlist_metadata JSONB;

COMMENT ON COLUMN videos.status IS 'Status of the video: active, removed (from source), private, or deleted (by user)';
COMMENT ON COLUMN videos.last_synced IS 'When the video metadata was last synced with the source';
COMMENT ON COLUMN videos.playlist_metadata IS 'Additional metadata specific to playlists (position, playlist_id, etc)'; 