-- ============================================================================
-- Personal Finance v1 — mr-ledger-personal write target, PersonalFinancePage read source
-- ============================================================================
-- Scope: David's personal finances ONLY. Wholly separate from finance.* (TH side).
-- Bot: mr-ledger-personal writes via service-role key.
-- Reader: PersonalFinancePage.jsx in SA-HUD.
-- Naming: schema is `finance_personal` — short, parallel to existing `finance`.
-- ============================================================================

create schema if not exists finance_personal;

-- ----------------------------------------------------------------------------
-- balances — current snapshot per account (checking, savings, credit, etc.)
-- ----------------------------------------------------------------------------
create table if not exists finance_personal.balances (
  id              uuid primary key default gen_random_uuid(),
  account_name    text not null,                    -- "Chase Checking", "Amex Platinum"
  account_type    text not null,                    -- 'checking' | 'savings' | 'credit' | 'investment' | 'loan' | 'other'
  institution     text,                             -- "Chase", "Amex", "Fidelity"
  current_balance numeric(14,2) not null default 0,
  currency        text not null default 'USD',
  as_of           timestamptz not null default now(),
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists balances_account_idx on finance_personal.balances(account_name);
create index if not exists balances_as_of_idx on finance_personal.balances(as_of desc);

-- ----------------------------------------------------------------------------
-- transactions — ledger of personal-side activity
-- ----------------------------------------------------------------------------
create table if not exists finance_personal.transactions (
  id              uuid primary key default gen_random_uuid(),
  occurred_on     date not null,                    -- transaction date
  account_name    text not null,                    -- matches balances.account_name
  amount          numeric(14,2) not null,           -- positive = income/credit, negative = expense/debit
  category        text,                             -- "groceries", "income", "utilities", etc. (free-form v1)
  merchant        text,                             -- "Whole Foods", "Comed", payer name for income
  memo            text,                             -- David's notes / bot notes
  source          text,                             -- "manual" | "import" | "plaid" | "email-receipt" (for future Plaid v1.1)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists tx_date_idx on finance_personal.transactions(occurred_on desc);
create index if not exists tx_account_idx on finance_personal.transactions(account_name);
create index if not exists tx_category_idx on finance_personal.transactions(category);

-- ----------------------------------------------------------------------------
-- upcoming_bills — bills due in the near horizon
-- ----------------------------------------------------------------------------
create table if not exists finance_personal.upcoming_bills (
  id              uuid primary key default gen_random_uuid(),
  payee           text not null,                    -- "Comed", "Chase Mortgage", "Allstate"
  category        text,                             -- "utilities", "housing", "insurance"
  amount_due      numeric(14,2),                    -- nullable: variable bills (utilities) may be unknown until close
  due_on          date not null,
  account_to_pay  text,                             -- "Chase Checking" — where money comes from
  status          text not null default 'pending',  -- 'pending' | 'scheduled' | 'paid' | 'overdue'
  paid_on         date,
  recurring       boolean not null default false,
  recur_cadence   text,                             -- 'monthly' | 'quarterly' | 'annual' | null
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists bills_due_idx on finance_personal.upcoming_bills(due_on);
create index if not exists bills_status_idx on finance_personal.upcoming_bills(status);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function finance_personal.tg_set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists balances_set_updated_at on finance_personal.balances;
create trigger balances_set_updated_at before update on finance_personal.balances
  for each row execute function finance_personal.tg_set_updated_at();

drop trigger if exists tx_set_updated_at on finance_personal.transactions;
create trigger tx_set_updated_at before update on finance_personal.transactions
  for each row execute function finance_personal.tg_set_updated_at();

drop trigger if exists bills_set_updated_at on finance_personal.upcoming_bills;
create trigger bills_set_updated_at before update on finance_personal.upcoming_bills
  for each row execute function finance_personal.tg_set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS — David-only read access (matches the existing CompanyFinancePage access pattern)
-- ----------------------------------------------------------------------------
alter table finance_personal.balances        enable row level security;
alter table finance_personal.transactions    enable row level security;
alter table finance_personal.upcoming_bills  enable row level security;

-- Allow authenticated users matching David's 3 known aliases to read.
-- service_role bypasses RLS by default, so mr-ledger-personal writes are unaffected.
do $$
declare t text;
declare schemas_tables text[] := array['balances','transactions','upcoming_bills'];
begin
  foreach t in array schemas_tables loop
    execute format('drop policy if exists %I_david_read on finance_personal.%I', t || '_david', t);
    execute format($p$
      create policy %I_david_read on finance_personal.%I for select
      using (
        coalesce(auth.jwt() ->> 'email', '') in (
          'david@thirdhorizon.com',
          'david.smith@thirdhorizon.com',
          'dsmith@thirdhorizon.com'
        )
      )
    $p$, t || '_david', t);
  end loop;
end$$;

-- Grant USAGE on schema to authenticated role so policies can be evaluated
grant usage on schema finance_personal to authenticated, anon, service_role;
grant select on all tables in schema finance_personal to authenticated;
grant all on all tables in schema finance_personal to service_role;
alter default privileges in schema finance_personal grant select on tables to authenticated;
alter default privileges in schema finance_personal grant all on tables to service_role;
