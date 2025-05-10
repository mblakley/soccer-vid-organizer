-- clips table
create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_id text not null,
  start_time int not null,
  end_time int not null,
  created_by uuid references auth.users
);

-- comments table
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid references clips(id) on delete cascade,
  user_id uuid references auth.users,
  content text not null,
  role_visibility text check (role_visibility in ('coach', 'player', 'both')) not null,
  created_at timestamp default now()
);

-- enable row-level security
alter table comments enable row level security;

-- Drop existing policies if needed to avoid conflicts
drop policy if exists "Players see player/both" on comments;
drop policy if exists "Coaches see all" on comments;
drop policy if exists "Parents see player/both" on comments;

-- Recreate policies
create policy "Players see player/both" on comments
  for select using (
    auth.role() = 'player' and role_visibility in ('player', 'both')
  );

create policy "Coaches see all" on comments
  for select using (
    auth.role() = 'coach'
  );

create policy "Parents see player/both" on comments
  for select using (
    auth.role() = 'parent' and role_visibility in ('player', 'both')
  );
