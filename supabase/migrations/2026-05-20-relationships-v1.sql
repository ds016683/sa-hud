-- v1: Relationships mini-CRM
-- Two tables:
--   relationships  — one row per person (deduped by primary_email or normalized name)
--   interactions   — append-only event log (email, meeting, text, call, linkedin)
-- Source-of-truth: backfilled from Graph metadata + LinkedIn CSV + iMessage (later)
-- Privacy: NO email bodies, NO text bodies — metadata only (from/to/subject/date)

create extension if not exists pg_trgm;

create table if not exists public.relationships (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  primary_email   text,
  emails          text[] not null default '{}',
  phones          text[] not null default '{}',
  company         text,
  title           text,
  city            text,
  region          text,
  country         text,
  linkedin_url    text,
  notes           text,
  tags            text[] not null default '{}',
  sources         text[] not null default '{}',   -- ['graph','linkedin_csv','imessage','manual']
  last_contact_at timestamptz,
  contact_count   int not null default 0,
  inbound_count   int not null default 0,
  outbound_count  int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists relationships_primary_email_uidx
  on public.relationships (lower(primary_email))
  where primary_email is not null;

create index if not exists relationships_emails_gin
  on public.relationships using gin (emails);

create index if not exists relationships_full_name_trgm
  on public.relationships using gin (full_name gin_trgm_ops);

create index if not exists relationships_company_idx
  on public.relationships (company);

create index if not exists relationships_city_idx
  on public.relationships (city);

create table if not exists public.interactions (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.relationships(id) on delete cascade,
  kind            text not null check (kind in ('email','meeting','text','call','linkedin','manual')),
  direction       text check (direction in ('in','out','both')),
  occurred_at     timestamptz not null,
  subject         text,
  source          text not null,         -- 'graph','outlook_calendar','imessage','linkedin_csv','manual'
  source_ref      text,                  -- Graph message id, calendar event id, imessage guid, etc.
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create unique index if not exists interactions_source_ref_uidx
  on public.interactions (source, source_ref)
  where source_ref is not null;

create index if not exists interactions_relationship_id_idx
  on public.interactions (relationship_id, occurred_at desc);

create index if not exists interactions_occurred_at_idx
  on public.interactions (occurred_at desc);

create index if not exists interactions_kind_idx
  on public.interactions (kind);

-- Trigger: keep relationships.last_contact_at + counts in sync
create or replace function public.refresh_relationship_rollup()
returns trigger language plpgsql as $$
begin
  update public.relationships r
  set
    last_contact_at = sub.max_at,
    contact_count   = sub.total,
    inbound_count   = sub.inbound,
    outbound_count  = sub.outbound,
    updated_at      = now()
  from (
    select
      relationship_id,
      max(occurred_at) as max_at,
      count(*) as total,
      count(*) filter (where direction = 'in')  as inbound,
      count(*) filter (where direction = 'out') as outbound
    from public.interactions
    where relationship_id = coalesce(new.relationship_id, old.relationship_id)
    group by relationship_id
  ) sub
  where r.id = sub.relationship_id;
  return null;
end$$;

drop trigger if exists interactions_rollup_trg on public.interactions;
create trigger interactions_rollup_trg
  after insert or update or delete on public.interactions
  for each row execute function public.refresh_relationship_rollup();

-- RLS — leave open for now since SA-HUD uses service_role from the app
alter table public.relationships disable row level security;
alter table public.interactions  disable row level security;

comment on table public.relationships is 'People David interacts with. Metadata-only — no email bodies, no text bodies.';
comment on table public.interactions  is 'Append-only event log of contacts (email/meeting/text/call/linkedin). Body NEVER stored.';
