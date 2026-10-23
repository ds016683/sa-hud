// The seven domains of the MMA 2027 work (David, 10/19 to 10/23): the construct
// for the contract and for how the work is managed. Each carries a visual
// identity: a code, a color, a glyph, and one line. The Program lane holds the
// milestones and governance that sit above the domains.
import { Database, Users, Anchor, LayoutDashboard, Wand2, Network, ScrollText, Flag } from 'lucide-react'

export const PROGRAM_LANE = { id: 'Program', code: 'PG', color: '#D9D4C7', icon: Flag, line: 'Milestones, the readiness gate, the quarterly cadence, the agreement.' }

export const MMA_DOMAINS = [
  { n: 1, id: 'Data Production', code: 'DP', color: '#43D392', icon: Database, line: 'The national production and the two releases a year, run inside Third Horizon.' },
  { n: 2, id: 'Regional Engagement', code: 'RE', color: '#E6B54F', icon: Users, line: 'The national paper, market reports, the quarterly town hall, the Raleigh pilot, Thresholds, regional reporting, real-time analytics support.' },
  { n: 3, id: 'NetNav 2.0 Port', code: 'NP', color: '#A9C9E8', icon: Anchor, baseline: true, line: 'The cutover into MMA\'s environment: Voyager, security, the pilot, the readiness gate, launch, the Handl sunset.' },
  { n: 4, id: 'Static Tooling', code: 'ST', color: '#B4A3E8', icon: LayoutDashboard, line: 'Dashboards and modules turned on by release: rate lookup, network evaluation, steerage by use case, drug pricing, episodes.' },
  { n: 5, id: 'Platform Tooling', code: 'PT', color: '#96A8F0', icon: Wand2, line: 'Dynamic tooling and the consultative engagement model: the AI surface and the push-button client deliverable.' },
  { n: 6, id: 'Network and Data Enhancements', code: 'NE', color: '#E8836F', icon: Network, line: 'Network additions and other data enhancements: the request, approval, underwriting, and cutoff mechanism in the contract.' },
  { n: 7, id: 'Updated Schema and Rules', code: 'SR', color: '#5FC3BC', icon: ScrollText, line: 'CMS schema and rules changes: a $150K set-aside with its own trigger, part of the time-related hand-off.' },
]

export const PLAN_LANES = [PROGRAM_LANE, ...MMA_DOMAINS].map(d => ({ id: d.id, color: d.color, baseline: !!d.baseline }))
export const domainOf = (id) => [PROGRAM_LANE, ...MMA_DOMAINS].find(d => d.id === id) || null

// The views of the planning waterfall. Each reads a different field on the item.
export const PLAN_VIEWS = [
  { id: 'strategy', label: 'Strategy', field: 'objective', hint: 'What this item makes true' },
  { id: 'ops', label: 'Ops', field: 'cadence', hint: 'Who runs it and how often' },
  { id: 'budget', label: 'Budget', field: 'cost', hint: 'What it costs and how it is priced' },
]
