-- Remove timestamps and player_counts columns from counters table
ALTER TABLE counters
DROP COLUMN IF EXISTS timestamps,
DROP COLUMN IF EXISTS player_counts;

-- Drop the append_timestamp function since we don't need it anymore
DROP FUNCTION IF EXISTS append_timestamp(UUID, DOUBLE PRECISION);
