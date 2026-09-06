-- Recipe Box — favorites and hidden recipes.
-- Paste this whole file into the Supabase SQL Editor and run it once.
--
-- One row per (user, recipe). Row Level Security means a signed-in user can only
-- ever see or change their own rows, which is what makes it safe to ship the
-- anon key in a public web page.

create table if not exists public.recipe_prefs (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  recipe_key text        not null,
  favorite   boolean     not null default false,
  hidden     boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, recipe_key)
);

alter table public.recipe_prefs enable row level security;

-- Drop first so re-running this file is safe.
drop policy if exists "read own prefs"   on public.recipe_prefs;
drop policy if exists "insert own prefs" on public.recipe_prefs;
drop policy if exists "update own prefs" on public.recipe_prefs;
drop policy if exists "delete own prefs" on public.recipe_prefs;

create policy "read own prefs"
  on public.recipe_prefs for select
  using (auth.uid() = user_id);

create policy "insert own prefs"
  on public.recipe_prefs for insert
  with check (auth.uid() = user_id);

create policy "update own prefs"
  on public.recipe_prefs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "delete own prefs"
  on public.recipe_prefs for delete
  using (auth.uid() = user_id);
