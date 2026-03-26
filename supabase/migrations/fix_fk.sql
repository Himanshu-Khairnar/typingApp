-- =============================================================================
-- Run this in Supabase Dashboard → SQL Editor
-- Fixes: results.user_id FK now references auth.users directly (not profiles),
--        so results can be saved even if the profile trigger hasn't run yet.
-- =============================================================================

-- 1. Drop the old FK that pointed at profiles
alter table public.results
  drop constraint if exists results_user_id_fkey;

-- 2. Re-add FK pointing at auth.users instead
alter table public.results
  add constraint results_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;

-- 3. Allow authenticated users to insert their own results
drop policy if exists "Anyone can insert a result" on public.results;
create policy "Authenticated users can insert their own results"
  on public.results for insert
  with check (auth.uid() = user_id or user_id is null);

-- 4. Allow users to view their own results (no wpm gate)
drop policy if exists "Users can view their own results" on public.results;
drop policy if exists "Leaderboard: top results are public" on public.results;
create policy "Users can view their own results"
  on public.results for select
  using (user_id = auth.uid());

-- 5. Make sure profiles upsert works for authenticated user
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can upsert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);
