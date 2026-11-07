-- 2026-11-07 · APF BS Test Lab: the event mirror (David 11/7: "carve out a part
-- of the ledger that could store these things"). hud-pipelines/apf_lab_sync.py
-- upserts the Lab's event log here every five minutes; the Usage page on the
-- APF mission's Workbench reads the same events. Screenshots are never logged.
-- Run in the Ledger's SQL editor. Same open policies as live_files.

create table if not exists apf_lab_events (
  id          text primary key,            -- <iso ts>-<event id>, stable across runs
  ts          timestamptz not null,
  type        text not null,               -- gate.pass, run.complete, lumen.turn, ...
  visitor     text,                        -- per-browser id
  session     text,                        -- per-tab id
  name        text,                        -- the first name given at the gate
  country     text,
  region      text,
  run_id      text,                        -- ties questions, Lumen turns, lessons, shares to a run
  data        jsonb not null default '{}'::jsonb,
  meta        jsonb not null default '{}'::jsonb,
  inserted_at timestamptz not null default now()
);

create index if not exists apf_lab_events_ts      on apf_lab_events (ts desc);
create index if not exists apf_lab_events_type_ts on apf_lab_events (type, ts desc);
create index if not exists apf_lab_events_visitor on apf_lab_events (visitor);
create index if not exists apf_lab_events_run     on apf_lab_events (run_id);

alter table apf_lab_events enable row level security;
drop policy if exists "hud read apf_lab_events"   on apf_lab_events;
create policy "hud read apf_lab_events"   on apf_lab_events for select using (true);
drop policy if exists "hud insert apf_lab_events" on apf_lab_events;
create policy "hud insert apf_lab_events" on apf_lab_events for insert with check (true);
drop policy if exists "hud update apf_lab_events" on apf_lab_events;
create policy "hud update apf_lab_events" on apf_lab_events for update using (true);

-- A day-by-day rollup in Chicago time for quick reads and future HUD views.
create or replace view apf_lab_daily as
select
  (ts at time zone 'America/Chicago')::date                                   as day,
  count(distinct visitor) filter (where visitor is not null)                  as visitors,
  count(*) filter (where type = 'gate.pass')                                   as gate_passes,
  count(*) filter (where type = 'run.complete')                                as runs,
  count(*) filter (where type = 'run.complete' and data->>'flag' = 'red')      as red,
  count(*) filter (where type = 'run.complete' and data->>'flag' = 'yellow')   as yellow,
  count(*) filter (where type = 'run.complete' and data->>'flag' = 'green')    as green,
  count(*) filter (where type = 'run.complete' and data->>'question' is not null) as questions,
  count(*) filter (where type = 'lumen.turn')                                  as lumen_turns,
  count(*) filter (where type = 'learn.open')                                  as lessons,
  count(*) filter (where type in ('share.print','share.email'))                as shares,
  count(*) filter (where type = 'idea.post')                                   as ideas
from apf_lab_events
group by 1
order by 1 desc;
