-- Table: clips
create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  video_id text not null,
  start_time int not null,
  end_time int not null,
  created_by uuid references auth.users
);

-- Table: comments
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  clip_id uuid references clips(id) on delete cascade,
  user_id uuid references auth.users,
  content text not null,
  role_visibility text check (role_visibility in ('coach', 'player', 'both')) not null,
  created_at timestamp default now()
);

-- Enable Row Level Security on comments
alter table comments enable row level security;

-- Policies: Comment visibility
-- Players see only 'player' and 'both'
create policy "Players see their role visibility" on comments
  for select using (
    auth.role() = 'player' and role_visibility in ('player', 'both')
  );

-- Coaches see all comments
create policy "Coaches see all comments" on comments
  for select using (
    auth.role() = 'coach'
  );

-- Parents see player and both comments
create policy "Parents see player and both comments" on comments
  for select using (
    auth.role() = 'parent' and role_visibility in ('player', 'both')
  );
