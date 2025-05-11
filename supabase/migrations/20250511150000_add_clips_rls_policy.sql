-- Enable RLS on clips table if not already enabled
alter table public.clips enable row level security;

-- Drop any existing policies to avoid conflicts
drop policy if exists "Allow authenticated users to read clips" on public.clips;

-- Create policy to allow all authenticated users to read clips
create policy "Allow authenticated users to read clips"
  on public.clips
  for select
  using (auth.role() = 'authenticated');

-- Grant necessary permissions to authenticated users
grant select on public.clips to authenticated;

comment on policy "Allow authenticated users to read clips" on public.clips is 'Allows any authenticated user to read all clips'; 