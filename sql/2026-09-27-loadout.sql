-- Loadout (9/27): one Activity Board, one running clock.
-- `clocks` holds every run segment of an item on the board (Side Mission,
-- Main Mission task, impromptu). A row with stopped_at null is the equipped
-- item's running clock. Release sums the segments into the daily_logs
-- activity row; Harvest is never touched by these.

create table if not exists clocks (
  id            bigserial primary key,
  objective_id  uuid not null references objectives(id) on delete cascade,
  day           date not null,
  started_at    timestamptz not null default now(),
  stopped_at    timestamptz,
  minutes       numeric,
  note          text
);
create index if not exists clocks_objective_idx on clocks (objective_id);
create index if not exists clocks_day_idx on clocks (day);
create index if not exists clocks_running_idx on clocks (stopped_at) where stopped_at is null;

alter table clocks enable row level security;
drop policy if exists "hud read clocks" on clocks;
create policy "hud read clocks"   on clocks for select using (true);
drop policy if exists "hud insert clocks" on clocks;
create policy "hud insert clocks" on clocks for insert with check (true);
drop policy if exists "hud update clocks" on clocks;
create policy "hud update clocks" on clocks for update using (true);
