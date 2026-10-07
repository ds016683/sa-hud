-- Side Missions as objects + the Archive (10/7/2026). David runs this in the
-- Ledger (Supabase cmuvomnmaoseccxpeuxq). Until it runs, the HUD fails soft:
-- steps and archive views show "not set up yet", everything else works.

-- What needs to happen to close this out: the steps of a Side Mission.
create table if not exists objective_steps (
  id            bigserial primary key,
  objective_id  uuid not null references objectives(id) on delete cascade,
  text          text not null,
  done          boolean not null default false,
  done_at       timestamptz,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists objective_steps_obj_idx on objective_steps (objective_id);
alter table objective_steps enable row level security;
drop policy if exists "hud read objective_steps" on objective_steps;
create policy "hud read objective_steps"   on objective_steps for select using (true);
drop policy if exists "hud insert objective_steps" on objective_steps;
create policy "hud insert objective_steps" on objective_steps for insert with check (true);
drop policy if exists "hud update objective_steps" on objective_steps;
create policy "hud update objective_steps" on objective_steps for update using (true);
drop policy if exists "hud delete objective_steps" on objective_steps;
create policy "hud delete objective_steps" on objective_steps for delete using (true);

-- The Archive: the master knowledge system. One row per filed thing, from a
-- Side Mission or Main Mission close-out, a decision, a meeting, or Lumen.
-- Content lives in storage (project-files/archive/<yyyy>/<slug>/...); the row
-- is what you search.
create table if not exists archive_entries (
  id          bigserial primary key,
  kind        text not null,                 -- artifact | board | file | note | summary | decision
  title       text not null,
  summary     text,
  realm       text not null default 'third-horizon',  -- personal | third-horizon
  tags        text[] not null default '{}',
  source_kind text,                          -- objective | task | project | meeting | lumen
  source_id   text,                          -- the id in its own table
  source_title text,
  bucket      text,                          -- storage bucket, when there is a file
  path        text,                          -- storage path, when there is a file
  body        jsonb,                         -- the artifact or board itself, when small enough to keep inline
  filed_at    timestamptz not null default now(),
  filed_by    text not null default 'david (hud)'
);
create index if not exists archive_entries_filed_idx on archive_entries (filed_at desc);
create index if not exists archive_entries_source_idx on archive_entries (source_kind, source_id);
create index if not exists archive_entries_realm_idx on archive_entries (realm);
create index if not exists archive_entries_search_idx on archive_entries using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(source_title,'')));
alter table archive_entries enable row level security;
drop policy if exists "hud read archive_entries" on archive_entries;
create policy "hud read archive_entries"   on archive_entries for select using (true);
drop policy if exists "hud insert archive_entries" on archive_entries;
create policy "hud insert archive_entries" on archive_entries for insert with check (true);
drop policy if exists "hud update archive_entries" on archive_entries;
create policy "hud update archive_entries" on archive_entries for update using (true);
drop policy if exists "hud delete archive_entries" on archive_entries;
create policy "hud delete archive_entries" on archive_entries for delete using (true);
