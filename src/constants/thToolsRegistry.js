// th-tools platform registry — FAITHFUL MIRROR of the firm's single source
// of truth (tools.thirdhorizon.com). Schema and derivations are ports of
// th-tools src/lib/platforms/category.ts + state.ts — category and state are
// DERIVED, NEVER STORED, exactly as there. Data: live pull of the platforms
// table (deleted_at null), snapshot below. Replace with the read API when
// Topher ships GET /api/platforms.

export const SNAPSHOT_AS_OF = 'Aug 24, 2026'

// David's revenue-framing categories (7/6 session) — top tier of the map.
// Colors keep th-tools hue identity, lifted for the dark stage.
export const CATEGORIES = [
  { id: 'subscription', label: 'Subscription platforms', color: '#2DD4BF',
    desc: 'Many subscribers; custom views branch off (Starset Analytics).' },
  { id: 'client_platform', label: 'Client platforms', color: '#60A5FA',
    desc: 'Fluid containers where we actively work with the client (APNC).' },
  { id: 'deployed', label: 'Deployed platforms', color: '#A78BFA',
    desc: 'Built once, one job over the course of time (MHPI).' },
  { id: 'business_development', label: 'Business development', color: '#38BDF8',
    desc: 'Pre-contract demos showing the art of the possible.' },
  { id: 'internal', label: 'Internal', color: '#8FA3B8',
    desc: "TH's own products and personal tools (th-tools, Finance Binder)." },
  { id: 'sandbox', label: 'Sandboxes', color: '#A8B8C8',
    desc: 'Non-revenue. Drop an HTML file, get a URL.' },
  { id: 'unclassified', label: 'Unclassified', color: '#E2E8F0',
    desc: 'Needs triage — no class or lane recorded yet.' },
]

export const LANE_LABEL = { sandbox: 'Sandbox', prototype: 'Prototype', client_delivery: 'Client delivery' }
export const BUILD_CLASS_LABEL = {
  contracted_scope: 'Contracted scope', business_development: 'Business development',
  internal_product: 'Internal product', personal_tool: 'Personal tool',
}
export const CONTRACT_STATUS_LABEL = { none: 'No contract', in_process: 'Contract in process', executed: 'Contract executed' }

// Port of th-tools deriveCategory — order of checks matters.
export function deriveCategory(p) {
  const tags = p.tags || []
  if (p.type === 'subscribeable' || tags.includes('subscription')) return 'subscription'
  if (p.lane === 'sandbox' || p.type === 'sandbox') return 'sandbox'
  if (p.buildClass === 'internal_product' || p.buildClass === 'personal_tool') return 'internal'
  if (p.buildClass === 'business_development') return 'business_development'
  if (p.type === 'deployed-client') return 'deployed'
  if (p.buildClass === 'contracted_scope' || p.contractStatus === 'executed' || p.contractStatus === 'in_process' || p.client) return 'client_platform'
  return 'unclassified'
}

// Port of th-tools deriveState — lane × contract_status × build_class.
export function deriveState(p) {
  if (p.retired) return { state: 'retired', label: 'Retired' }
  const { lane, contractStatus, buildClass } = p
  if (!lane) return { state: 'unclassified', label: 'Unclassified' }
  const internal = buildClass === 'internal_product' || buildClass === 'personal_tool'
  const executed = contractStatus === 'executed'
  if (lane === 'sandbox') {
    return { state: 'sandbox', label: 'Sandbox',
      ...(executed && { caution: 'Executed contract on a sandbox — probably misclassified.' }) }
  }
  if (lane === 'prototype') {
    if (executed) return { state: 'paid_pilot', label: 'Paid pilot' }
    if (internal) return { state: 'internal_tool', label: 'Internal tool' }
    return { state: 'bd_demo', label: contractStatus === 'in_process' ? 'BD demo (contract in process)' : 'BD demo' }
  }
  if (executed) return { state: 'production', label: 'Production' }
  if (internal) return { state: 'internal_production', label: 'Internal production' }
  return { state: 'needs_review', label: 'Needs contract review',
    caution: 'Client delivery lane without an executed contract — confirm contract status or lane.' }
}

// Connector color = derived state (one syntax everywhere).
export const STATE_COLOR = {
  production: '#43D392', internal_production: '#43D392', paid_pilot: '#43D392',
  bd_demo: '#F8C761', internal_tool: '#F8C761', sandbox: '#A8B8C8',
  needs_review: '#F87171', unclassified: '#E2E8F0', retired: '#F87171',
}

// Governance fields the registrar expects — NULLs are the triage queue.
export function registryOpenItems(r) {
  const items = []
  if (!r.lane) items.push('lane is NULL — sandbox / prototype / client_delivery undecided')
  if (!r.buildClass) items.push('build_class is NULL — contracted scope vs BD vs internal undecided')
  if (!r.contractStatus) items.push('contract_status is NULL')
  if (!r.steward) items.push('no steward assigned')
  if (!r.github) items.push('no GitHub repo recorded')
  const st = deriveState(r)
  if (st.caution) items.push(st.caution)
  return items
}

// Chip dot = health: ok / needs attention / critical.
export function registryHealth(r) {
  const st = deriveState(r)
  if (st.state === 'needs_review') return 'critical'
  if (registryOpenItems(r).length > 0 || st.state === 'unclassified') return 'warn'
  return 'ok'
}

export const REGISTRY = [
  {
    "id": "achp",
    "name": "ACHP Dashboard",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": "contracted_scope",
    "contractStatus": "in_process",
    "tags": [],
    "client": "Alliance of Community Health Plans",
    "url": "https://achp-dashboard.vercel.app",
    "github": "ds016683/achp-dashboard",
    "vercel": "achp-dashboard",
    "supabase": "achp-dashboard",
    "steward": "Topher Rasmussen",
    "users": [
      "David",
      "Topher",
      "Toni (achp)",
      "Jonathan (achp)",
      "Thomasina (achp)"
    ],
    "dataClass": null,
    "retired": true,
    "updatedAt": "2026-07-07"
  },
  {
    "id": "sandbox-achp-bill-tracker-review",
    "name": "achp-bill-tracker-mockups",
    "type": "sandbox",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://sandbox.thirdhorizon.com/achp-bill-tracker-review/",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": "synthetic",
    "retired": true,
    "updatedAt": "2026-08-05"
  },
  {
    "id": "aha-prevention-index-mpbqf6jh",
    "name": "AHA Prevention Index",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": "business_development",
    "contractStatus": "none",
    "tags": [],
    "client": null,
    "url": "https://aha-prevention-index.vercel.app/",
    "github": "Third-Horizon-Strategies/aha-prevention-index",
    "vercel": "aha-prevention-index",
    "supabase": null,
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-08-07"
  },
  {
    "id": "ai-attitudes-mr4zvfzc",
    "name": "ai-attitudes",
    "type": "th-hosted",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://ai-attitudes.com",
    "github": "thtopher/ai-attitudes",
    "vercel": "ai-attitudes",
    "supabase": "gjmqltzcioyycpftlvms",
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-03"
  },
  {
    "id": "apnc-codesign-mr3wmpae",
    "name": "APNC Co-design",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": "Addiction Professionals of North Carolina (APNC)",
    "url": "",
    "github": "Third-Horizon-Strategies/apnc-sandbox",
    "vercel": "apnc-sandbox",
    "supabase": null,
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "bellwether-mr50eses",
    "name": "bellwether",
    "type": "th-hosted",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://bellwether.thirdhorizon.com",
    "github": "ds016683/bellwether",
    "vercel": "bellwether",
    "supabase": "wxvovzzvkngsqvsqiaix",
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-03"
  },
  {
    "id": "sandbox-claude-architect-demo",
    "name": "CCAF Demo Test",
    "type": "sandbox",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://claude-architect-demo.sandbox.thirdhorizon.com",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": "synthetic",
    "retired": true,
    "updatedAt": "2026-07-08"
  },
  {
    "id": "choa-dashboard-mrfddqfy",
    "name": "choa-dashboard",
    "type": "th-hosted",
    "lane": "prototype",
    "buildClass": "business_development",
    "contractStatus": "none",
    "tags": [],
    "client": null,
    "url": "https://github.com/ds016683/choa-dashboard",
    "github": "ds016683/choa-dashboard",
    "vercel": null,
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-10"
  },
  {
    "id": "clarvida-prototype-mr3ownpr",
    "name": "Clarvida Prototype",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": "contracted_scope",
    "contractStatus": "in_process",
    "tags": [],
    "client": null,
    "url": "",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Alex",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-28"
  },
  {
    "id": "intermountain-benchmark-mr3ownpv",
    "name": "Intermountain Benchmark Modeling",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": null,
    "contractStatus": "none",
    "tags": [],
    "client": "Intermountain",
    "url": "",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": null,
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-10"
  },
  {
    "id": "kennedy-forum-bipolar-mr3ownpw",
    "name": "Kennedy Forum Bipolar",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": "contracted_scope",
    "contractStatus": "executed",
    "tags": [],
    "client": "The Kennedy Forum",
    "url": "",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Greg Williams",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-10"
  },
  {
    "id": "mj-summary-reporting-mr3ownpt",
    "name": "MJ Summary Reporting",
    "type": "deployed-client",
    "lane": "client_delivery",
    "buildClass": "contracted_scope",
    "contractStatus": "executed",
    "tags": [],
    "client": "MJ Insurance",
    "url": "",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Tanner",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-10"
  },
  {
    "id": "mma-tracker",
    "name": "MMA Client Dashboard",
    "type": "deployed-client",
    "lane": "client_delivery",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": "Marsh and McLennan Agency (MMA) Core Production",
    "url": "https://ds016683.github.io/mma-tracker",
    "github": "Third-Horizon-Strategies/mma-tracker",
    "vercel": null,
    "supabase": null,
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-10"
  },
  {
    "id": "mma-netnav-clone-mr3ownpu",
    "name": "MMA Network Navigator Clone",
    "type": "deployed-client",
    "lane": "prototype",
    "buildClass": "contracted_scope",
    "contractStatus": null,
    "tags": [],
    "client": "Marsh and McLennan Agency (MMA) Core Production",
    "url": "https://nn2sandbox.thirdhorizon.com/",
    "github": "Third-Horizon-Strategies/th-nn-2-sandbox",
    "vercel": "firebase",
    "supabase": "firabase",
    "steward": "Cheryl Matochik",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-08-07"
  },
  {
    "id": "sandbox-cch-landscape-analysis",
    "name": "NACDD",
    "type": "sandbox",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://cch-landscape-analysis.sandbox.thirdhorizon.com",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Lindsay Reeves",
    "users": [],
    "dataClass": "synthetic",
    "retired": true,
    "updatedAt": "2026-08-06"
  },
  {
    "id": "odin-mpaecjun",
    "name": "Odin",
    "type": "subscribeable",
    "lane": "prototype",
    "buildClass": "business_development",
    "contractStatus": "none",
    "tags": [],
    "client": "Third Horizon Strategies",
    "url": "odin.thirdhorizon.com",
    "github": "Third-Horizon-Strategies/odin-sandbox-app",
    "vercel": null,
    "supabase": null,
    "steward": "Courtney Shammas",
    "users": [
      "Th Internal"
    ],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-08-24"
  },
  {
    "id": "parity-interface-mr3wmpad",
    "name": "Parity Interface",
    "type": "sandbox",
    "lane": "client_delivery",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": "The Kennedy Forum",
    "url": "",
    "github": "Third-Horizon-Strategies/parity-interface-demo",
    "vercel": "parity_interface_demo",
    "supabase": null,
    "steward": "Elveena Fareedi",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "sandbox-parity-interface-demo",
    "name": "parity interface demo",
    "type": "sandbox",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://parity-interface-demo.sandbox.thirdhorizon.com",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Elveena Fareedi",
    "users": [],
    "dataClass": "synthetic",
    "retired": true,
    "updatedAt": "2026-07-03"
  },
  {
    "id": "pomegranate",
    "name": "Pomegranate Market",
    "type": "deployed-client",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": "Pomegranate Market",
    "url": "https://ds016683.github.io/cp-pomegranate-CMH-26-01-POM/",
    "github": "Third-Horizon-Strategies/pomegranate",
    "vercel": "pomegranate-market",
    "supabase": null,
    "steward": "Cheryl Matochik",
    "users": [
      "Lindsay Reeves"
    ],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-05-22"
  },
  {
    "id": "project-clarity-mr3wmpaf",
    "name": "Project Clarity",
    "type": "th-hosted",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-02"
  },
  {
    "id": "promise",
    "name": "Promise Rate Intelligence",
    "type": "deployed-client",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": "Marsh and McLennan Agency (MMA) Core Production",
    "url": "https://promise-rate-intelligence.vercel.app",
    "github": "Third-Horizon-Strategies/promise-rate-intelligence",
    "vercel": "promise-rate-intelligence",
    "supabase": "vbzteaulswokozkvfhus",
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": true,
    "updatedAt": "2026-05-22"
  },
  {
    "id": "pshp-rate-intelligence-mpd6xmfd",
    "name": "PSHP Rate Intelligence",
    "type": "deployed-client",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": "Intermountain",
    "url": "https://pshp-rate-intelligence.vercel.app/",
    "github": "ds016683/pshp-rate-intelligence",
    "vercel": "pshp-rate-intelligence",
    "supabase": "vbzteaulswokozkvfhus",
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "purpleco-mr3wmpag",
    "name": "PurpleCo",
    "type": "deployed-client",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": null,
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-02"
  },
  {
    "id": "sandbox-ratecompass",
    "name": "ratecompass",
    "type": "sandbox",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://ratecompass.sandbox.thirdhorizon.com",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Ashley DeGarmo",
    "users": [],
    "dataClass": "synthetic",
    "retired": true,
    "updatedAt": "2026-07-07"
  },
  {
    "id": "sandbox-retina-test",
    "name": "retina test",
    "type": "sandbox",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://retina-test.sandbox.thirdhorizon.com",
    "github": null,
    "vercel": null,
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": "synthetic",
    "retired": true,
    "updatedAt": "2026-07-09"
  },
  {
    "id": "sa-hud",
    "name": "Sovereign Architect HUD",
    "type": "th-hosted",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "",
    "github": "ds016683/sa-hud",
    "vercel": null,
    "supabase": null,
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "sovereign-architect-hud-mr9mrbz1",
    "name": "sovereign-architect-hud",
    "type": "th-hosted",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://github.com/thtopher/sovereign-architect-hud",
    "github": "thtopher/sovereign-architect-hud",
    "vercel": null,
    "supabase": "cmuvomnmaoseccxpeuxq",
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "pipeline-rebuild",
    "name": "Starset Rate Compass",
    "type": "subscribeable",
    "lane": "client_delivery",
    "buildClass": "business_development",
    "contractStatus": "none",
    "tags": [],
    "client": "BH Rate Intelligence Development",
    "url": "https://th-bh-ratebook--th-ai-apps-dev.us-central1.hosted.app/",
    "github": "Third-Horizon-Strategies/th-bh-ratebook",
    "vercel": "bh-rate-intelligence",
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-08-03"
  },
  {
    "id": "starset-app-sandbox-mr9mjcvt",
    "name": "starset-app-sandbox",
    "type": "th-hosted",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://starset-beta.vercel.app",
    "github": "ds016683/starset-app-sandbox",
    "vercel": "starset-beta",
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "th-finance-binder",
    "name": "TH Finance Binder",
    "type": "th-hosted",
    "lane": "prototype",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "",
    "github": "ds016683/th-finance-binder",
    "vercel": null,
    "supabase": null,
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "th-tools-mp7pwvzf",
    "name": "TH Tools",
    "type": "th-hosted",
    "lane": "prototype",
    "buildClass": "internal_product",
    "contractStatus": "none",
    "tags": [],
    "client": "Third Horizon Strategies - Internal Activities",
    "url": "https://tools.thirdhorizon.com",
    "github": "Third-Horizon-Strategies/th-tools",
    "vercel": "thtophers-projects/th-tools",
    "supabase": "rkbcyknfxyxoywwpntwi.supabase.co",
    "steward": "Topher Rasmussen",
    "users": [
      "Th Staff & Leadership"
    ],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-06"
  },
  {
    "id": "th-cip-mr59iy2r",
    "name": "TH-CIP",
    "type": "th-hosted",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://cim.thirdhorizon.com",
    "github": "ds016683/TH-CIP",
    "vercel": "th-canvas",
    "supabase": "pkjessvuwkiuszbkptcx",
    "steward": "David Smith",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-03"
  },
  {
    "id": "th-finance-binder-mr9mtd25",
    "name": "th-finance-binder",
    "type": "th-hosted",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://th-finance-binder.vercel.app",
    "github": "ds016683/th-finance-binder",
    "vercel": "th-finance-binder",
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-08-24"
  },
  {
    "id": "th-skills-mr4zupsf",
    "name": "th-skills",
    "type": "th-hosted",
    "lane": null,
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://github.com/Third-Horizon-Strategies/th-skills",
    "github": "Third-Horizon-Strategies/th-skills",
    "vercel": null,
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-03"
  },
  {
    "id": "th-wiki-mr4zvjof",
    "name": "th-wiki",
    "type": "th-hosted",
    "lane": "sandbox",
    "buildClass": null,
    "contractStatus": null,
    "tags": [],
    "client": null,
    "url": "https://github.com/thtopher/th-wiki",
    "github": "thtopher/th-wiki",
    "vercel": null,
    "supabase": null,
    "steward": "Topher Rasmussen",
    "users": [],
    "dataClass": null,
    "retired": false,
    "updatedAt": "2026-07-03"
  }
]
