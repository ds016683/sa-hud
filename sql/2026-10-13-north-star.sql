-- The North Star (David, 10/12): one line on every Side Mission, written at
-- capture: "What Will Be True, That Wasn't True Before". Main Missions carry
-- theirs in projects.description. Run once in the Supabase SQL editor.
alter table public.objectives add column if not exists north_star text;
