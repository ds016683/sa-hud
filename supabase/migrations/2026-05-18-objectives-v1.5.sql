-- v1.5 — Objective Card upgrades
-- Description (optional context), notes (prompts/links),
-- stakeholder (who's waiting on me), follow_up_date (for delegated items)

alter table public.objectives add column if not exists description     text;
alter table public.objectives add column if not exists notes           text;
alter table public.objectives add column if not exists stakeholder     text;
alter table public.objectives add column if not exists follow_up_date  date;

create index if not exists objectives_stakeholder_idx
  on public.objectives(user_id, stakeholder)
  where stakeholder is not null;

create index if not exists objectives_followup_idx
  on public.objectives(user_id, follow_up_date)
  where follow_up_date is not null;
