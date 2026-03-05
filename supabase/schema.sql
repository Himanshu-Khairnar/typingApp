-- =============================================================================
-- typeracer — Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- =============================================================================

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── profiles ──────────────────────────────────────────────────────────────────
-- One row per authenticated user (mirrors auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  avatar_url  text,
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Migration: add settings column if it doesn't exist
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='settings') then
    alter table public.profiles add column settings jsonb not null default '{}';
  end if;
end $$;

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── results ───────────────────────────────────────────────────────────────────
-- Every completed typing test (solo)
create table if not exists public.results (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references public.profiles(id) on delete set null,
  mode             text not null check (mode in ('time','words','quote','code','custom')),
  time_limit       integer,          -- seconds (time mode)
  word_count       integer,          -- words mode
  language         text not null default 'english',
  net_wpm          numeric(6,1) not null,
  gross_wpm        numeric(6,1) not null,
  accuracy         numeric(5,2) not null,
  elapsed_ms       integer not null,
  consistency      numeric(5,1),
  correct_chars    integer not null default 0,
  incorrect_chars  integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists results_user_id_idx  on public.results(user_id);
create index if not exists results_net_wpm_idx  on public.results(net_wpm desc);
create index if not exists results_created_at_idx on public.results(created_at desc);

-- ── race_sessions ─────────────────────────────────────────────────────────────
create table if not exists public.race_sessions (
  id          uuid primary key default uuid_generate_v4(),
  room_code   text not null,
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  config      jsonb not null default '{}'
);

create index if not exists race_sessions_room_code_idx on public.race_sessions(room_code);

-- ── race_results ──────────────────────────────────────────────────────────────
create table if not exists public.race_results (
  id           uuid primary key default uuid_generate_v4(),
  session_id   uuid not null references public.race_sessions(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  player_name  text not null,
  rank         integer not null,
  net_wpm      numeric(6,1) not null,
  accuracy     numeric(5,2) not null,
  finished_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists race_results_session_id_idx on public.race_results(session_id);
create index if not exists race_results_user_id_idx    on public.race_results(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

-- profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- results
alter table public.results enable row level security;
create policy "Anyone can insert a result"
  on public.results for insert with check (true);
create policy "Users can view their own results"
  on public.results for select using (user_id = auth.uid() or user_id is null);
create policy "Leaderboard: top results are public"
  on public.results for select using (net_wpm >= 40);

-- race_sessions
alter table public.race_sessions enable row level security;
create policy "Race sessions are public"
  on public.race_sessions for select using (true);
create policy "Anyone can insert a race session"
  on public.race_sessions for insert with check (true);
create policy "Anyone can update a race session"
  on public.race_sessions for update using (true);

-- race_results
alter table public.race_results enable row level security;
create policy "Race results are public"
  on public.race_results for select using (true);
create policy "Anyone can insert a race result"
  on public.race_results for insert with check (true);

-- ── Leaderboard view ─────────────────────────────────────────────────────────
create or replace view public.leaderboard as
select
  r.id,
  r.user_id,
  p.username,
  r.mode,
  r.time_limit,
  r.language,
  r.net_wpm,
  r.accuracy,
  r.consistency,
  r.created_at,
  rank() over (order by r.net_wpm desc) as rank
from public.results r
left join public.profiles p on p.id = r.user_id
where r.net_wpm > 0
order by r.net_wpm desc
limit 100;
