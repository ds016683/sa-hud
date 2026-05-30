-- ============================================================================
-- Plaid Items table — one row per linked bank, scoped to personal OR th.
-- Lives in finance_personal schema because that schema is already David-only
-- (RLS gates it). The TH scope is fine to colocate here because the sync
-- writes go to finance.* tables based on the scope column, not the home schema.
--
-- Access tokens are stored as plain text — they're already protected by:
--   1. Supabase RLS (only service_role can SELECT this table)
--   2. The schema's david-only read policy
--   3. The fact that this table has ZERO end-user-readable policies (only service_role)
-- ============================================================================

create extension if not exists pgcrypto;

create table if not exists finance_personal.plaid_items (
  id              uuid        primary key default gen_random_uuid(),
  scope           text        not null check (scope in ('personal', 'th')),
  access_token    text        not null,
  item_id         text        not null unique,
  institution_id  text,
  institution_name text,
  -- Accounts in this Item, as Plaid returns them (for display + filtering)
  accounts        jsonb       not null default '[]',
  -- Transaction sync cursor (Plaid /transactions/sync API)
  sync_cursor     text,
  last_synced_at  timestamptz,
  last_sync_error text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists plaid_items_scope_idx on finance_personal.plaid_items(scope);

-- updated_at trigger
create or replace function finance_personal.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists plaid_items_touch on finance_personal.plaid_items;
create trigger plaid_items_touch
  before update on finance_personal.plaid_items
  for each row execute function finance_personal.touch_updated_at();

-- RLS: service_role only. The end user (David in his browser) should NEVER
-- read this table directly — he reads the synced balances/transactions tables.
-- Edge Functions hit this table with service_role key.
alter table finance_personal.plaid_items enable row level security;

-- Explicit deny for everyone except service_role (which bypasses RLS anyway).
-- No policies = no reads = correct.

-- Grants
grant all on finance_personal.plaid_items to service_role;

-- ============================================================================
-- Add a plaid_account_id column to transactions + balances so we can map
-- Plaid-sourced rows back to which Item they came from (useful for unlinking).
-- ============================================================================

alter table finance_personal.balances
  add column if not exists plaid_account_id text,
  add column if not exists plaid_item_id    uuid references finance_personal.plaid_items(id) on delete set null;

alter table finance_personal.transactions
  add column if not exists plaid_transaction_id text unique,
  add column if not exists plaid_account_id     text,
  add column if not exists plaid_item_id        uuid references finance_personal.plaid_items(id) on delete set null;

-- Same for the TH-side tables (finance schema)
alter table finance.cash_tracker
  add column if not exists plaid_account_id text,
  add column if not exists plaid_item_id    uuid;

-- TH transactions table — create if absent (mirrors personal shape but in finance schema)
create table if not exists finance.transactions (
  id                   uuid        primary key default gen_random_uuid(),
  transaction_date     date        not null,
  description          text        not null,
  amount               numeric(14,2) not null,
  category             text,
  account_name         text,
  notes                text,
  plaid_transaction_id text        unique,
  plaid_account_id     text,
  plaid_item_id        uuid,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists th_transactions_date_idx on finance.transactions(transaction_date desc);
grant select on finance.transactions to authenticated;
grant all    on finance.transactions to service_role;

alter table finance.transactions enable row level security;

-- TH user read: any authenticated TH user (we keep this loose for now —
-- the schema-level access is already gated by SA-HUD's auth wall + finance
-- schema's RLS pattern set by Aisha; not redefining that here)
drop policy if exists "th_transactions_read_authed" on finance.transactions;
create policy "th_transactions_read_authed" on finance.transactions
  for select using (auth.role() = 'authenticated');
