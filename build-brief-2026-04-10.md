# Build Brief: SA HUD — Major Overhaul
**Date:** 2026-04-10
**Repo:** `ds016683/sa-hud`
**Priority:** High
**Prepared by:** Mr. Build

---

## Context

Six tasks. Read each carefully before touching any file. Read the existing components first — `EcosystemPage.jsx`, `DailyBriefingsPage.jsx`, `IdeasPage.jsx`, `PortfolioPage.jsx` — to understand patterns before writing anything.

---

## Task 1 — Daily Briefings: Match header/aesthetic to other pages

**File:** `src/components/DailyBriefingsPage.jsx`

Open `IdeasPage.jsx` and `PortfolioPage.jsx`. Look at how they do their page headers — the title treatment, the section containers, background colors, card styles. DailyBriefingsPage should match that aesthetic exactly. Right now it has its own divergent header style. Normalize it to match the rest of the app.

Do not change any data fetching logic or Supabase queries — only the visual/layout layer.

---

## Task 2 — Call notes: Show Granola summary text verbatim

**File:** `src/components/DailyBriefingsPage.jsx`

Call notes are stored in Supabase `briefings` table with `type = 'call_note'`. The `briefing_text` column contains a JSON string. That JSON has a `prose` field (or `summary_text` equivalent from Granola) and sometimes a `bullets` array.

Current behavior: the component may be trimming or reformatting the content.

Required behavior:
- Parse `briefing_text` as JSON
- If it has a `prose` field, render it verbatim (no truncation, no reformatting)
- If it has a `summary_markdown` field instead, render that (use a simple markdown renderer or just render as pre-formatted text)
- If it has a `bullets` array, render as a clean bullet list
- Title should come from the JSON's `title` field
- Time/attendees should display if present
- Keep the existing card/accordion expand pattern if one exists — just fix what renders inside

---

## Task 3 — Ecosystem Page: Fix and rebuild Connections Map

**File:** `src/components/EcosystemPage.jsx`

### 3a — Remove weird text at top
There is stray text rendering at the top of the Ecosystem page. Find it and remove it. It's likely a dangling string or debug output above the tab container.

### 3b — Rebuild the Connections Map as true hub-and-spoke with sub-categories

The current Connections Map needs to be a proper hierarchical network, not a flat list of nodes. The architecture:

**Top level (center):** Lumen

**Second level (category hubs)** — these are clickable group nodes that expand/collapse their children:
- AI Agents
- Communication Tools
- Data & Analytics
- Deployed Apps
- Development Infrastructure

**Third level (leaf nodes)** — actual tools/services, connected to their category hub:

AI Agents: Mr. Brief, Mr. Scout, Mr. Draft, Mr. Watch, Mr. Build, Mr. Pulse, Mr. Diablo, Mr. Deck
Communication Tools: Signal, WhatsApp, Discord, Slack, Gmail, Outlook/Calendar, Vapi (voice)
Data & Analytics: Supabase (SA HUD), Supabase (main), Granola, Harvest, Notion, OpenRouter
Deployed Apps: sa-hud (GitHub Pages), project-diablo (Vercel), nacdd-knowledge-platform (Vercel), lumen-api (PM2/DavidPC), aha-cardiovascular-index (GitHub Pages), bh-rate-intelligence (Vercel)
Development Infrastructure: GitHub (ds016683), DavidPC (gateway), Mac M5 (node), Tailscale, Claude Code

**Interaction model:**
- Click a category hub: highlights all its children, shows a summary panel
- Click a leaf node: opens a detail side panel (matching the existing NodePanel pattern) with full info
- Lines from Lumen to category hubs; lines from category hubs to their children
- Category hub nodes: larger, distinct color, label only
- Leaf nodes: smaller, colored by category

**Leaf node detail panel fields** (show whatever is known, skip what isn't):
- Name
- Category
- Description / what it does
- Status (active / planned / deprecated)
- Date implemented (hardcode from TOOLS.md / memory where known)
- Key data / config notes
- Connected to (list other nodes it connects to)
- Link (if applicable)

Hardcode the node data — it doesn't change often and hardcoding keeps it fast. Use the data from `memory/github-map.md` and `TOOLS.md` for the deployed apps and infrastructure nodes.

---

## Task 4 — Agent Org Chart: Full detail from source of truth

**File:** `src/components/EcosystemPage.jsx` — the `AgentOrgChart` component built yesterday

The org chart built yesterday has hardcoded agent data. That's fine for now, but expand the detail panel to show EVERYTHING:

When you click an agent card, the side panel should show:
- Agent name + emoji
- Role (one-liner)
- Model (exact model ID e.g. `anthropic/claude-sonnet-4-6`)
- Discord channel + channel ID
- Status badge
- Full description (paragraph)
- Capabilities list
- **System prompt / rules summary** — add a "Rules" section that shows the key behavioral rules for each agent. Source this from AGENTS.md in the workspace. Each agent has a personality description there — use it verbatim.

For Lumen specifically, also note: routes to specialists, maintains memory, loads northstar skill each session.

The AGENTS.md data to use (copy verbatim into the component's data object):

Lumen: "Hub agent. Warm, direct, witty. Knows David's full context. Makes judgment calls. Routes when the task is clearly a specialist job. Never loses the conversational thread. Loads: HARDLINES.md, SOUL.md, USER.md, northstar skill, daily memory files."

Mr. Brief: "Methodical and thorough. Pre-call research specialist. Reads Slack DMs, emails, Granola notes. Never sends David into a meeting cold."

Mr. Scout: "Curious and relentless. Research engine. Finds the connection chain, the background, the context David doesn't have time to dig for himself. Runs on Kimi K2 (1T param model)."

Mr. Draft: "Clean and efficient. Output-focused. Speaks in David's voice when drafting (but never signs as David). Tea Leaves content understands the publication's tone."

Mr. Watch: "Quiet and vigilant. Works in the background. Escalates only when something actually needs attention. Does not cry wolf. Runs hourly heartbeat."

Mr. Build: "Technical and precise. Handles workspace engineering and code. Quick scripts and automation run directly. Complex multi-file work handed to Claude Code via SSH to Mac M5."

Mr. Pulse: "Analytical and concise. Starset data, portfolio metrics, Supabase queries. Returns structured answers."

Mr. Diablo: "Dedicated engineering agent for Project Diablo. Discusses architecture, stages build briefs at workspace/tmp/ for Claude Code handoff."

Mr. Deck: "Visual and executive-polish minded. PowerPoint decks, TH-branded slides. Knows the brand palette: darkBlue #1A3A5C, mediumBlue #234D8B, gold #F8C762."

---

## Task 5 — Deployed Sites: Full GitHub map with architecture detail

**File:** `src/components/EcosystemPage.jsx` — replace the `DeployedSitesTab` component

Replace the simple card grid with a richer version using this exact data (from `memory/github-map.md`):

```js
const DEPLOYED_SITES = [
  {
    name: 'Sovereign Architect HUD',
    repo: 'ds016683/sa-hud',
    url: 'https://ds016683.github.io/sa-hud/',
    status: 'active',
    visibility: 'public',
    hosting: 'GitHub Pages',
    deploy: 'npm run deploy (gh-pages)',
    stack: 'React / Vite',
    dataStorage: 'Supabase (cmuvomnmaoseccxpeuxq) — briefings, projects, ideas, todos',
    description: 'Daily intelligence dashboard. Morning briefings, call notes, portfolio tracking, agent ecosystem map.',
    lastDeployed: '2026-04-10',
    notes: 'Primary HUD. Mr. Build deploys via SSH to Mac M5.'
  },
  {
    name: 'Project Diablo',
    repo: 'ds016683/project-diablo',
    url: 'https://project-diablo.vercel.app',
    status: 'active',
    visibility: 'private',
    hosting: 'Vercel',
    deploy: 'git push → Vercel auto-deploy',
    stack: 'React / Vite',
    dataStorage: 'TBD',
    description: 'Commercializing the Sovereign Architect framework. Assessment + personality profiling app.',
    lastDeployed: '2026-04-07',
    notes: 'Private beta May-June 2026. Mr. Diablo handles engineering.'
  },
  {
    name: 'NACDD Knowledge Platform',
    repo: 'ds016683/nacdd-knowledge-platform',
    url: 'https://nacdd-knowledge-platform.vercel.app',
    status: 'active',
    visibility: 'private',
    hosting: 'Vercel',
    deploy: 'git push → Vercel auto-deploy',
    stack: 'Unknown',
    dataStorage: 'Unknown',
    description: 'AI-powered knowledge platform demo/sandbox for NACDD client.',
    lastDeployed: '2026-04-06',
    notes: 'Client-facing demo.'
  },
  {
    name: 'Lumen API',
    repo: 'ds016683/lumen-api',
    url: null,
    status: 'active',
    visibility: 'private',
    hosting: 'PM2 on DavidPC',
    deploy: 'PM2 process manager (ecosystem.config.cjs)',
    stack: 'Node.js / Express',
    dataStorage: 'None (stateless webhook handler)',
    description: 'Vapi webhook backend. Gives Lumen voice calls access to David\'s context and tools.',
    lastDeployed: '2026-04-10',
    notes: 'Runs on DavidPC at home office. Vapi assistant ID: 62dd6701. Phone: +16308691113.'
  },
  {
    name: 'AHA Cardiovascular Index',
    repo: 'ds016683/aha-cardiovascular-index',
    url: 'https://ds016683.github.io/aha-cardiovascular-index/',
    status: 'active',
    visibility: 'public',
    hosting: 'GitHub Pages',
    deploy: 'GitHub Pages',
    stack: 'Unknown',
    dataStorage: 'None (static)',
    description: 'AHA Cardiovascular Prevention Index — evidence-based guideline implementation tracker.',
    lastDeployed: '2026-04-06',
    notes: ''
  },
  {
    name: 'BH Rate Intelligence',
    repo: 'ds016683/bh-rate-intelligence',
    url: null,
    status: 'active',
    visibility: 'private',
    hosting: 'Vercel',
    deploy: 'git push → Vercel auto-deploy',
    stack: 'Unknown',
    dataStorage: 'Unknown',
    description: 'Behavioral health rate analytics platform for THS internal use.',
    lastDeployed: '2026-03-29',
    notes: 'No public URL configured in GitHub.'
  },
  {
    name: 'Project Dante',
    repo: 'ds016683/project-dante',
    url: 'https://ds016683.github.io/project-dante/',
    status: 'active',
    visibility: 'public',
    hosting: 'GitHub Pages',
    deploy: 'GitHub Pages',
    stack: 'Unknown',
    dataStorage: 'None (static)',
    description: 'Sovereign Architect book + product collaboration (David Smith + Sabina Beachdell).',
    lastDeployed: '2026-04-02',
    notes: ''
  },
  {
    name: 'Project Heart',
    repo: 'ds016683/project-heart',
    url: null,
    status: 'deprecated',
    visibility: 'private',
    hosting: 'None',
    deploy: 'None',
    stack: 'Unknown',
    dataStorage: 'Unknown',
    description: 'THS x AHA Cardiovascular Transparency Dashboard. Flagged for deletion.',
    lastDeployed: '2026-03-23',
    notes: 'Premature — flagged to delete.'
  }
]
```

**Card design:**
- Status badge (active = green, deprecated = red/muted)
- Visibility badge (public/private)
- Name + description
- Stack + hosting chips
- "Open App" button if `url` exists
- Click card → side panel showing all fields: repo, deploy method, stack, data storage, last deployed, notes

---

## Task 6 — Cost Dashboard: Assessment + wiring plan

**File:** `src/components/EcosystemPage.jsx` — the Cost Dashboard tab

**First:** Read the existing Cost Dashboard tab code carefully and understand what it's trying to do.

**Current state assessment to include in a comment at the top of the CostDashboard component:**
- What data it's currently reading (Supabase? hardcoded?)
- What it's displaying
- What's broken or missing

**Then implement the following:**

The `cost_tracking` table does NOT exist in Supabase yet — we need to create it. Add a SQL migration comment block at the top of the file:

```sql
-- MIGRATION NEEDED (run in Supabase SQL editor):
-- CREATE TABLE cost_tracking (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   created_at timestamptz DEFAULT now(),
--   model text NOT NULL,
--   provider text NOT NULL,
--   agent text,
--   task_type text,
--   input_tokens integer,
--   output_tokens integer,
--   cost_usd numeric(10,6),
--   session_id text,
--   channel text
-- );
```

**UI for Cost Dashboard** — build this even before the table exists (show empty state gracefully):

Layout:
- Top row: 3 stat cards — "Today's Cost", "This Week", "Top Model Today"
- Chart area: bar chart or simple table showing cost by model for the last 7 days (use recharts if already in the project, otherwise a simple table is fine)
- Bottom: "Recent API Calls" table — columns: Time, Agent, Model, Task Type, Tokens In, Tokens Out, Cost
- Auto-refreshes every 15 minutes (useEffect with setInterval)
- If no data: show a clean empty state with the migration SQL in a copyable code block so David knows what to run

**Note on OpenRouter:** OpenRouter has a `/api/v1/generation` endpoint and activity logs. In a future pass, we can pull cost data directly from OpenRouter API instead of relying on agents to write to Supabase. For now, agents write to cost_tracking on each LLM call. Document this in a comment.

---

## Implementation Order

1. Task 1 (Daily Briefings header) — quickest, do first
2. Task 2 (Call notes verbatim) — fix the data rendering
3. Task 3a (Remove stray text) — one-line fix
4. Task 5 (Deployed Sites) — replace with rich data component
5. Task 4 (Agent org chart detail expansion) — add rules/full detail
6. Task 3b (Connections Map rebuild) — largest task, do last
7. Task 6 (Cost Dashboard) — assessment + new UI

## After all tasks

Run `npm run lint`. Report results. Do NOT run `npm run deploy` — Mr. Build will handle deployment after review.

---

## Key constraints

- THS_COLORS object is already defined — use it
- Do not touch any Supabase query logic except in Task 2 (call note rendering)
- Do not change routing, Nav, or auth logic
- Keep all new components co-located in their existing files
- The dark fantasy / game-panel aesthetic is intentional — match it
