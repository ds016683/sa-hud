-- Lumen learns: rules David gives it (or corrections it earns) live here and
-- load into every turn under the constitution.
create table if not exists lumen_rules (
  id bigserial primary key,
  text text not null,
  kind text not null default 'rule' check (kind in ('rule','preference','fact')),
  source text default 'david',
  active boolean not null default true,
  created_at timestamptz default now(),
  retired_at timestamptz
);
alter table lumen_rules enable row level security;
create policy "owner read" on lumen_rules for select to authenticated using (true);
