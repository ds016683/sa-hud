-- Objectives v1.4 — add start_date for banner display (start → target)
-- Apply via Supabase SQL editor (or migration tool) before deploying frontend v1.4.

alter table public.objectives
  add column if not exists start_date date;

-- Backfill: any active item without a start_date gets created_at::date so banners look right immediately.
update public.objectives
   set start_date = created_at::date
 where start_date is null
   and state = 'active';

-- Optional index for due-date sorting (Active list orders by due_date asc, importance desc, weight desc)
create index if not exists idx_objectives_user_state_due
  on public.objectives (user_id, state, due_date nulls last, importance desc, weight desc);
