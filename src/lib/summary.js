// The Mission Summary (the yay page, David's word, 10/12): one object per
// closed mission. Type, miles netted (computed from the badge rules), dates,
// clock, gates, Achieved in David's words, and what it left behind.
import { supabase } from './supabase'
import { sizeOf, SIZES } from './loadout'
import { BADGES } from '../constants/collection'

const q = (p) => p.then(r => (r.error ? [] : (Array.isArray(r.data) ? r.data : [])))
export const MILES = { bounty: 4, contract: 15, mythic: 50, gate: 10, gatesPaid: 5, mmt: 10, mainMission: 100, adhoc: 1 }
export const kindOf = (o, linked) => linked ? 'Main Mission' : (o?.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission'
export const typeOf = (kind, size) => kind === 'Main Mission' ? 'Main Mission task' : kind === 'Ad Hoc' ? 'Ad Hoc' : SIZES[size].label
export const badgeOf = (kind, size) => kind === 'Main Mission' ? 'mission-task' : kind === 'Ad Hoc' ? 'impromptu' : size === 'heavy' ? 'mythic' : size === 'medium' ? 'contract' : 'bounty'
// Medallion color: a Side Mission takes its type's color (Bounty gold, Contract baby blue, Mythic purple); a Main Mission task is purple; Ad Hoc green.
export const colorOf = (kind, size) => kind === 'Main Mission' ? '#B4A3E8' : kind === 'Ad Hoc' ? '#43D392' : SIZES[size].color
export const milesFor = (kind, size, gatesDone = 0) => kind === 'Main Mission' ? MILES.mmt : kind === 'Ad Hoc' ? MILES.adhoc : size === 'heavy' ? MILES.mythic + MILES.gate * Math.min(gatesDone, MILES.gatesPaid) : size === 'medium' ? MILES.contract : MILES.bounty

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
  const miles = milesFor(kind, size, gatesDone)
  const badge = badgeOf(kind, size)
  const minutes = clocks.reduce((s, c) => s + (c.stopped_at ? Number(c.minutes) || 0 : (Date.now() - new Date(c.started_at)) / 60000), 0)
  const opened = o.captured_at || o.activated_at || null
  const closed = o.released_at || link?.released_at || null
  const days = opened && closed ? Math.max(1, Math.round((new Date(closed) - new Date(opened)) / 864e5)) : null
  const sum = archive.find(a => a.kind === 'summary')
  const achieved = sum?.summary || o.description || null
  return {
    id: o.id, title: o.title, kind, type, size, badge, color: colorOf(kind, size), objective: o, badgeLabel: BADGES[badge]?.label, lore: BADGES[badge]?.lore,
    project: project?.name || null, projectKey: project?.key || null, task: link ? link.text : null,
    personal: tags.includes('personal'), state: o.state, released_kind: o.released_kind,
    miles, gatesDone, gatesTotal: steps.length, gatesPaid: Math.min(gatesDone, MILES.gatesPaid),
    opened, closed, days, minutes: Math.round(minutes),
    gates: steps, achieved, achievedFrom: sum ? 'archive' : o.description ? 'description' : null,
    north_star: link ? (project?.description || null) : (o.north_star || null),
    attachments: archive.filter(a => a.kind !== 'summary'),
  }
}
export const fmtDay = (iso) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
