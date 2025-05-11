-- Add policy to allow authenticated users to insert videos
create policy "Allow authenticated users to insert videos"
  on public.videos
  for insert
  to authenticated
  with check (auth.uid() = created_by);

-- Grant insert permission to authenticated users
grant insert on public.videos to authenticated; 