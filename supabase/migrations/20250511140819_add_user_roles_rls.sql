-- Enable RLS
alter table public.user_roles enable row level security;

-- Create policies
create policy "Users can view their own roles"
  on public.user_roles
  for select
  using (auth.uid() = user_id);

create policy "Users can request new roles"
  on public.user_roles
  for insert
  with check (
    auth.uid() = user_id
    and pending_review = true
  );

create policy "Users can't update roles"
  on public.user_roles
  for update
  using (false);

create policy "Users can't delete roles"
  on public.user_roles
  for delete
  using (false);

-- Grant access to authenticated users
grant usage on schema public to authenticated;
grant all on public.user_roles to authenticated;
