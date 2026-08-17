// David's Architecture — the platform tree rendered by EcosystemPage.
// Curated data, verified against GitHub/Vercel/local configs on 2026-08-17.
// Shaped so each panel can later be fed by live APIs (GitHub REST, Supabase
// Management API, Vercel API) without changing the component.
// NOTE: this repo is public — no secrets, gate codes, or personal emails here.

export const ROOT = {
  id: 'root',
  label: "David's Architecture",
  sub: 'Built, operated, and evolving',
  x: 50,
  y: 46,
}

export const GROUPS = [
  {
    id: 'client',
    label: 'Client',
    desc: 'Platforms built for and used by client organizations.',
    color: '#4DA3FF',
    x: 76,
    y: 24,
  },
  {
    id: 'sandbox',
    label: 'Sandbox',
    desc: 'Working demos built to win the next engagement.',
    color: '#9B7FE0',
    x: 24,
    y: 68,
  },
]

export const PLATFORMS = [
  {
    id: 'achp',
    group: 'client',
    label: 'ACHP',
    name: 'ACHP Strategy Dashboard',
    x: 88,
    y: 8,
    production: { url: 'https://achp-dashboard.vercel.app', note: 'CEO Sandbox fenced server-side' },
    github: { repo: 'Third-Horizon-Strategies/achp-dashboard', branch: 'main', visibility: 'private' },
    supabase: { project: 'TBD — confirm project ref', tables: null, rls: 'grant-fenced (LTS module)' },
    vercel: { project: 'achp-dashboard', scope: 'Third Horizon', deploy: 'Git push → production' },
    collaborators: ['ds016683', 'thtopher', 'carlospravia', 'hartatsr4', 'paytonncourt96', 'jhailu1514096', 'calvinlomaxTH', 'awilson0812'],
    users: ['David Smith (owner)', 'Ceci Connolly (ACHP CEO)'],
    changelog: [
      { date: '2026-08-17', entry: 'fix(tracker): ground bill summaries in real text, not sparse fields' },
      { date: '2026-08-17', entry: 'fix(congress-sync): send an identifying User-Agent to Congress.gov' },
      { date: '2026-08-17', entry: 'fix(tracker): plain-text status column, add summary drafting' },
      { date: '2026-08-15', entry: 'feat(ceo-sandbox): restore reviewed v2 (locked), promote current draft to v3' },
      { date: '2026-08-15', entry: 'feat(ceo-sandbox): LT 1.1 thesis v2 + deck v2 structure evidence' },
    ],
  },
  {
    id: 'apnc',
    group: 'client',
    label: 'APNC',
    name: 'APNC Field Hub',
    x: 64,
    y: 6,
    production: { url: 'https://apnc-sandbox.vercel.app', note: 'Academy / Bills / Field Data' },
    github: { repo: 'Third-Horizon-Strategies/apnc-sandbox', branch: 'main', visibility: 'private' },
    supabase: { project: 'ivtmmwobyuthxiwbyyhv', tables: null, rls: null },
    vercel: { project: 'apnc-sandbox', scope: 'Third Horizon', deploy: 'CLI only — vercel --prod' },
    collaborators: ['ds016683', 'carlospravia', 'hartatsr4', 'paytonncourt96', 'awilson0812'],
    users: ['APNC field team (TBD — enumerate)'],
    changelog: [
      { date: '2026-07-29', entry: 'README: GitHub-as-source-of-truth contract; refresh stale stack/auth notes' },
      { date: '2026-07-27', entry: 'Remove Third Horizon x APNC co-brand tag from home hero and proposal top bar' },
      { date: '2026-07-27', entry: 'Prominent full-width LCAS lever bar; modal above Leaflet z-stack' },
      { date: '2026-07-27', entry: 'Scenario map: LCAS-only lever, wider layout, footer spacing fix' },
    ],
  },
  {
    id: 'vitalic',
    group: 'sandbox',
    label: 'Vitalic',
    name: 'Vitalic Health × HFMA',
    x: 10,
    y: 88,
    production: { url: 'https://sandbox.hfma.thirdhorizon.com', note: 'Gate-code access' },
    github: { repo: 'Third-Horizon-Strategies/sandbox.hfma', branch: 'main', visibility: 'private' },
    supabase: { project: 'Vitalic_Sandbox', tables: null, rls: null },
    vercel: { project: 'sandbox.hfma', scope: 'Third Horizon', deploy: 'CLI only — vercel --prod' },
    collaborators: ['ds016683', 'carlospravia', 'hartatsr4', 'paytonncourt96', 'awilson0812'],
    users: ['Shared gate access (HFMA demo audience)'],
    changelog: [
      { date: '2026-08-11', entry: 'Vitalic Health demo platform: VPI, four pillar modules, Rate Lookup, Odin, gate' },
    ],
  },
  {
    id: 'frontier',
    group: 'sandbox',
    label: 'Frontier',
    name: 'Frontier Rate Intelligence',
    x: 36,
    y: 92,
    production: { url: 'https://sandbox.frontier.thirdhorizon.com', note: 'MMA BD sandbox · gate-code access' },
    github: { repo: 'ds016683/sandbox.frontier', branch: 'main', visibility: 'private' },
    supabase: { project: 'None — static data on MMA TiC foundation', tables: null, rls: null },
    vercel: { project: 'frontier-rate-intelligence', scope: 'Third Horizon', deploy: 'CLI only — vercel --prod' },
    collaborators: ['ds016683'],
    users: ['Shared gate access (MMA BD prospects)'],
    changelog: [
      { date: '2026-08-12', entry: 'Access gate on landing: session-scoped unlock' },
      { date: '2026-08-12', entry: 'Landing: logo-only sidebar header; new Executive Overview subtitle' },
      { date: '2026-08-12', entry: 'Rebrand: Frontier Direct logo top left, MMA powered-by footer, TH silent' },
      { date: '2026-08-12', entry: 'Frontier Rate Intelligence concept sandbox: three modules on the MMA TiC foundation' },
    ],
  },
]

// ---- Status semantics (design pass; wiring comes later) --------------------
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
  achp: { lifecycle: 'live', health: 'ok' },
  apnc: { lifecycle: 'live', health: 'ok' },
  vitalic: { lifecycle: 'live', health: 'ok' },
  frontier: { lifecycle: 'live', health: 'ok' },
}
