# Ask: read-only endpoints on th-tools for the platform registry

**To:** Topher
**From:** David
**Size of ask:** small — two GET routes, read-only, same auth pattern you already run.

## What I want

My HUD's Ecosystem surface now mirrors the th-tools platform registry as its
source of truth. Today it runs on the committed snapshot (registry.ts +
migration 078), which is May-era. To make it live I need two reads:

1. `GET /api/platforms` — the registry rows (id, name, type, url,
   steward_email, users, github, vercel, supabase, created_at, retirement_at,
   notes, plus the governance fields: lane, contract_status, build_class,
   duration, obligation_owner_email). You already froze the POST contract for
   the provisioner; this is its read twin.
2. `GET /api/inventory` — `inventory_entities` (id, kind, source, name, url,
   repo_link, visibility, in_org, registered_platform_id, last_activity,
   first_seen, last_seen, disappeared_at) and the latest `inventory_runs` row.

## Auth

Whatever you prefer: the existing cron-secret bearer pattern
(`verifyCronSecret`) with a dedicated read token works fine. Happy to be
scoped read-only and rate-limited; server-to-server only.

## Why

- One registry, everywhere: my HUD stops carrying a second curated copy that
  drifts (it already caught one drift: the registry's
  `Third-Horizon-Strategies/pomegranate` repo 404s).
- My personal tools get registered in th-tools (`build_class:
  'personal_tool'`) instead of living in a side file.
- The HUD renders your derived-state and NULL-means-triage semantics
  faithfully; no writes, ever.

## Non-goals

No writes from the HUD. No new tables. No schema changes. If exposing
inventory is heavier than expected, `GET /api/platforms` alone unblocks 80%.
