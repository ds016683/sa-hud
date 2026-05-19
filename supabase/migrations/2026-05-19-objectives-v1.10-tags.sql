-- v1.10: tags on objectives
-- Two implicit groups (validated client-side, stored as flat array):
--   Scope:  Personal · Third Horizon
--   Domain: Client · Business Development · Finance · Administrative · Content · Tooling
-- Multi-select per group. Stored as text[] for flexibility.

alter table public.objectives
  add column if not exists tags text[] not null default '{}';

create index if not exists objectives_tags_idx
  on public.objectives using gin (tags);
