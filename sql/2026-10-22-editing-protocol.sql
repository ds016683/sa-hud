-- The Editing Protocol punchlist (David, 10/22): when a session is in the
-- Editing Protocol, every input David fires gets a row here. The session
-- captures the entry, makes the change, and marks it done with the Inspect
-- fields (what happened, what page, what to look for, the preview link);
-- David approves from the Mission Briefing's Punchlist pill. If the session
-- has a question or could not make the edit, it flags the row and the entry
-- renders red until it is resolved. Run once in the Supabase SQL editor.
create table if not exists edit_punchlist (
  id             uuid primary key default gen_random_uuid(),
  objective_id   uuid references objectives(id) on delete set null,
  project_id     uuid references projects(id) on delete set null,
  session        text,                                -- the Claude session id that captured it
  seq            integer not null default 1,          -- order within the objective's punchlist
  entry          text not null,                       -- David's ask, condensed to one line
  status         text not null default 'working',     -- working | done | flagged | approved
  what_happened  text,                                -- Inspect: here's what happened
  where_page     text,                                -- Inspect: here's what page / slide / screen
  look_for       text,                                -- Inspect: here's what to look for
  link           text,                                -- the preview URL to check it on
  flag_reason    text,                                -- the question, or why the edit was not made
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  approved_at    timestamptz
);
create index if not exists edit_punchlist_objective_idx on edit_punchlist (objective_id, seq);
create index if not exists edit_punchlist_created_idx on edit_punchlist (created_at desc);

alter table edit_punchlist enable row level security;
drop policy if exists "hud read edit_punchlist" on edit_punchlist;
create policy "hud read edit_punchlist"   on edit_punchlist for select using (true);
drop policy if exists "hud insert edit_punchlist" on edit_punchlist;
create policy "hud insert edit_punchlist" on edit_punchlist for insert with check (true);
drop policy if exists "hud update edit_punchlist" on edit_punchlist;
create policy "hud update edit_punchlist" on edit_punchlist for update using (true);
drop policy if exists "hud delete edit_punchlist" on edit_punchlist;
create policy "hud delete edit_punchlist" on edit_punchlist for delete using (true);
