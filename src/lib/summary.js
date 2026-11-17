// The Mission Summary (the yay page, David's word, 10/12): one object per
// closed mission. Type, miles netted (computed from the badge rules), dates,
// clock, gates, Achieved in David's words, and what it left behind.
import { supabase } from './supabase'
import { sizeOf, SIZES } from './loadout'
import { BADGES } from '../constants/collection'
import { GREEN, PURPLE } from '../components/river/canon'

const q = (p) => p.then(r => (r.error ? [] : (Array.isArray(r.data) ? r.data : [])))
// Gates (David 11/17): "a gate should pay 7 miles. any gate. all others stay the same." No cap, any
// mission; the Main Mission milestone's 10 and the Mythic's first five at 10 are retired. A mission
// closed before GATES_FROM reads at the rates it was paid.
export const GATES_FROM = '2026-11-17'
export const MILES = { bounty: 4, contract: 15, mythic: 50, gate: 7, mmt: 7, mainMission: 100, adhoc: 1 }
export const baseMiles = (size) => size === 'heavy' ? MILES.mythic : size === 'medium' ? MILES.contract : MILES.bounty
export const kindOf = (o, linked) => linked ? 'Main Mission' : (o?.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission'
export const typeOf = (kind, size) => kind === 'Main Mission' ? 'Main Mission Gate' : kind === 'Ad Hoc' ? 'Ad Hoc' : SIZES[size].label
export const badgeOf = (kind, size) => kind === 'Main Mission' ? 'gate' : kind === 'Ad Hoc' ? 'impromptu' : size === 'heavy' ? 'mythic' : size === 'medium' ? 'contract' : 'bounty'
// Medallion color: a Side Mission takes its type's color (Bounty gold, Contract baby blue, Mythic purple); a Main Mission task is purple; Ad Hoc green.
export const colorOf = (kind, size) => kind === 'Main Mission' ? PURPLE : kind === 'Ad Hoc' ? GREEN : SIZES[size].color
export const milesFor = (kind, size, gatesDone = 0, closed = null) => {
  const old = !!closed && String(closed).slice(0, 10) < GATES_FROM
  if (kind === 'Main Mission') return old ? 10 : MILES.gate
  if (kind === 'Ad Hoc') return MILES.adhoc
  return old ? baseMiles(size) + (size === 'heavy' ? 10 * Math.min(gatesDone, 5) : 0) : baseMiles(size) + MILES.gate * gatesDone
}

export async function missionSummary(objectiveId) {
  const [o] = await q(supabase.from('objectives').select('*').eq('id', objectiveId).limit(1))
  if (!o) throw new Error('mission not found')
  const [steps, clocks, archive, links] = await Promise.all([
    q(supabase.from('objective_steps').select('text,done,done_at,position').eq('objective_id', o.id).order('position')),
    q(supabase.from('clocks').select('day,minutes,started_at,stopped_at').eq('objective_id', o.id)),
    q(supabase.from('archive_entries').select('id,kind,title,summary,realm,path,bucket,filed_at,body').eq('source_id', o.id).order('id')),
    q(supabase.from('project_tasks').select('id,text,project_id,released_at').eq('objective_id', o.id).limit(1)),
  ])
  const link = links[0] || null
  const project = link ? (await q(supabase.from('projects').select('id,name,key,description').eq('id', link.project_id).limit(1)))[0] || null : null
  const tags = o.tags || []
  const size = sizeOf(o)
  const kind = kindOf(o, !!link)
  const type = typeOf(kind, size)
  const gatesDone = steps.filter(s => s.done).length
  const miles = milesFor(kind, size, gatesDone, o.released_at || link?.released_at || null)
  const badge = badgeOf(kind, size)
  const minutes = clocks.reduce((s, c) => s + (c.stopped_at ? Number(c.minutes) || 0 : (Date.now() - new Date(c.started_at)) / 60000), 0)
  const opened = o.captured_at || o.activated_at || null
  const closed = o.released_at || link?.released_at || null
  const days = opened && closed ? Math.max(1, Math.round((new Date(closed) - new Date(opened)) / 864e5)) : null
  const sum = archive.find(a => a.kind === 'summary')
  // Achieved is David's own answer (filed at close) or the Archive summary; the description is
  // where the item came from, not what was achieved (David 11/9), so it reads as origin.
  const achieved = sum?.body?.achieved || sum?.summary || null
  const origin = o.description ? String(o.description).split('\n')[0].slice(0, 200) : null
  return {
    id: o.id, title: o.title, kind, type, size, badge, color: colorOf(kind, size), objective: o, badgeLabel: BADGES[badge]?.label, lore: BADGES[badge]?.lore,
    project: project?.name || null, projectKey: project?.key || null, task: link ? link.text : null,
    personal: tags.includes('personal'), state: o.state, released_kind: o.released_kind,
    miles, gatesDone, gatesTotal: steps.length, gatesPaid: gatesDone,
    opened, closed, days, minutes: Math.round(minutes),
    gates: steps, achieved, origin, achievedFrom: sum?.body?.achieved ? 'achieved' : sum ? 'archive' : null,
    north_star: link ? (project?.description || null) : (o.north_star || null),
    attachments: archive.filter(a => a.kind !== 'summary'),
  }
}
export const fmtDay = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
