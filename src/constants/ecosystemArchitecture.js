// David's Architecture — the platform tree rendered by EcosystemPage.
// Generated 2026-08-17 from a live sweep of ds016683 + Third-Horizon-Strategies
// (GitHub API: metadata, collaborators, commits) merged with curated facts.
// TBD markers are honest unknowns — the derived-health system surfaces them
// as attention (yellow) until resolved. Regenerate or hand-edit freely.
// NOTE: this repo is public — no secrets, gate codes, or personal emails here.
// Reconciled 2026-08-17 against th-tools (source of truth): registry.ts +
// migration 078 seed (5 rows: achp, promise, pomegranate-market, mma-tracker,
// pipeline-rebuild). th-tools' LIVE DB rows added in-app since May are not
// reachable without credentials — flagged TBD where they may supersede this.

export const ROOT = {
  id: 'root',
  label: "David's Architecture",
  sub: 'Built, operated, and evolving',
}

export const GROUPS = [
  { id: 'client', label: 'Client', desc: 'Platforms built for and used by client organizations.', color: '#4DA3FF' },
  { id: 'sandbox', label: 'Sandbox', desc: 'Working demos built to win the next engagement.', color: '#9B7FE0' },
  { id: 'firm', label: 'Firm', desc: 'Internal operations, capital, and templates.', color: '#5FB8BF' },
  { id: 'personal', label: 'Personal', desc: 'The operator\'s own systems.', color: '#F8C761' },
]

// Sub-branches: Sandbox is a parent node with three child branches.
// Clicking Sandbox in the David view re-roots the stage on it.
export const SUBGROUPS = [
  { id: 'bd', parent: 'sandbox', label: 'Business Development', desc: 'Demos built to open doors and win the next engagement.', color: '#B79BE8' },
  { id: 'tl', parent: 'sandbox', label: 'Thought Leadership', desc: "Instruments that carry the firm's point of view.", color: '#8F7BD8' },
  { id: 'global', parent: 'sandbox', label: 'Global', desc: 'Foundational sandboxes that serve everything else.', color: '#7A66C9' },
]

export const PLATFORMS = [
  {
    id: "achp", group: "client", label: "ACHP", name: "ACHP Strategy Dashboard",
    production: { url: "https://achp-dashboard-v3.vercel.app", note: "CEO Sandbox fenced server-side" },
    github: { repo: "Third-Horizon-Strategies/achp-dashboard", branch: "main", visibility: "private" },
    supabase: { project: "achp (per th-tools registry)", rls: "grant-fenced (LTS module)" },
    vercel: { project: "achp-dashboard-v3", scope: 'Third Horizon', deploy: "Git push → production" },
    collaborators: ["ds016683", "thtopher", "carlospravia", "hartatsr4", "paytonncourt96", "jhailu1514096", "calvinlomaxTH", "awilson0812"],
    users: ["cheryl@achp.org (per th-tools)", "lindsay.reeves@achp.org (per th-tools)", "TBD — confirm vs live th-tools DB (Aug work adds Ceci Connolly CEO sandbox)"],
    changelog: [{ date: "2026-08-17", entry: "fix(tracker): ground bill summaries in real text, not sparse fields" }, { date: "2026-08-17", entry: "fix(congress-sync): send an identifying User-Agent to Congress.gov" }, { date: "2026-08-17", entry: "fix(tracker): plain-text status column, add summary drafting" }],
  },
  {
    id: "achp-archive", group: "client", label: "ACHP (v1)", name: "ACHP Federal Affairs (Archived)",
    production: { url: null, note: "Archived repo — superseded by achp-dashboard-v3" },
    github: { repo: "ds016683/achp-dashboard-archive-2026", branch: "main", visibility: "private" },
    supabase: { project: "None — archived" },
    vercel: { project: "None — archived", scope: 'Third Horizon', deploy: "Archived" },
    collaborators: ["thtopher", "ds016683"],
    users: ["Superseded"],
    changelog: [{ date: "2026-05-14", entry: "feat: magic-link auth + first-login welcome modal" }, { date: "2026-05-14", entry: "rename: Assistant → Ask Odin (Powered by Third Horizon)" }],
  },
  {
    id: "achp-lts", group: "client", label: "ACHP LTS", name: "ACHP Long Term Strategy",
    production: { url: "TBD \u2014 confirm production URL", note: "Private David + Ceci workspace" },
    github: { repo: "Third-Horizon-Strategies/achp-ceo", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref", rls: "grant-fenced RLS" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["carlospravia", "hartatsr4", "paytonncourt96", "ds016683", "awilson0812"],
    users: ["David Smith", "Ceci Connolly (ACHP CEO)"],
    changelog: [{ date: "2026-07-15", entry: "feat: Org Chart tab in Future Framing \u2014 current-state working hypothesis from deck" }, { date: "2026-07-15", entry: "feat: trend citations + July 2026 research seed (23 sourced trends)" }, { date: "2026-07-15", entry: "feat: Timeline mode toggle \u2014 Event Milestones / Gantt" }],
  },
  {
    id: "apnc", group: "client", label: "APNC", name: "APNC Field Hub",
    production: { url: "https://apnc-sandbox.vercel.app", note: "Academy / Bills / Field Data" },
    github: { repo: "Third-Horizon-Strategies/apnc-sandbox", branch: "main", visibility: "private" },
    supabase: { project: "ivtmmwobyuthxiwbyyhv" },
    vercel: { project: "apnc-sandbox", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["carlospravia", "hartatsr4", "paytonncourt96", "ds016683", "awilson0812"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-07-29", entry: "README: punctuation cleanup in source-of-truth section" }, { date: "2026-07-29", entry: "README: GitHub-as-source-of-truth contract; refresh stale stack/auth notes" }, { date: "2026-07-27", entry: "Remove Third Horizon x APNC co-brand tag from home hero and proposal top bar" }],
  },
  {
    id: "mma-tracker", group: "client", label: "MMA Tracker", name: "MMA Production Tracker",
    production: { url: null, note: "Vercel deployment pending (per th-tools, May)" },
    github: { repo: "Third-Horizon-Strategies/mma-tracker", branch: "main", visibility: "private" },
    supabase: { project: "None — BigQuery-backed (per th-tools)" },
    vercel: { project: "TBD — none registered in th-tools yet", scope: 'Third Horizon', deploy: "Git push → production" },
    collaborators: ["ds016683", "thtopher", "carlospravia"],
    users: ["TBD — none registered in th-tools"],
    changelog: [{ date: "2026-08-13", entry: "Production task and budget tracker for the Marsh McLennan Agency" }],
  },
  {
    id: "bellwether", group: "sandbox", subgroup: "tl", label: "Bellwether", name: "Bellwether Safety Net",
    production: { url: "http://bellwether.thirdhorizon.com", note: "Chicago safety-net financial tracking" },
    github: { repo: "ds016683/bellwether", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["thtopher", "ds016683", "Tutty-Thirdhorizon"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-06-15", entry: "Merge pull request #18 from ds016683/thtopher/2-clickable-workbench-innovation-research/1" }, { date: "2026-06-15", entry: "docs: brainstorm + plan for clickable workbench Innovation Brief and Bellwether Lens" }, { date: "2026-06-14", entry: "Merge pull request #17 from ds016683/thtopher/1-visual-qa-sweep-fixes/1" }],
  },
  {
    id: "pomegranate", group: "client", label: "Pomegranate CMH", name: "Pomegranate Health Dashboard (CMH-26-01-POM)",
    production: { url: "https://ds016683.github.io/cp-pomegranate-CMH-26-01-POM/", note: "th-tools separately tracks pomegranate-market (Cheryl-stewarded)" },
    github: { repo: "ds016683/cp-pomegranate-CMH-26-01-POM", branch: "main", visibility: "public" },
    supabase: { project: "None \u2014 GitHub Pages static" },
    vercel: { project: "None \u2014 GitHub Pages", scope: 'Third Horizon', deploy: "Push to main \u2192 Pages" },
    collaborators: ["ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-05-17", entry: "fix: favicon + title \u2014 Pomegranate branding, not MMA carryover" }, { date: "2026-05-17", entry: "ci: retrigger build \u2014 refresh Supabase secrets for Odin" }, { date: "2026-05-17", entry: "fix: OdinChat height chain \u2014 flex column layout, min-h-0, each view owns scroll" }],
  },
  {
    id: "choa", group: "client", label: "CHOA", name: "CHOA Dashboard",
    production: { url: "TBD \u2014 confirm production URL" },
    github: { repo: "ds016683/choa-dashboard", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-04-24", entry: "fix: register LineElement, LineController, PointElement in all chart components" }, { date: "2026-04-24", entry: "fix: register LineElement/PointElement globally; add error boundary" }, { date: "2026-04-24", entry: "feat: add Fly.io deployment config" }],
  },
  {
    id: "project-heart", group: "client", label: "Project Heart", name: "THS \u00d7 AHA Cardiovascular",
    production: { url: "TBD \u2014 confirm production URL" },
    github: { repo: "ds016683/project-heart", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-03-23", entry: "init: Project Heart \u2014 THS x AHA cardiovascular transparency dashboard" }, { date: "2026-03-23", entry: "Initial commit" }],
  },
  {
    id: "vitalic", group: "sandbox", subgroup: "bd", label: "Vitalic", name: "Vitalic Health \u00d7 HFMA",
    production: { url: "https://sandbox.hfma.thirdhorizon.com", note: "Gate-code access" },
    github: { repo: "Third-Horizon-Strategies/sandbox.hfma", branch: "main", visibility: "private" },
    supabase: { project: "Vitalic_Sandbox" },
    vercel: { project: "sandbox.hfma", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["carlospravia", "hartatsr4", "paytonncourt96", "ds016683", "awilson0812"],
    users: ["Shared gate access (HFMA demo audience)"],
    changelog: [{ date: "2026-08-11", entry: "Vitalic Health demo platform: VPI, four pillar modules, Rate Lookup, Odin, gate" }],
  },
  {
    id: "frontier", group: "sandbox", subgroup: "bd", label: "Frontier", name: "Frontier Rate Intelligence",
    production: { url: "https://sandbox.frontier.thirdhorizon.com", note: "MMA BD sandbox \u00b7 gate-code access" },
    github: { repo: "ds016683/sandbox.frontier", branch: "main", visibility: "private" },
    supabase: { project: "None \u2014 static data on MMA TiC foundation" },
    vercel: { project: "frontier-rate-intelligence", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["ds016683"],
    users: ["Shared gate access (MMA BD prospects)"],
    changelog: [{ date: "2026-08-12", entry: "Access gate on landing: code MMA2026, session-scoped unlock" }, { date: "2026-08-12", entry: "Landing: logo-only sidebar header; new Executive Overview subtitle" }, { date: "2026-08-12", entry: "Rebrand: Frontier Direct logo top left, MMA powered-by footer, TH silent" }],
  },
  {
    id: "rosecrance", group: "sandbox", subgroup: "bd", label: "Rosecrance", name: "Rosecrance Co-Creation",
    production: { url: "https://rosecrance-sandbox.vercel.app", note: "Currently ungated" },
    github: { repo: "Third-Horizon-Strategies/rosecrance-sandbox", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "rosecrance-sandbox", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["carlospravia", "hartatsr4", "paytonncourt96", "ds016683", "awilson0812"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-08-15", entry: "Document the Git-connected deploy path" }, { date: "2026-08-15", entry: "Rebuild the palette on Rosecrance's own annual report" }, { date: "2026-08-15", entry: "Sharpen placement verdicts and add plan-year reset economics" }],
  },
  {
    id: "starset-sandbox", group: "sandbox", subgroup: "global", label: "Starset App", name: "Starset Analytics Sandbox",
    production: { url: "TBD \u2014 confirm production URL" },
    github: { repo: "ds016683/starset-app-sandbox", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["thtopher", "ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-06-08", entry: "Initial commit: Starset application sandbox" }],
  },
  {
    id: "clarity", group: "sandbox", subgroup: "global", label: "Clarity", name: "Starset Clarity",
    production: { url: "TBD \u2014 confirm production URL", note: "Episode-based cost intelligence" },
    github: { repo: "ds016683/project-clarity", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-04-11", entry: "feat: initial commit \u2014 Clarity preview app (proof of concept, synthetic data)" }],
  },
  {
    id: "bh-ri", group: "sandbox", subgroup: "global", label: "BH Rate Intel", name: "BH Rate Intelligence",
    production: { url: "TBD \u2014 confirm production URL", note: "Succeeded by th-bh-ratebook (org)" },
    github: { repo: "ds016683/bh-rate-intelligence", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["thtopher", "ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-03-29", entry: "fix: use raw Supabase REST calls instead of JS client" }, { date: "2026-03-29", entry: "Merge pull request #2 from ds016683/feat/vercel-nextjs-migration" }, { date: "2026-03-28", entry: "feat: cleanup old Flask/Fly.io files, add error handling, update README" }],
  },
  {
    id: "promise", group: "client", label: "Promise", name: "Promise Rate Intelligence",
    production: { url: "https://promise-rate-intelligence.vercel.app", note: "Retired 2026-06-30 per th-tools · Methodology + Ask Odin built in" },
    github: { repo: "Third-Horizon-Strategies/promise-rate-intelligence", branch: "main", visibility: "private" },
    supabase: { project: "None registered in th-tools" },
    vercel: { project: "promise-rate-intelligence", scope: 'Third Horizon', deploy: "Git push → production" },
    collaborators: ["ds016683", "carlospravia"],
    users: ["Seven users at a health system (per th-tools)"],
    changelog: [],
  },
  {
    id: "pshp", group: "client", label: "PSHP", name: "PSHP Rate Intelligence",
    production: { url: "https://pshp-rate-intelligence.vercel.app" },
    github: { repo: "ds016683/pshp-rate-intelligence", branch: "main", visibility: "private" },
    supabase: { project: "vbzteaulswokozkvfhus" },
    vercel: { project: "pshp-rate-intelligence", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["thtopher", "ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-04-29", entry: "feat: suppress CAH IP rows with badge, exclude from system averages" }, { date: "2026-04-29", entry: "feat: collapsible tree sidebar with system group headers" }, { date: "2026-04-29", entry: "Initial commit \u2014 PSHP Rate Intelligence (Avera)" }],
  },
  {
    id: "aha-cv", group: "sandbox", subgroup: "bd", label: "AHA CV Index", name: "AHA Cardiovascular Index",
    production: { url: "TBD \u2014 confirm production URL", note: "Public repo demo" },
    github: { repo: "ds016683/aha-cardiovascular-index", branch: "main", visibility: "public" },
    supabase: { project: "None \u2014 static demo" },
    vercel: { project: "TBD \u2014 confirm Vercel project", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-04-06", entry: "Enrich guideline cards and add AI chat panel" }, { date: "2026-04-06", entry: "Update title to remove Third Horizon reference" }, { date: "2026-04-06", entry: "Restyle PathwayLayer with AHA branding and inline styles" }],
  },
  {
    id: "cip", group: "firm", label: "Investor CIP", name: "Confidential Investor Package",
    production: { url: "https://investor.thirdhorizon.com", note: "Gated \u00b7 re-alias after every prod deploy" },
    github: { repo: "Third-Horizon-Strategies/th-cim", branch: "main", visibility: "private" },
    supabase: { project: "TH-CIP (pkjessvuwkiuszbkptcx)" },
    vercel: { project: "th-cim", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["carlospravia", "hartatsr4", "paytonncourt96", "thtopher", "ds016683", "awilson0812"],
    users: ["Gated investor access"],
    changelog: [{ date: "2026-08-11", entry: "fix: gate allowlists were blocking the intro video and team headshots" }, { date: "2026-08-11", entry: "feat: pre-NDA Executive Summary preview with server-enforced tier gate (TOP) (#21)" }, { date: "2026-07-31", entry: "fix: forgot-password OTP code has no way to be entered (TOP-265) (#20)" }],
  },
  {
    id: "advisory", group: "firm", label: "Advisory", name: "TH Advisory Canvas",
    production: { url: "TBD \u2014 confirm production URL", note: "Public advisory canvas \u00b7 flag-driven" },
    github: { repo: "Third-Horizon-Strategies/th-advisory", branch: "main", visibility: "private" },
    supabase: { project: "None" },
    vercel: { project: "th-advisory", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["carlospravia", "hartatsr4", "paytonncourt96", "ds016683", "awilson0812"],
    users: ["Public visitors"],
    changelog: [{ date: "2026-07-06", entry: "chore: harvest Vercel deployment dpl_9RdpxvLNRKMq49WydUuM6EMnPjid of th-advisory" }],
  },
  {
    id: "binder", group: "firm", label: "Finance Binder", name: "TH Finance Binder",
    production: { url: "https://th-finance-binder.vercel.app" },
    github: { repo: "ds016683/th-finance-binder", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "th-finance-binder", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["ds016683"],
    users: ["David Smith", "Greg (controller)"],
    changelog: [{ date: "2026-08-06", entry: "Audit 8/6: merge seven split client groups via crosswalk aliases" }, { date: "2026-08-05", entry: "Fix phantom duplicate client groups; nest CCBHC TTA under National Council" }, { date: "2026-08-05", entry: "Expense porting on David's CoA canon (8/5)" }],
  },
  {
    id: "ledger-ops", group: "firm", label: "Ledger Ops", name: "TH Ledger Ops",
    production: { url: null, note: "Repo only \u2014 operating briefs + runbooks" },
    github: { repo: "ds016683/th-ledger-ops", branch: "main", visibility: "private" },
    supabase: { project: "None \u2014 repo only" },
    vercel: { project: "None", scope: 'Third Horizon', deploy: "No deployment" },
    collaborators: ["ds016683"],
    users: ["David Smith"],
    changelog: [{ date: "2026-06-30", entry: "seed: TH-LEDGER-BRIEF + README" }, { date: "2026-06-30", entry: "Initial commit" }],
  },
  {
    id: "daas", group: "firm", label: "DaaS Analytics", name: "DaaS Production Analytics",
    production: { url: "https://th-bd-hub.vercel.app", note: "Archived repo" },
    github: { repo: "ds016683/th-daas-prod-analytics", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "th-bd-hub", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["ds016683"],
    users: ["TBD \u2014 enumerate users"],
    changelog: [{ date: "2026-06-25", entry: "Swap to Third Horizon arcs logo + reskin to binder palette" }, { date: "2026-06-25", entry: "Rebrand to DaaS Production Analytics" }, { date: "2026-06-25", entry: "Rebuild as Next.js 15 (App Router)" }],
  },
  {
    id: "cip-old", group: "firm", label: "CIP (v1)", name: "Investor Package v1",
    production: { url: "https://th-canvas.vercel.app", note: "Superseded by th-cim" },
    github: { repo: "ds016683/TH-CIP", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "th-canvas", scope: 'Third Horizon', deploy: "CLI only \u2014 vercel --prod" },
    collaborators: ["thtopher", "ds016683", "th-cheryl-matochik"],
    users: ["Superseded"],
    changelog: [{ date: "2026-06-14", entry: "Redesign live: full deck navigable, Four Eras in paper" }, { date: "2026-06-14", entry: "Redesign: real Third Horizon arc mark in header + Contents tab" }, { date: "2026-06-13", entry: "Paper sections: never wrap full-bleed interactives in edit chrome" }],
  },
  {
    id: "dash-template", group: "firm", label: "Dash Template", name: "Client Dashboard Template",
    production: { url: null, note: "Repo only \u2014 reusable engagement template" },
    github: { repo: "ds016683/client-dashboard-template", branch: "main", visibility: "private" },
    supabase: { project: "None \u2014 template" },
    vercel: { project: "None", scope: 'Third Horizon', deploy: "No deployment" },
    collaborators: ["ds016683"],
    users: ["Template"],
    changelog: [{ date: "2026-05-11", entry: "Initial commit: blank client dashboard template" }],
  },
  {
    id: "monday-template", group: "firm", label: "Monday Template", name: "Monday.com Dashboard Template",
    production: { url: "https://ds016683.github.io/cp-template-monday/", note: "Template \u00b7 Monday.com backend" },
    github: { repo: "ds016683/cp-template-monday", branch: "main", visibility: "public" },
    supabase: { project: "None \u2014 template" },
    vercel: { project: "None \u2014 GitHub Pages", scope: 'Third Horizon', deploy: "Push to main \u2192 Pages" },
    collaborators: ["ds016683"],
    users: ["Template"],
    changelog: [{ date: "2026-05-12", entry: "fix: widen mondayBoardId type check for forks" }, { date: "2026-05-12", entry: "feat: initial cp-template-monday scaffold" }],
  },
  {
    id: "sa-hud", group: "personal", label: "SA-HUD", name: "Sovereign Architect HUD",
    production: { url: "https://ds016683.github.io/sa-hud/", note: "This app" },
    github: { repo: "ds016683/sa-hud", branch: "main", visibility: "public" },
    supabase: { project: "cmuvomnmaoseccxpeuxq" },
    vercel: { project: "None \u2014 GitHub Pages", scope: 'Third Horizon', deploy: "Push to main \u2192 Pages" },
    collaborators: ["ds016683"],
    users: ["David Smith (operator)"],
    changelog: [{ date: "2026-06-15", entry: "Meeting Notes: remove top tag filter bar; pull in 4 unsynced recorded meetings" }, { date: "2026-06-15", entry: "Meeting Notes: day grouping, tag filters, note-styling polish" }, { date: "2026-06-15", entry: "Reskin Meeting Notes to TH design system + drop unrecorded meetings" }],
  },
  {
    id: "diablo", group: "personal", label: "Project Diablo", name: "Sovereign Architect Framework",
    production: { url: "https://project-diablo.vercel.app", note: "Book + product venture" },
    github: { repo: "ds016683/project-diablo", branch: "main", visibility: "private" },
    supabase: { project: "TBD \u2014 confirm project ref" },
    vercel: { project: "project-diablo", scope: 'Third Horizon', deploy: "Git push \u2192 production" },
    collaborators: ["ds016683"],
    users: ["David + Sabina"],
    changelog: [{ date: "2026-04-11", entry: "feat: Gate 1 \u2014 Supabase auth, persistence, dynamic clarity meter" }, { date: "2026-04-10", entry: "chore: trigger redeploy for env var update" }, { date: "2026-04-10", entry: "feat(security): move Anthropic API to serverless proxy, harden JSON parsing" }],
  },
]

// ---- Status semantics ------------------------------------------------------
// lifecycle — the CONNECTION LINE color (branch -> platform):
//   live: in production with real users using it for its intended purpose
//   dev:  under active development
//   inactive: suspended / set to be nerfed
// health — the CHIP DOT (and viewer tag):
//   ok: working properly · warn: something needs attention · critical: critical error
export const LIFECYCLE_LABEL = { live: 'LIVE', dev: 'IN DEV', inactive: 'SUSPENDED' }
export const LIFECYCLE_COLOR = { live: '#5FBF8A', dev: '#F8C761', inactive: '#E06C5F' }
export const HEALTH_COLOR = { ok: '#5FBF8A', warn: '#F8C761', critical: '#E06C5F' }
export const HEALTH_LABEL = { ok: 'OPERATIONAL', warn: 'NEEDS ATTENTION', critical: 'CRITICAL' }

export const PLATFORM_STATE = {
  "achp": { lifecycle: "live", health: 'ok' },
  "achp-archive": { lifecycle: "inactive", health: 'ok' },
  "achp-lts": { lifecycle: "live", health: 'ok' },
  "apnc": { lifecycle: "live", health: 'ok' },
  "mma-tracker": { lifecycle: "live", health: 'ok' },
  "bellwether": { lifecycle: "dev", health: 'ok' },
  "pomegranate": { lifecycle: "live", health: 'ok' },
  "choa": { lifecycle: "dev", health: 'ok' },
  "project-heart": { lifecycle: "dev", health: 'ok' },
  "vitalic": { lifecycle: "live", health: 'ok' },
  "frontier": { lifecycle: "live", health: 'ok' },
  "rosecrance": { lifecycle: "dev", health: 'ok' },
  "starset-sandbox": { lifecycle: "dev", health: 'ok' },
  "clarity": { lifecycle: "dev", health: 'ok' },
  "bh-ri": { lifecycle: "dev", health: 'ok' },
  "promise": { lifecycle: "inactive", health: 'ok' },
  "pshp": { lifecycle: "dev", health: 'ok' },
  "aha-cv": { lifecycle: "dev", health: 'ok' },
  "cip": { lifecycle: "live", health: 'ok' },
  "advisory": { lifecycle: "live", health: 'ok' },
  "binder": { lifecycle: "live", health: 'ok' },
  "ledger-ops": { lifecycle: "live", health: 'ok' },
  "daas": { lifecycle: "inactive", health: 'ok' },
  "cip-old": { lifecycle: "inactive", health: 'ok' },
  "dash-template": { lifecycle: "dev", health: 'ok' },
  "monday-template": { lifecycle: "dev", health: 'ok' },
  "sa-hud": { lifecycle: "live", health: 'ok' },
  "diablo": { lifecycle: "dev", health: 'ok' },
}

// ---- Derived state ---------------------------------------------------------
// Any field carrying a TBD marker is an open item: the platform stays
// functional (line color unchanged) but its health dot degrades to warn
// until the item is resolved. Explicit 'critical' always wins.
const TBD_RE = /\bTBD\b/i

export function openItems(p) {
  const items = []
  const check = (label, v) => { if (typeof v === 'string' && TBD_RE.test(v)) items.push(`${label}: ${v}`) }
  check('Production URL', p.production?.url)
  check('Production note', p.production?.note)
  check('GitHub repo', p.github?.repo)
  check('Supabase project', p.supabase?.project)
  check('Supabase RLS', p.supabase?.rls)
  check('Vercel project', p.vercel?.project)
  for (const u of p.users || []) check('Users', u)
  return items
}

export function effectiveState(p) {
  const base = PLATFORM_STATE[p.id] || { lifecycle: 'dev', health: 'ok' }
  const items = openItems(p)
  const health = base.health === 'critical' ? 'critical' : (items.length ? 'warn' : base.health)
  return { ...base, health, openItems: items }
}
