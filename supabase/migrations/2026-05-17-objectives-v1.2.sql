-- Objectives v1.2: eligibility tier + soft delete + bin
-- Run via: https://supabase.com/dashboard/project/cmuvomnmaoseccxpeuxq/sql/new

-- min_sov: sovereignty threshold for activation. NULL = computed default at read time.
-- deleted_at: soft delete. Bin shows rows where deleted_at IS NOT NULL.
alter table public.objectives
  add column if not exists min_sov smallint check (min_sov >= 1 and min_sov <= 10),
  add column if not exists deleted_at timestamptz;

-- Index for bin view + non-deleted filters
create index if not exists objectives_deleted_idx
  on public.objectives(user_id, deleted_at)
  where deleted_at is not null;

create index if not exists objectives_locked_idx
  on public.objectives(user_id, min_sov)
  where state = 'parked' and deleted_at is null;
