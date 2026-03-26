-- =============================================================================
-- TypeArena Feature Migration — Daily Challenge, Streaks, Achievements, Friends
-- =============================================================================

-- ── daily_challenges ────────────────────────────────────────────────────────
create table if not exists public.daily_challenges (
  id             uuid primary key default gen_random_uuid(),
  challenge_date date not null unique,
  seed           text not null,
  config         jsonb not null default '{"mode":"time","timeLimit":60,"language":"english"}',
  created_at     timestamptz not null default now()
);
create index if not exists daily_challenges_date_idx on public.daily_challenges(challenge_date desc);

alter table public.daily_challenges enable row level security;
create policy "Daily challenges are public" on public.daily_challenges for select using (true);
create policy "Authenticated can insert daily challenges" on public.daily_challenges for insert with check (true);

-- ── daily_results ───────────────────────────────────────────────────────────
create table if not exists public.daily_results (
  id             uuid primary key default gen_random_uuid(),
  challenge_date date not null,
  user_id        uuid not null references auth.users(id) on delete cascade,
  result_id      uuid not null references public.results(id) on delete cascade,
  net_wpm        numeric(6,1) not null,
  accuracy       numeric(5,2) not null,
  created_at     timestamptz not null default now(),
  unique(challenge_date, user_id)
);
create index if not exists daily_results_date_idx on public.daily_results(challenge_date, net_wpm desc);
create index if not exists daily_results_user_idx on public.daily_results(user_id);

alter table public.daily_results enable row level security;
create policy "Daily results are public" on public.daily_results for select using (true);
create policy "Users insert own daily result" on public.daily_results for insert with check (auth.uid() = user_id);

-- ── streaks ─────────────────────────────────────────────────────────────────
create table if not exists public.streaks (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_test_date date,
  updated_at     timestamptz not null default now()
);

alter table public.streaks enable row level security;
create policy "Streaks are public" on public.streaks for select using (true);

-- ── achievements ────────────────────────────────────────────────────────────
create table if not exists public.achievements (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  unique(user_id, badge_id)
);
create index if not exists achievements_user_idx on public.achievements(user_id);

alter table public.achievements enable row level security;
create policy "Achievements are public" on public.achievements for select using (true);
create policy "Users insert own achievements" on public.achievements for insert with check (auth.uid() = user_id);

-- ── friendships ─────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  unique(requester_id, addressee_id),
  check(requester_id != addressee_id)
);
create index if not exists friendships_requester_idx on public.friendships(requester_id);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id);

alter table public.friendships enable row level security;
create policy "Users see own friendships" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users send friend requests" on public.friendships for insert
  with check (auth.uid() = requester_id);
create policy "Addressee can accept" on public.friendships for update
  using (auth.uid() = addressee_id);
create policy "Either party can delete" on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ── Add is_daily to results ─────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name='results' and column_name='is_daily') then
    alter table public.results add column is_daily boolean not null default false;
  end if;
end $$;

-- ── Enhanced leaderboard view ───────────────────────────────────────────────
drop view if exists public.leaderboard;
create or replace view public.leaderboard as
select
  r.id, r.user_id, p.username, p.avatar_url,
  r.mode, r.time_limit, r.word_count, r.language,
  r.net_wpm, r.accuracy, r.consistency, r.created_at,
  rank() over (order by r.net_wpm desc) as rank
from public.results r
left join public.profiles p on p.id = r.user_id
where r.net_wpm > 0 and r.user_id is not null
order by r.net_wpm desc
limit 500;

-- ── RPC: filterable leaderboard ─────────────────────────────────────────────
create or replace function public.get_leaderboard(
  p_mode text default null,
  p_time_limit integer default null,
  p_period text default 'all'
)
returns table (
  user_id uuid, username text, avatar_url text,
  net_wpm numeric, accuracy numeric,
  mode text, time_limit integer,
  created_at timestamptz, rank bigint
)
language sql stable as $$
  select
    r.user_id, p.username, p.avatar_url,
    max(r.net_wpm) as net_wpm,
    (array_agg(r.accuracy order by r.net_wpm desc))[1] as accuracy,
    r.mode, r.time_limit,
    max(r.created_at) as created_at,
    rank() over (order by max(r.net_wpm) desc) as rank
  from public.results r
  left join public.profiles p on p.id = r.user_id
  where r.user_id is not null and r.net_wpm > 0
    and (p_mode is null or r.mode = p_mode)
    and (p_time_limit is null or r.time_limit = p_time_limit)
    and (
      p_period = 'all'
      or (p_period = 'daily' and r.created_at >= current_date)
      or (p_period = 'weekly' and r.created_at >= current_date - interval '7 days')
    )
  group by r.user_id, p.username, p.avatar_url, r.mode, r.time_limit
  order by max(r.net_wpm) desc
  limit 100;
$$;

-- ── RPC: daily leaderboard ──────────────────────────────────────────────────
create or replace function public.get_daily_leaderboard(p_date date default current_date)
returns table (
  user_id uuid, username text, net_wpm numeric, accuracy numeric, rank bigint
)
language sql stable as $$
  select
    dr.user_id, p.username, dr.net_wpm, dr.accuracy,
    rank() over (order by dr.net_wpm desc) as rank
  from public.daily_results dr
  left join public.profiles p on p.id = dr.user_id
  where dr.challenge_date = p_date
  order by dr.net_wpm desc
  limit 100;
$$;

-- ── Trigger: auto-update streaks on result insert ───────────────────────────
create or replace function public.update_streak()
returns trigger language plpgsql security definer as $$
declare
  v_today date := current_date;
  v_last  date;
  v_cur   integer;
  v_long  integer;
begin
  if new.user_id is null then return new; end if;

  select last_test_date, current_streak, longest_streak
  into v_last, v_cur, v_long
  from public.streaks where user_id = new.user_id;

  if not found then
    insert into public.streaks (user_id, current_streak, longest_streak, last_test_date)
    values (new.user_id, 1, 1, v_today);
    return new;
  end if;

  if v_last = v_today then
    return new;
  elsif v_last = v_today - 1 then
    v_cur := v_cur + 1;
  else
    v_cur := 1;
  end if;

  if v_cur > v_long then v_long := v_cur; end if;

  update public.streaks
  set current_streak = v_cur, longest_streak = v_long,
      last_test_date = v_today, updated_at = now()
  where user_id = new.user_id;

  return new;
end;
$$;

drop trigger if exists on_result_update_streak on public.results;
create trigger on_result_update_streak
  after insert on public.results
  for each row execute function public.update_streak();

-- ── Make results publicly readable for leaderboard ──────────────────────────
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'results' and policyname = 'Public can read results'
  ) then
    create policy "Public can read results" on public.results for select using (true);
  end if;
end $$;

-- ── Ensure profiles are publicly readable (needed for friend search, leaderboard) ──
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'profiles' and policyname = 'Public profiles are viewable by everyone'
  ) then
    create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
  end if;
end $$;
