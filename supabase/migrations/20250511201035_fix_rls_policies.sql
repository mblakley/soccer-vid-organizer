-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.clips;
DROP POLICY IF EXISTS "Allow select all clips for authenticated" ON public.clips;

-- Create new policies that use auth.uid() to check authentication instead of auth.role()
-- This policy allows any authenticated user to insert clips
CREATE POLICY "Allow insert for authenticated users"
  ON public.clips
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- This policy allows any authenticated user to select clips
CREATE POLICY "Allow select all clips for authenticated"
  ON public.clips
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to update their own clips
CREATE POLICY "Allow users to update own clips"
  ON public.clips
  FOR UPDATE
  USING (auth.uid() = created_by);

-- Allow users to delete their own clips
CREATE POLICY "Allow users to delete own clips"
  ON public.clips
  FOR DELETE
  USING (auth.uid() = created_by);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clips TO authenticated; 