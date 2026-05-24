-- v1.11: container states — add `waiting` and `inbox` to the state enum
--
-- New states (semantics):
--   waiting : task is yours but blocked on someone else's action (explicit, not derived)
--   inbox   : raw capture (mr-pulse, voice, future intake). User must sort/route from here.
--
-- Existing states unchanged:
--   active   : on the board, working it
--   parked   : queue / not now, not abandoned
--   released : closed (done) — pull-back via reopen
--   foreman  : delegated to a foreman (released, with `who`)
--
-- The CHECK constraint on `state` is recreated; named constraints from v1 were anonymous
-- so we drop the most likely default name then any anonymous matching, and re-add named.

alter table public.objectives
  drop constraint if exists objectives_state_check;

-- Recreate with broader allowed set
alter table public.objectives
  add constraint objectives_state_check
  check (state in ('active','parked','released','foreman','waiting','inbox'));

-- Useful partial indexes for the new containers
create index if not exists objectives_user_waiting_idx
  on public.objectives (user_id, due_date nulls last, importance desc, weight desc)
  where state = 'waiting' and deleted_at is null;

create index if not exists objectives_user_inbox_idx
  on public.objectives (user_id, captured_at desc)
  where state = 'inbox' and deleted_at is null;
