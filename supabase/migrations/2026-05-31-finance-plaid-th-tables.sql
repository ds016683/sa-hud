-- Dedicated TH (Third Horizon) Plaid tables in `finance` schema.
-- Mirrors `finance_personal.balances` / `.transactions` shape.
-- Plus an account_scope override table so a single Plaid Item (e.g. one Chase login)
-- can have its individual accounts routed to personal or th schema.

-- Account-level scope override (last4-based for simplicity).
-- If a row exists here, the account is routed by `scope`.
-- If no row, the parent plaid_item's scope is used.
create table if not exists finance.account_scope (
  account_last4 text primary key,
  scope text not null check (scope in ('personal','th')),
  label text,
  updated_at timestamptz not null default now()
);

alter table finance.account_scope enable row level security;

drop policy if exists "david read account_scope" on finance.account_scope;
create policy "david read account_scope" on finance.account_scope
  for select using (
    auth.jwt() ->> 'email' in (
      'david.smith@thirdhorizon.com',
      'david@thirdhorizon.com',
      'dsmith@thirdhorizon.com'
    )
  );

drop policy if exists "david write account_scope" on finance.account_scope;
create policy "david write account_scope" on finance.account_scope
  for all using (
    auth.jwt() ->> 'email' in (
      'david.smith@thirdhorizon.com',
      'david@thirdhorizon.com',
      'dsmith@thirdhorizon.com'
    )
  );

grant usage on schema finance to anon, authenticated;
grant select, insert, update, delete on finance.account_scope to anon, authenticated;

-- Seed: David's known Chase accounts (2026-05-31)
insert into finance.account_scope (account_last4, scope, label) values
  ('1985','th','Chase TH primary'),
  ('2009','th','Chase TH (largely inactive)'),
  ('1993','th','Chase TH (largely inactive)'),
  ('9122','personal','Chase Family'),
  ('3265','personal','Chase Family'),
  ('2933','personal','Chase Family')
on conflict (account_last4) do update
  set scope = excluded.scope, label = excluded.label, updated_at = now();

-- TH balances (one row per account, replaced on each sync via upsert on plaid_account_id)
create table if not exists finance.balances_plaid (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  account_type text,
  institution text not null,
  current_balance numeric(14,2) not null default 0,
  currency text not null default 'USD',
  as_of timestamptz not null default now(),
  plaid_account_id text unique,
  plaid_item_id uuid,
  account_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists balances_plaid_inst_idx on finance.balances_plaid(institution);
create index if not exists balances_plaid_last4_idx on finance.balances_plaid(account_last4);

alter table finance.balances_plaid enable row level security;

drop policy if exists "david read balances_plaid" on finance.balances_plaid;
create policy "david read balances_plaid" on finance.balances_plaid
  for select using (
    auth.jwt() ->> 'email' in (
      'david.smith@thirdhorizon.com',
      'david@thirdhorizon.com',
      'dsmith@thirdhorizon.com'
    )
  );

drop policy if exists "david write balances_plaid" on finance.balances_plaid;
create policy "david write balances_plaid" on finance.balances_plaid
  for all using (
    auth.jwt() ->> 'email' in (
      'david.smith@thirdhorizon.com',
      'david@thirdhorizon.com',
      'dsmith@thirdhorizon.com'
    )
  );

grant select, insert, update, delete on finance.balances_plaid to anon, authenticated;

-- TH transactions
create table if not exists finance.transactions_plaid (
  id uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  merchant text,
  memo text,
  amount numeric(14,2) not null,
  category text,
  account_name text,
  account_last4 text,
  plaid_transaction_id text unique,
  plaid_account_id text,
  plaid_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_plaid_date_idx on finance.transactions_plaid(occurred_on desc);
create index if not exists transactions_plaid_acct_idx on finance.transactions_plaid(plaid_account_id);
create index if not exists transactions_plaid_last4_idx on finance.transactions_plaid(account_last4);

alter table finance.transactions_plaid enable row level security;

drop policy if exists "david read transactions_plaid" on finance.transactions_plaid;
create policy "david read transactions_plaid" on finance.transactions_plaid
  for select using (
    auth.jwt() ->> 'email' in (
      'david.smith@thirdhorizon.com',
      'david@thirdhorizon.com',
      'dsmith@thirdhorizon.com'
    )
  );

drop policy if exists "david write transactions_plaid" on finance.transactions_plaid;
create policy "david write transactions_plaid" on finance.transactions_plaid
  for all using (
    auth.jwt() ->> 'email' in (
      'david.smith@thirdhorizon.com',
      'david@thirdhorizon.com',
      'dsmith@thirdhorizon.com'
    )
  );

grant select, insert, update, delete on finance.transactions_plaid to anon, authenticated;
