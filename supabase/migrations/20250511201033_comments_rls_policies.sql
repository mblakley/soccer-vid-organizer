-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to insert comments
CREATE POLICY "Allow insert for authenticated users"
  ON comments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow all authenticated users to select all comments
CREATE POLICY "Allow select all comments for authenticated"
  ON comments
  FOR SELECT
  USING (auth.role() = 'authenticated');
