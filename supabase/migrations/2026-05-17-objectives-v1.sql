-- ============================================================
-- Objectives v1 — Supabase schema
-- ============================================================
-- Run this in the Supabase SQL editor for project cmuvomnmaoseccxpeuxq
-- ============================================================

-- ---------- objectives ----------
create table if not exists public.objectives (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null,
  notes        text,
  effort       int  not null check (effort between 1 and 5),       -- 1=pebble..5=boulder size
  importance   int  not null check (importance between 1 and 3),   -- 1=nice..3=critical
  weight       int  generated always as (effort * importance) stored,
  kind         text not null default 'execution' check (kind in ('design','execution')),
  state        text not null default 'active'    check (state in ('active','released','foreman','parked')),
  who          text,                                                  -- person/team this is FOR or WITH
  is_anchor    boolean not null default false,                        -- ★ today's Rock answer
  is_emergency boolean not null default false,                        -- red banner
  parent_id    uuid references public.objectives(id) on delete set null,
  captured_at  timestamptz not null default now(),
  released_at  timestamptz,
  released_kind text check (released_kind in ('done','foreman')),
  updated_at   timestamptz not null default now()
);
create index if not exists objectives_user_state_idx on public.objectives(user_id, state);
create index if not exists objectives_user_anchor_idx on public.objectives(user_id) where is_anchor and state = 'active';
create index if not exists objectives_user_emerg_idx on public.objectives(user_id) where is_emergency and state = 'active';

-- ---------- sovereignty_ratings (one row per day) ----------
create table if not exists public.sovereignty_ratings (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  day       date not null,
  score     int  not null check (score between 1 and 10),
  notes     text,
  created_at timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists sov_user_day_idx on public.sovereignty_ratings(user_id, day desc);

-- ---------- habits (one row per day, boolean inputs + count for weed) ----------
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  day         date not null,
  sleep_ok    boolean not null default false,
  gym         boolean not null default false,
  meditation  boolean not null default false,
  devotional  boolean not null default false,
  weed_count  int     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, day)
);
create index if not exists habits_user_day_idx on public.habits(user_id, day desc);

-- ---------- meditation_responses (Rock answer logged daily) ----------
create table if not exists public.meditation_responses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  day           date not null,
  rock_answer   text not null,
  audio_variant text default 'sonia-stream',
  created_at    timestamptz not null default now(),
  objective_id  uuid references public.objectives(id) on delete set null,
  unique (user_id, day)
);
create index if not exists med_user_day_idx on public.meditation_responses(user_id, day desc);

-- ============================================================
-- RLS policies — user_id = auth.uid()
-- ============================================================

alter table public.objectives             enable row level security;
alter table public.sovereignty_ratings    enable row level security;
alter table public.habits                 enable row level security;
alter table public.meditation_responses   enable row level security;

-- helper: drop & recreate policies idempotently
do $$
declare
  t text;
begin
  for t in select unnest(array['objectives','sovereignty_ratings','habits','meditation_responses']) loop
    execute format('drop policy if exists %I_select on public.%I',  t || '_select', t);
    execute format('drop policy if exists %I_insert on public.%I',  t || '_insert', t);
    execute format('drop policy if exists %I_update on public.%I',  t || '_update', t);
    execute format('drop policy if exists %I_delete on public.%I',  t || '_delete', t);

    execute format('create policy %I_select on public.%I for select using (auth.uid() = user_id)', t || '_select', t);
    execute format('create policy %I_insert on public.%I for insert with check (auth.uid() = user_id)', t || '_insert', t);
    execute format('create policy %I_update on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)', t || '_update', t);
    execute format('create policy %I_delete on public.%I for delete using (auth.uid() = user_id)', t || '_delete', t);
  end loop;
end$$;

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function public.tg_set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists objectives_set_updated_at on public.objectives;
create trigger objectives_set_updated_at
  before update on public.objectives
  for each row execute function public.tg_set_updated_at();

drop trigger if exists habits_set_updated_at on public.habits;
create trigger habits_set_updated_at
  before update on public.habits
  for each row execute function public.tg_set_updated_at();

-- ============================================================
-- DONE
-- ============================================================
