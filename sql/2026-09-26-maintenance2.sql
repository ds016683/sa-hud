-- Maintenance, round two: workouts parsed from Harvest, InBody scans, devotional log kind.
create table if not exists workouts (
  id bigserial primary key,
  day date not null,
  harvest_entry_id bigint unique,
  minutes numeric(6,1),
  raw text,
  exercises jsonb default '[]'::jsonb,
  summary text,
  parsed_at timestamptz default now()
);
create table if not exists body_scans (
  id bigserial primary key,
  day date not null,
  weight_lbs numeric(6,1),
  smm_lbs numeric(6,1),
  pbf_pct numeric(5,1),
  ecw_tbw numeric(5,3),
  source text default 'whatsapp',
  image_ref text,
  note text,
  at timestamptz default now(),
  unique (day, source)
);
alter table daily_logs drop constraint if exists daily_logs_kind_check;
alter table daily_logs add constraint daily_logs_kind_check
  check (kind in ('discomfort','hygiene','exercise','sleep','note','activity','medication','diet','devotional'));
alter table workouts enable row level security;
alter table body_scans enable row level security;
create policy "owner read" on workouts for select to authenticated using (true);
create policy "owner all" on body_scans for all to authenticated using (true) with check (true);
