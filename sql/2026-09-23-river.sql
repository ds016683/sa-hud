-- The River: miles ledger, daily logs (the WhatsApp hands), maintenance items.
-- Run once in the Supabase SQL editor (project cmuvomnmaoseccxpeuxq).

create table if not exists miles_ledger (
  id bigserial primary key,
  day date not null,
  badge text not null,
  key text not null default '',
  miles numeric(6,2) not null,
  evidence text,
  source text default 'refresh',
  awarded_at timestamptz default now(),
  unique (day, badge, key)
);

create table if not exists daily_logs (
  id bigserial primary key,
  day date not null,
  kind text not null check (kind in ('discomfort','hygiene','exercise','sleep','note','activity')),
  what text,
  value numeric,
  note text,
  at timestamptz default now(),
  source text default 'whatsapp'
);
create index if not exists daily_logs_day_kind on daily_logs (day, kind);

create table if not exists maintenance_items (
  id bigserial primary key,
  title text not null,
  category text not null check (category in ('content','hygiene','exercise','other')),
  cadence text,
  status text not null default 'open' check (status in ('open','done','dropped')),
  day date,
  done_at timestamptz,
  created_at timestamptz default now()
);

alter table miles_ledger enable row level security;
alter table daily_logs enable row level security;
alter table maintenance_items enable row level security;
create policy "owner read" on miles_ledger for select to authenticated using (true);
create policy "owner read" on daily_logs for select to authenticated using (true);
create policy "owner all" on maintenance_items for all to authenticated using (true) with check (true);
