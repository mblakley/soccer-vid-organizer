-- Create counter_events table
CREATE TABLE IF NOT EXISTS counter_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  counter_id UUID NOT NULL REFERENCES counters(id) ON DELETE CASCADE,
  timestamp DOUBLE PRECISION NOT NULL,
  value INTEGER NOT NULL DEFAULT 1,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create timer_events table
CREATE TABLE IF NOT EXISTS timer_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  timer_id UUID NOT NULL REFERENCES timers(id) ON DELETE CASCADE,
  start_time DOUBLE PRECISION NOT NULL,
  end_time DOUBLE PRECISION,
  duration DOUBLE PRECISION,
  team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create function to increment counter
CREATE OR REPLACE FUNCTION increment_counter(counter_id UUID)
RETURNS INTEGER AS $$
BEGIN
  UPDATE counters
  SET count = count + 1
  WHERE id = counter_id;
  
  RETURN (SELECT count FROM counters WHERE id = counter_id);
END;
$$ LANGUAGE plpgsql;

-- Create function to append timestamp
CREATE OR REPLACE FUNCTION append_timestamp(counter_id UUID, timestamp_value DOUBLE PRECISION)
RETURNS DOUBLE PRECISION[] AS $$
BEGIN
  UPDATE counters
  SET timestamps = array_append(timestamps, timestamp_value)
  WHERE id = counter_id;
  
  RETURN (SELECT timestamps FROM counters WHERE id = counter_id);
END;
$$ LANGUAGE plpgsql; 