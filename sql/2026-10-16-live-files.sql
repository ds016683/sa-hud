-- Live Files (David, 10/16): the files in play right now, before the final
-- filing system exists. One row per file put into play: by a Claude session
-- (livefile.py), by Lumen (write_file, file_attachment), or by David dropping
-- it on the Board. The bytes live in storage (bucket project-files):
--   linked to a Side Mission or a Main Mission task  -> objectives/<objective id>/files/<name>
--   linked to a Main Mission                         -> <project id>/<name>
--   linked to nothing yet                            -> live/<name>
-- The row is the index: what is live, what it belongs to, which version is
-- current, and (later) where it was filed. Run once in the Supabase SQL editor.
create table if not exists live_files (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,
  name           text not null,
  bucket         text not null default 'project-files',
  path           text not null,
  size           bigint,
  mime           text,
  objective_id   uuid references objectives(id) on delete set null,
  project_id     uuid references projects(id) on delete set null,
  task_id        uuid references project_tasks(id) on delete set null,
  note           text,
  source         text not null default 'david',      -- david | session | lumen
  session        text,                                -- the session or board title that produced it
  version        integer not null default 1,
  superseded_by  uuid references live_files(id) on delete set null,
  created_at     timestamptz not null default now(),
  filed_at       timestamptz,                         -- set when it leaves Live Files for the cabinet
  filed_to       text
);
create index if not exists live_files_objective_idx on live_files (objective_id) where filed_at is null;
create index if not exists live_files_project_idx on live_files (project_id) where filed_at is null;
create index if not exists live_files_created_idx on live_files (created_at desc);

alter table live_files enable row level security;
drop policy if exists "hud read live_files" on live_files;
create policy "hud read live_files"   on live_files for select using (true);
drop policy if exists "hud insert live_files" on live_files;
create policy "hud insert live_files" on live_files for insert with check (true);
drop policy if exists "hud update live_files" on live_files;
create policy "hud update live_files" on live_files for update using (true);
drop policy if exists "hud delete live_files" on live_files;
create policy "hud delete live_files" on live_files for delete using (true);
