-- Clients as containers (David 11/25/2026): "a client page needs to be a bit different than a gate ... Mission work
-- is still mission work, but a mission can tie to a client or client initiative." Run once in the Supabase SQL
-- editor (project cmuvomnmaoseccxpeuxq). Until it has run, the HUD reads the same rows from the client registry in
-- storage (project-files/clients/registry.json, src/lib/clients.js); the ids below match that file so storage roots
-- (clients/<id>/...) stay the same before and after.

create table if not exists clients (
  id uuid primary key,
  key text unique not null,            -- the mission key family, e.g. Client.MMA
  name text not null,
  short text,
  description text,                    -- the engagement line, verbatim
  tracked boolean not null default false,   -- on the Clients landing page only when David tracks it himself
  harvest_clients text[] not null default '{}',   -- the client's names in Harvest (time_entries.client)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table clients enable row level security;
create policy "owner all" on clients for all to authenticated using (true) with check (true);

-- A mission ties to a client through client_id on the project row.
alter table projects add column if not exists client_id uuid references clients(id);
create index if not exists projects_client on projects (client_id);

-- A file can be tied to a client directly (the path under clients/<id>/files carries the tie until this lands).
alter table live_files add column if not exists client_id uuid references clients(id);
create index if not exists live_files_client on live_files (client_id);

-- MMA, the first client, and its missions.
insert into clients (id, key, name, short, description, tracked, harvest_clients) values (
  '62d4dc17-c7b0-4026-acfc-3a899624df8c', 'Client.MMA', 'Marsh McLennan Agency', 'MMA',
  'Marsh McLennan Agency engagement: Schedule E DaaS, Schedule F innovation, NetNav 2.0, Master Tracker',
  true, array['Marsh and McLennan Agency (MMA) Core Production']
) on conflict (id) do nothing;
update projects set client_id = '62d4dc17-c7b0-4026-acfc-3a899624df8c' where id in (
  'ecf45f99-e771-4fa1-9c84-758148b60be4',   -- Client.MMA.Renewal · MMA Strategy and Contract Renewal
  'dd2e6873-c4f1-4f41-af22-5d54800857cb'    -- Client.MMA (completed; the engagement line)
);
