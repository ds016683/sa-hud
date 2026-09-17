-- Lumen v3: one continuous thread across every channel, plus standing orders.
-- Run once in the Supabase SQL editor (project cmuvomnmaoseccxpeuxq).

create table if not exists lumen_messages (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  channel       text not null check (channel in ('whatsapp','sms','voice','pulse','hud')),
  direction     text not null check (direction in ('in','out')),
  kind          text not null default 'text' check (kind in ('text','audio','system')),
  body          text,                       -- text, or the transcript of audio
  media_url     text,                       -- audio we received or produced
  external_id   text,                       -- channel message id (dedupe)
  meta          jsonb not null default '{}'::jsonb
);
create index if not exists lumen_messages_at_idx on lumen_messages (at desc);
create unique index if not exists lumen_messages_external_idx on lumen_messages (channel, external_id) where external_id is not null;

-- Rolling memory: the brain writes a summary when the thread gets long.
create table if not exists lumen_memory (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  summary       text not null,
  through_id    bigint not null              -- last lumen_messages.id folded in
);

-- Standing orders: what David told Lumen to watch for and when to speak up.
create table if not exists standing_orders (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  text          text not null,
  cadence       text,                        -- 'daily' | 'weekly' | 'once' | free text the brain interprets
  next_at       timestamptz,
  active        boolean not null default true,
  last_fired_at timestamptz,
  meta          jsonb not null default '{}'::jsonb
);

alter table lumen_messages enable row level security;
alter table lumen_memory   enable row level security;
alter table standing_orders enable row level security;
-- Service role (the functions) bypasses RLS; David's session may read his thread in the HUD.
create policy if not exists "david reads lumen" on lumen_messages for select
  using (auth.uid() = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4');
create policy if not exists "david reads memory" on lumen_memory for select
  using (auth.uid() = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4');
create policy if not exists "david manages orders" on standing_orders for all
  using (auth.uid() = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4');
