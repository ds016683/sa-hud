# Slack Ingest & Reply — Lumen OS / SA-HUD

**Owner:** Mr. Pulse (Hostinger Docker, openclaw-0t8c-openclaw-1)
**Status:** Live since 2026-05-23
**Renders in:** SA-HUD Slack tab (https://ds016683.github.io/sa-hud/)

---

## Why this exists

Slack's native UX scatters messages across hundreds of channels and DMs. Activity view and threads make David miss important things, and Slack's auto-mark-read on visit destroys triage state. He needs:

- **One linear newest-first feed** of every Slack message he could see, regardless of channel/thread
- **Independent read-state** that doesn't get clobbered by Slack
- **Reply as David** (not as bot) so the Slack-side conversation stays clean
- **Click-to-open-in-Slack** for anything that needs threads/files/emoji

This pipeline does that. Slack stays the system of record; SA-HUD is a triage lens.

---

## Architecture

```
┌──────────────────────────┐                ┌──────────────────────┐
│ Slack workspace          │  user xoxp-    │ Mr. Pulse cron       │
│ (Third Horizon, T07F…)   │ ─────read──── ▶│ /data/.openclaw/     │
└──────────────────────────┘                │   workspace-mr-pulse │
                                            │   slack_ingest.py    │
                                            │   slack_outbox_send.py│
                                            │   slack_prune.py     │
                                            └──────────┬───────────┘
                                                       │ REST
                                                       ▼
                            ┌──────────────────────────────────────┐
                            │ Supabase cmuvomnmaoseccxpeuxq        │
                            │   public.slack_messages              │
                            │   public.slack_outbox                │
                            └──────────────────┬───────────────────┘
                                               │ anon JWT (authed)
                                               ▼
                            ┌──────────────────────────────────────┐
                            │ SA-HUD SlackPage.jsx                 │
                            │ https://ds016683.github.io/sa-hud/   │
                            │   filter pills, list, reply box      │
                            └──────────────────────────────────────┘
```

---

## Slack tokens

Stored in container at `/data/.openclaw/secrets/slack-lumen-th.env`:

| Var | Type | Used for |
| --- | --- | --- |
| `SLACK_APP_TOKEN_LUMEN_TH` | `xapp-` | Reserved (Socket Mode, not currently used) |
| `SLACK_BOT_TOKEN_LUMEN_TH` | `xoxb-` | Reserved (bot identity, not currently used for read) |
| `SLACK_USER_TOKEN_LUMEN_TH` | `xoxp-` | **All reads + reply sends** — sees every channel/DM David is in |

Slack app: **"Lumen"** in the Third Horizon workspace (T07FSNUTX18).
User scopes added on user token (David's identity, U07K3TB4RUK):
`identify, chat:write, channels:read, groups:read, im:read, mpim:read, channels:history, groups:history, im:history, mpim:history, users:read`.

If a scope error appears, add the scope at https://api.slack.com/apps → Lumen → OAuth & Permissions → User Token Scopes → Reinstall to Workspace. The token may rotate; if it does, update the env file.

---

## Database

### `public.slack_messages`

Columns of note:
- `slack_ts` — Slack's `1234.5678` timestamp string (primary natural key per channel)
- `ts` — `timestamptz` derived for ordering
- `channel_id`, `channel_name`, `channel_type` (`channel|group|im|mpim`)
- `user_id`, `user_name`, `user_real_name`
- `body_preview` (first ~280 chars), `body_full`
- `permalink` — Slack deep link for "open in Slack"
- `is_thread_reply`, `thread_ts`
- `has_mention` (bool: `<@U07K3TB4RUK>` present anywhere)
- **Triage state (independent of Slack):**
  - `read_at timestamptz` — David clicked Mark read in SA-HUD
  - `archived_at timestamptz` — done with it; hidden from main view
  - `replied_at timestamptz` — David replied via SA-HUD outbox
- `created_at`, `updated_at`

RLS enabled. Policies:
- `authed_read` — `select` for `authenticated` (any auth row)
- `authed_update` — `update` for `authenticated` (mark read / archive / replied)

Anon role gets nothing (verified empty 200).

### `public.slack_outbox`

Reply queue. SA-HUD inserts a row; Mr. Pulse cron picks `pending` rows, sends, marks `sent` or `failed`.

Columns: `channel_id`, `thread_ts`, `text`, `status` (`pending|sent|failed`), `slack_ts` (Slack's TS after send), `permalink`, `error`, `attempts`, timestamps.

RLS:
- `authed_outbox_select` — read your own outbox
- `authed_outbox_insert` — insert new replies
- (cron uses service_role to update rows)

---

## Cron jobs (all owned by Mr. Pulse)

In `/data/.openclaw/cron/jobs.json`:

| Name | Schedule | Script |
| --- | --- | --- |
| Mr. Pulse — Slack Ingest | `*/3 6-23 * * *` | `slack_ingest.sh` |
| Mr. Pulse — Slack Outbox Send | `* * * * *` | `slack_outbox_send.sh` |
| Mr. Pulse — Slack Prune (90d) | `30 3 * * *` | `slack_prune.sh` |

Each entry's `taskPrompt` directs Mr. Pulse to run the wrapper and report a single summary line back to his Discord channel `1500900718872236082`.

---

## Scripts

All in `/data/.openclaw/workspace-mr-pulse/`:

### `slack_ingest.py`
- Lists conversations via `users.conversations` with the user token (sees ~263 conversations in DH workspace as of launch)
- For each conversation, `conversations.history` since the last seen `ts` (or 7 days for first ingest)
- Resolves user_id → user_name via `users.info` with a per-run cache
- Fetches `chat.getPermalink` per message
- Detects `<@U07K3TB4RUK>` for `has_mention`
- UPSERT into `slack_messages` keyed on `(channel_id, slack_ts)`

Tunables (env): `SLACK_USER_ID_LUMEN_TH=U07K3TB4RUK`, `SLACK_INGEST_INITIAL_DAYS=7`.

### `slack_outbox_send.py`
- Selects `slack_outbox` rows where `status='pending'` ordered by `created_at`
- Posts each via `chat.postMessage` with the user token (so messages appear as David)
- On success: store returned `ts` and `permalink`, set `status='sent'`. Also writes a row into `slack_messages` so the reply shows up in your own feed immediately.
- On failure: increment `attempts`, store `error`, mark `failed` after 3 attempts

### `slack_prune.py`
- Deletes `slack_messages` older than 90 days **except** rows where `archived_at is not null` (those are kept)
- Logs deleted count

---

## SA-HUD UI (`src/components/SlackPage.jsx`)

- Filter pills: **All / Unread / Mentions / DMs / Channels / Files / Archived**
- Linear list, newest-first, by `ts desc`
- Each row: channel badge (with `#`/lock/`@`/people icon by type), user_real_name, relative time, body_preview, mention pill if present
- **Click row** → expand inline with full body + actions: **Mark read** · **Reply** · **Archive** · **Open in Slack**
- Reply box: textarea + Send button. Inserts into `slack_outbox`. Status pill updates when cron processes it.
- Auto-poll every 30s while tab is active; manual refresh button always works.

Voice: blunt, decisive, no apologies.

---

## Operations

### Restart the ingest

```bash
ssh root@100.85.161.78
docker exec -it openclaw-0t8c-openclaw-1 bash
cd /data/.openclaw/workspace-mr-pulse
bash slack_ingest.sh    # one-shot run; same script the cron calls
```

### Tail the logs

```bash
docker exec openclaw-0t8c-openclaw-1 tail -f /data/.openclaw/workspace-mr-pulse/logs/slack_ingest.log
```

### Force a re-ingest from scratch

Don't truncate the table — RLS triggers + history matter. Instead, set `since_ts=null` for a channel by deleting its highest watermark, or just let the next run pick up from the last `ts` in `slack_messages` per channel.

### Add a new Slack workspace

1. Create a new Slack app + user token in that workspace
2. Drop env vars in a NEW env file (e.g. `slack-clientcorp.env`)
3. Add a workspace-id column or duplicate scripts; the simplest first cut is per-workspace duplicate scripts. Cross that bridge when David asks.

---

## Pitfalls already burned

1. **Bot token's `users.conversations` only sees bot-relevant channels** (15 in our case). User token is required to see David's actual inbox (~263).
2. **Supabase Management API rejects normal curl** (Cloudflare WAF UA block). Use `apply_ddl.py` which sets a User-Agent header.
3. **`alter table … enable row level security` only takes effect if it's the LAST statement in the DDL request**, otherwise PostgREST returns just the first result and silently swallows the rest. We split RLS into its own SQL file.
4. **Slack auto-marks-read on read API calls?** No. `conversations.history` does NOT mutate read state. Verified.
5. **Replying as bot vs user.** `chat.postMessage` with `xoxb-` posts as the bot; with `xoxp-` it posts as David. We use `xoxp-` so threads stay clean.
6. **Vite warning about `react-simple-maps`** is unrelated; ensure `npm install` ran after the Relationships v4 commit.

---

## File map

```
/data/.openclaw/workspace-mr-pulse/
  slack_ingest.py
  slack_ingest.sh
  slack_outbox_send.py
  slack_outbox_send.sh
  slack_prune.py
  slack_prune.sh
  logs/
    slack_ingest.log
    slack_outbox_send.log
    slack_prune.log

/data/.openclaw/secrets/
  slack-lumen-th.env      (app + bot + user tokens)
  supabase-sa-hud.env     (URL + anon + service_role)
  supabase-hermes.env     (Management API token, for DDL only)

/home/david/sa-hud/src/components/SlackPage.jsx
/home/david/sa-hud/src/App.jsx (wiring + nav entry)

Supabase project cmuvomnmaoseccxpeuxq:
  public.slack_messages
  public.slack_outbox
```

---

## Future hooks (not built yet)

- Files: `body_full` already includes file links, but a dedicated Files filter could query `body_full LIKE '%files.slack.com%'`
- AI summary of unreads per channel (Mr. Pulse can produce this on a separate cron)
- Push-via-webhook ingest (replace polling) if 3-min latency starts mattering
- Multi-workspace support (per-workspace env file + workspace_id column)

---

*Last updated: 2026-05-23. Author: Hermes, on David's bench.*
