-- Create a lightweight user profile table for additional user metadata
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Allow an authenticated user to insert their own profile
create policy if not exists "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- Allow an authenticated user to select their own profile
create policy if not exists "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Allow an authenticated user to update their own profile
create policy if not exists "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
