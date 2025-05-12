-- Remove duration, sessions, and player_times columns from timers table
ALTER TABLE timers
DROP COLUMN IF EXISTS duration,
DROP COLUMN IF EXISTS sessions,
DROP COLUMN IF EXISTS player_times;
