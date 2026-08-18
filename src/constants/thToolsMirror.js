// TH Tools mirror — the Ecosystem's source of truth is the th-tools
// platform registry (tools.thirdhorizon.com). This module carries the
// committed SNAPSHOT of that registry (registry.ts + migration 078 seed;
// the live DB is not yet readable — see docs/TH-TOOLS-READ-API-ASK.md)
// plus the derivation rules mirrored from th-tools' own philosophy:
//   - state is DERIVED, never stored (retired / production / building)
//   - NULL means "needs triage", never defaulted
//   - registry vs observed drift is surfaced, not hidden
// Everything OBSERVED in David's sweep but absent from the registry
// renders as an unregistered ghost in the triage tray.
import { PLATFORMS } from './ecosystemArchitecture'

export const SNAPSHOT_AS_OF = 'May 2026 (registry.ts · migration 078)'
export const DAVID = { email: 'david@thirdhorizon.com', github: 'ds016683' }

// th-tools ontology: the registry's `type` field. Spoke angle assignments
// keep the sparsest branch (sandbox: zero registered rows) at the bottom,
// clear of the triage tray.
export const ONTOLOGY = [
  { id: 'subscribeable', label: 'Subscribeable', desc: 'Platforms a user subscribes to. Each has its own commercial structure.', color: '#F8C761' },
  { id: 'th-hosted', label: 'TH-Hosted', desc: 'Platforms Third Horizon hosts and operates for clients.', color: '#4DA3FF' },
  { id: 'deployed-client', label: 'Deployed-Client', desc: 'Built for a client, co-branded or white-labeled under their name.', color: '#5FBF8A' },
  { id: 'sandbox', label: 'Sandbox', desc: 'Working demonstrations to win the next engagement.', color: '#9B7FE0' },
]

// The committed registry rows, verbatim from th-tools (May snapshot).
// `observed` records what David's own GitHub sweep can confirm today —
// the drift check between declaration and observation.
export const TH_REGISTRY = [
  {
    id: 'achp', type: 'th-hosted', label: 'ACHP', name: 'ACHP Platform',
    url: 'https://achp-dashboard-v3.vercel.app',
    steward: 'david@thirdhorizon.com',
    users: ['cheryl@achp.org', 'lindsay.reeves@achp.org'],
    github: 'Third-Horizon-Strategies/achp-dashboard', vercel: 'achp-dashboard-v3', supabase: 'achp',
    createdAt: '2026-05-01', retirementAt: null,
    notes: 'Live client platform. Architecture under review — coordinate with David before major structural changes.',
    observed: { repoFound: true, davidCollaborator: true },
  },
  {
    id: 'promise', type: 'deployed-client', label: 'Promise', name: 'Promise Rate Intelligence',
    url: 'https://promise-rate-intelligence.vercel.app',
    steward: 'david@thirdhorizon.com',
    users: [],
    github: 'Third-Horizon-Strategies/promise-rate-intelligence', vercel: 'promise-rate-intelligence', supabase: null,
    createdAt: '2026-05-14', retirementAt: '2026-06-30',
    notes: 'Shipped to seven users at a health system. Methodology + Ask Odin built in.',
    observed: { repoFound: true, davidCollaborator: true },
  },
  {
    id: 'pomegranate-market', type: 'deployed-client', label: 'Pomegranate Mkt', name: 'Pomegranate Market — Food Is Medicine',
    url: 'https://pomegranate-market.vercel.app',
    steward: 'cheryl@thirdhorizon.com',
    users: ['lindsay.reeves@pomegranate.com'],
    github: 'Third-Horizon-Strategies/pomegranate', vercel: 'pomegranate-market', supabase: null,
    createdAt: '2026-05-13', retirementAt: null,
    notes: 'Food is medicine advisory. Mr. Pomegranate agent + Discord channel.',
    observed: { repoFound: false, davidCollaborator: false }, // repo 404s in the 8/17 sweep — registry drift
  },
  {
    id: 'mma-tracker', type: 'deployed-client', label: 'MMA Tracker', name: 'MMA Client Dashboard',
    url: '',
    steward: 'david@thirdhorizon.com',
    users: [],
    github: 'Third-Horizon-Strategies/mma-tracker', vercel: null, supabase: null,
    createdAt: '2026-05-01', retirementAt: null,
    notes: 'BigQuery-backed client tracker. Vercel deployment pending.',
    observed: { repoFound: true, davidCollaborator: true },
  },
  {
    id: 'pipeline-rebuild', type: 'subscribeable', label: 'Pipeline', name: 'Pipeline (Rebuild)',
    url: '',
    steward: 'david@thirdhorizon.com',
    users: [],
    github: null, vercel: null, supabase: null,
    createdAt: '2026-05-15', retirementAt: null,
    notes: "Placeholder. David's pipeline rebuild — details TBD.",
    observed: { repoFound: null, davidCollaborator: null }, // no repo declared
  },
]

// ---- Derivations (mirrors src/lib/platforms/state.ts philosophy) ----------

export function derivedState(r) {
  if (r.retirementAt && r.retirementAt <= new Date().toISOString().slice(0, 10)) return 'retired'
  if ((r.users || []).length > 0) return 'production'
  return 'building'
}
export const STATE_LABEL = { retired: 'RETIRED', production: 'PRODUCTION', building: 'BUILDING' }
export const STATE_COLOR = { retired: '#E06C5F', production: '#5FBF8A', building: '#F8C761' }

// NULL registry fields = needs triage; observed drift = needs attention.
export function registryOpenItems(r) {
  const items = []
  if (!r.url) items.push('url: NULL in registry — needs triage')
  if (r.github == null) items.push('github: NULL in registry — needs triage')
  if (r.vercel == null) items.push('vercel: NULL in registry — needs triage')
  if (r.supabase == null) items.push('supabase: NULL in registry — needs triage')
  if (r.observed?.repoFound === false) items.push(`DRIFT: registry declares ${r.github} but the repo was not found in the 8/17 sweep`)
  return items
}
export function registryHealth(r) {
  if (r.observed?.repoFound === false) return 'critical'
  return registryOpenItems(r).length ? 'warn' : 'ok'
}

// ---- Stewardship lens (Primary / Tertiary / Global) -----------------------
// primary: David stewards it. tertiary: David appears (user or observed
// repo collaborator) without stewarding. global: everything.
export function stewardship(r) {
  if (r.steward === DAVID.email) return 'primary'
  if ((r.users || []).includes(DAVID.email) || r.observed?.davidCollaborator) return 'tertiary'
  return 'global'
}

// ---- Ghosts: observed in David's sweep, absent from the registry ----------
// Matching is by GitHub repo (the one durable join key both sides share).
const REGISTERED_REPOS = new Set(TH_REGISTRY.map((r) => r.github).filter(Boolean))

export const GHOSTS = PLATFORMS.filter((p) => !REGISTERED_REPOS.has(p.github?.repo))

export function lensFilter(lens, items, kind) {
  if (lens === 'global') return items
  if (kind === 'registered') {
    return items.filter((r) => lens === 'primary' ? stewardship(r) === 'primary' : stewardship(r) !== 'global')
  }
  // Ghosts are all David's own observed builds: primary by definition.
  return items
}
