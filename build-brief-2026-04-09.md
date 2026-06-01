# Build Brief: SA HUD — Agent Org Chart + Use Instructions
**Date:** 2026-04-09  
**Repo:** `ds016683/sa-hud`  
**File:** `src/components/EcosystemPage.jsx`  
**Priority:** Medium — no deadline  
**Prepared by:** Claude Code (workspace session)

---

## Context

The SA HUD Ecosystem page (`src/components/EcosystemPage.jsx`) already has a full tab system with four tabs:
- "Connections Map" — working SVG network graph
- "Agent Org Chart" — **currently "Coming soon"**
- "Deployed Sites" — **currently "Coming soon"**
- "Cost Dashboard" — working Supabase cost tracker

This brief covers two tasks: filling in the **Agent Org Chart** tab and adding a **Use Instructions** tab.

---

## Task 1: Agent Org Chart

Replace the current "Coming soon" placeholder in the `activeTab === 'org'` block with a proper `AgentOrgChart` component.

### Visual Design

Render as a proper org chart tree:
- **Lumen** at the top as hub node (gold accent, larger card)
- Eight Mr. agents below as spoke nodes in two rows of four
- Connecting lines from Lumen to each agent
- Each agent card shows: name, role one-liner, model, Discord channel ID, status badge (active/planned)
- Click to expand: shows capabilities list and longer description

### Agent Data (hardcode this — source of truth)

```js
const AGENTS = [
  {
    id: 'lumen',
    name: 'Lumen',
    role: 'Orchestrator & primary interface',
    model: 'claude-sonnet-4-6',
    channel: '#lumen',
    channelId: '1491935770280333362',
    status: 'active',
    color: '#F59E0B',
    description: 'Hub agent. Routes tasks, makes judgment calls, maintains full context. Warm, direct, witty.',
    capabilities: ['routing', 'orchestration', 'full-context reasoning', 'memory access', 'specialist delegation']
  },
  {
    id: 'mr-brief',
    name: 'Mr. Brief',
    role: 'Meeting prep & pre-call research',
    model: 'claude-sonnet-4-6',
    channel: '#mr-brief',
    channelId: '1491935829331939429',
    status: 'active',
    color: '#2D9CDB',
    description: 'David never walks into a meeting cold. Reads Slack DMs, emails, and Granola notes to synthesize context.',
    capabilities: ['pre-call research', 'attendee background', 'briefing generation', 'email thread context']
  },
  {
    id: 'mr-scout',
    name: 'Mr. Scout',
    role: 'Deep research & intelligence',
    model: 'kimi-k2 (1T)',
    channel: '#mr-scout',
    channelId: '1491935858595598466',
    status: 'active',
    color: '#6FCF97',
    description: 'Curious and relentless. Investigates people, orgs, policy, markets. Runs on Kimi K2.',
    capabilities: ['people research', 'org background', 'policy analysis', 'competitive intelligence', 'web research']
  },
  {
    id: 'mr-draft',
    name: 'Mr. Draft',
    role: 'Writing & content creation',
    model: 'claude-sonnet-4-6',
    channel: '#mr-draft',
    channelId: '1491935895496949912',
    status: 'active',
    color: '#BB6BD9',
    description: "Writes in David's voice. Email drafts, documents, proposals, Tea Leaves content. Never sounds corporate.",
    capabilities: ['email drafting', 'document writing', 'Tea Leaves content', 'proposals', 'editing']
  },
  {
    id: 'mr-watch',
    name: 'Mr. Watch',
    role: 'Email triage & monitoring',
    model: 'gpt-4o-mini',
    channel: '#mr-watch',
    channelId: '1491935946416062525',
    status: 'active',
    color: '#EB5757',
    description: 'Quiet and vigilant. Monitors inbox, calendar, Granola. Escalates only what matters. Runs hourly.',
    capabilities: ['email triage', 'calendar monitoring', 'Granola routing', 'heartbeat execution']
  },
  {
    id: 'mr-build',
    name: 'Mr. Build',
    role: 'Code, scripts & automation',
    model: 'claude-sonnet-4-6',
    channel: '#mr-build',
    channelId: '1491936071880019968',
    status: 'active',
    color: '#F2994A',
    description: 'Technical and precise. Handles workspace engineering. Spawns Claude Code for complex dev work.',
    capabilities: ['scripting', 'automation', 'Node.js', 'API integration', 'Claude Code subprocess spawning']
  },
  {
    id: 'mr-pulse',
    name: 'Mr. Pulse',
    role: 'Data queries & analytics',
    model: 'claude-sonnet-4-6',
    channel: '#mr-pulse',
    channelId: '1491936114905317499',
    status: 'active',
    color: '#56CCF2',
    description: 'Analytical and concise. Starset data, portfolio metrics, Supabase queries. Returns structured answers.',
    capabilities: ['Supabase queries', 'portfolio metrics', 'Starset analytics', 'cost tracking', 'reporting']
  },
  {
    id: 'mr-diablo',
    name: 'Mr. Diablo',
    role: 'Project Diablo engineering',
    model: 'claude-sonnet-4-6',
    channel: '#mr-diablo',
    channelId: '1491977511536431104',
    status: 'active',
    color: '#FF4444',
    description: 'Dedicated engineering agent for Project Diablo (React/Vite/Vercel). Discusses architecture, stages build briefs for Claude Code.',
    capabilities: ['React/Vite development', 'architecture decisions', 'build brief staging', 'Claude Code handoff']
  },
  {
    id: 'mr-deck',
    name: 'Mr. Deck',
    role: 'Decks & presentations',
    model: 'claude-sonnet-4-6',
    channel: '#mr-deck',
    channelId: '1491936969108885615',
    status: 'planned',
    color: '#1A3A5C',
    description: 'Visual and executive-polish minded. PowerPoint decks, TH-branded slides. Knows the brand palette.',
    capabilities: ['PPTX creation', 'TH brand application', 'executive decks', 'narrative arc design']
  },
]
```

### Layout Guidance

- Use the existing `THS_COLORS` object (`darkBlue`, `mediumBlue`, `gold`) for consistency
- Lumen card: larger, center-top, gold border, `isCenter: true` style
- Row 1: Mr. Brief, Mr. Scout, Mr. Draft, Mr. Watch
- Row 2: Mr. Build, Mr. Pulse, Mr. Diablo, Mr. Deck
- Lines: thin SVG lines from Lumen card down to each agent card, using the agent's color
- "planned" agents: slightly muted opacity (0.6), dashed border
- Keep the dark fantasy / game-panel aesthetic matching the rest of the app

### Expanded Card (on click)

Show in a side panel (same pattern as the network map's `NodePanel`) with:
- Agent name + role
- Model
- Discord channel (as a copyable `#channel-name`)  
- Status badge
- Description
- Capabilities list

---

## Task 2: Add "Use Instructions" Tab

Add a 5th tab `{ id: 'instructions', label: 'How to Use' }` to the tabs array.

### Content: How to Use the Agent Network

Build a clean reference component `UseInstructionsTab` with the following sections:

#### Section 1: The Routing Map
A clean table/card layout showing: "When I need X → Message Y"

| Need | Go to | Example |
|---|---|---|
| Anything uncertain | #lumen | "What should I do about..." |
| Meeting prep | #mr-brief | "Brief me on [name] before my 2pm" |
| Research | #mr-scout | "Deep background on [org/person]" |
| Writing | #mr-draft | "Draft a response to [email]" |
| Inbox check | #mr-watch | "What's in my inbox?" |
| Scripts / automation | #mr-build | "Write a script that..." |
| Starset / data | #mr-pulse | "Query the last 30 days of..." |
| Project Diablo | #mr-diablo | "I want to add a feature that..." |
| Deck / slides | #mr-deck | "Build a deck for [meeting]" |

#### Section 2: Power Moves
Bullet list of high-value workflows:
- **Pre-meeting brief:** "Brief me on [name] for my [time] call" → Mr. Brief reads email history, Slack DMs, Granola notes, returns context doc
- **Research chain:** "Background on [org]" → Mr. Scout digs for 10-15 min, returns structured intelligence
- **Email draft:** "Draft a response to [person]'s email about [topic]" → Mr. Draft returns ready-to-send copy in David's voice
- **Build handoff:** Ask Mr. Diablo for any Diablo feature → he stages a brief at workspace/tmp/ → you open Claude Code and it's waiting
- **Morning brief:** Delivered automatically by Mr. Watch around 7am PT in #mr-brief
- **Cost check:** "What did I spend on AI this week?" → Mr. Pulse hits Supabase cost_tracking table

#### Section 3: Memory & Continuity
Short callout: agents wake up fresh each session but read from workspace/memory/ files. If something important happens, say "write this to memory" and the agent will persist it to workspace/memory/YYYY-MM-DD.md.

#### Section 4: Quick Keyboard / Usage Tips
- No @ mentions required — just talk in the channel
- Short = fast response; long = thorough response  
- "Don't tell me, just do it" → skips confirmation step
- Prefix with "draft:" to get output without it being sent
- Mr. Scout is the expensive one (Kimi K2) — use it for real research, not quick lookups

---

## Task 3: Fill in "Deployed Sites" Tab

While you're in the file, replace the "Deployed Sites" stub with a proper component `DeployedSitesTab`. Extract the deployed apps from the existing `NODES` array in the file (filter where `category === 'apps'` and `url` exists) and render as clean cards showing: name, subtitle, stack, status, and "Open App" link button.

This should take 15-20 lines — just a filtered grid of the existing data.

---

## Implementation Notes

- **Do not change** the existing `CATEGORIES`, `NODES`, `buildLayout`, `EcoNode`, or `NodePanel` functions — they power the working Connections Map and shouldn't be touched
- Keep all new components co-located in the same file (it's already a long single-file component, that's the pattern)
- The `THS_COLORS` object is already defined at line ~180 of the file — use it
- Run `npm run lint` before committing
- Deploy: `npm run deploy` (builds + pushes to GitHub Pages via gh-pages)

---

## Prompt to use with Claude Code

Open Claude Code in the cloned `sa-hud` repo and paste this:

```
Read workspace/tmp/build-brief-2026-04-09.md. Then read src/components/EcosystemPage.jsx to understand the existing patterns.

Build the three tasks in the brief:
1. Agent Org Chart tab (replace "Coming soon" placeholder)
2. Use Instructions tab (new 5th tab "How to Use")  
3. Deployed Sites tab (replace "Coming soon" placeholder — quick, just filter existing NODES data)

Match the existing styling patterns exactly. Don't touch the Connections Map or Cost Dashboard code. When done, run npm run lint and tell me if it's clean before I deploy.
```
