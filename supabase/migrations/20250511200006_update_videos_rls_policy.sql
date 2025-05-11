-- Update the videos policy to handle upserts properly
DROP POLICY IF EXISTS "Allow authenticated users to insert videos" ON public.videos;
DROP POLICY IF EXISTS "Coaches and admins can manage videos" ON public.videos;

-- Create a policy that allows coaches and admins to manage videos (view, create, update, delete)
CREATE POLICY "Coaches and admins can manage videos" ON public.videos
  FOR ALL
  TO authenticated
  USING (auth.uid() = created_by OR auth.role() IN ('coach', 'admin'))
  WITH CHECK (auth.uid() = created_by);

-- Create a policy that allows any authenticated user to view videos
CREATE POLICY "Authenticated users can view videos" ON public.videos
  FOR SELECT
  TO authenticated
  USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated; 