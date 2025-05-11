-- Enable RLS
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to insert clips
CREATE POLICY "Allow insert for authenticated users"
  ON clips
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to select all clips
CREATE POLICY "Allow select all clips for authenticated"
  ON clips
  FOR SELECT
  USING (auth.role() = 'authenticated');
