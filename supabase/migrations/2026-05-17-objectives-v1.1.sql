-- Objectives v1.1: target dates + triage flag
-- Run via: https://supabase.com/dashboard/project/cmuvomnmaoseccxpeuxq/sql/new

alter table public.objectives
  add column if not exists due_date date,
  add column if not exists hard_deadline boolean not null default false,
  add column if not exists needs_sizing boolean not null default false;

-- index due_date for calendar-style queries
create index if not exists objectives_due_date_idx on public.objectives(user_id, due_date)
  where due_date is not null and state = 'active';

-- index needs_sizing for the triage queue
create index if not exists objectives_needs_sizing_idx on public.objectives(user_id)
  where needs_sizing = true and state = 'active';

-- Backfill: any existing row whose E/I are the defaults (2/2) gets flagged for sizing review.
-- David can clear by either confirming or re-rating in the triage panel.
update public.objectives
  set needs_sizing = true
  where effort = 2 and importance = 2 and state = 'active' and needs_sizing = false;
