-- Meeting sessions: David's layer on top of a calendar event. Timer to
-- Harvest, the Granola notes that belong to it, and his close-out
-- (follow-ups, special notes). One row per calendar event.
create table if not exists meeting_sessions (
  id bigserial primary key,
  event_id text not null unique,
  day date not null,
  subject text,
  started_at timestamptz,
  stopped_at timestamptz,
  hours numeric(6,2),
  harvest_logged boolean default false,
  notes_meeting_id text,
  notes_summary text,
  follow_ups jsonb default '[]'::jsonb,
  special_notes text,
  closed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists meeting_sessions_day on meeting_sessions (day);
alter table meeting_sessions enable row level security;
create policy "owner all" on meeting_sessions for all to authenticated using (true) with check (true);

-- 9/24 later: attendance stamp (set by the Agenda timer, close-out, or Lumen)
alter table meeting_sessions add column if not exists attended_at timestamptz;

-- 9/25: Lumen touches the agenda from notes, once per meeting
alter table meeting_sessions add column if not exists agenda_touched_at timestamptz;
