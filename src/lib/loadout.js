// The Loadout (David, 9/27): what he carries into the day. Mirror of
// api/_loadout.mjs for the HUD's own hands (the Board page and the River).
//
//   Slots     three items active at once, one of them Heavy at most
//   Size      Light (an hour or less), Medium (a half day), Heavy (a full day)
//   Equipped  exactly one clock runs at a time
//   Stamina   free hours before 6 PM Chicago after remaining meetings
//   Extract   release: stop the clock, sum the segments, bank the miles
import { supabase } from './supabase'

export const SLOTS = 3
export const HEAVY_MAX = 1
export const DAY_END_HOUR = 18
export const SIZES = {
  light:  { label: 'Light',  hours: 1, effort: 1, color: '#9DB0C1' },
  medium: { label: 'Medium', hours: 4, effort: 3, color: '#A9C9E8' },
  heavy:  { label: 'Heavy',  hours: 8, effort: 5, color: '#E6B54F' },
}
export const sizeOf = (o) => { const e = Number(o?.effort) || 1; return e >= 4 ? 'heavy' : e === 3 ? 'medium' : 'light' }
export const effortOf = (size) => (SIZES[size] || SIZES.light).effort
export const hoursOf = (o) => SIZES[sizeOf(o)].hours

export const chiToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export function hoursToDayEnd(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]))
  return Math.max(0, DAY_END_HOUR - ((Number(p.hour) % 24) + Number(p.minute) / 60))
}
export const fmtClock = (mins) => {
  const m = Math.max(0, Math.round(mins))
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m` : `${m}m`
}

const q = (p) => p.then(r => { if (r.error) console.warn('loadout', r.error.message); return Array.isArray(r.data) ? r.data : [] })

export async function fetchLoadout() {
  const day = chiToday()
  const nowIso = new Date().toISOString()
  const [active, clocks, events, links, projects] = await Promise.all([
    q(supabase.from('objectives').select('id,title,state,tags,effort,due_date,activated_at,captured_at,description').eq('state', 'active').is('deleted_at', null).order('activated_at', { ascending: true })),
    q(supabase.from('clocks').select('id,objective_id,day,started_at,stopped_at,minutes').or(`stopped_at.is.null,day.eq.${day}`)),
    q(supabase.from('calendar_events').select('subject,start_at,end_at,is_all_day').eq('day', day).eq('is_cancelled', false)),
    q(supabase.from('project_tasks').select('objective_id,project_id').not('objective_id', 'is', null)),
    q(supabase.from('projects').select('id,name')),
  ])
  const projName = new Map(projects.map(p => [p.id, p.name]))
  const projByObj = new Map(links.map(l => [l.objective_id, projName.get(l.project_id)]))
  const projIdByObj = new Map(links.map(l => [l.objective_id, l.project_id]))
  const running = clocks.find(c => !c.stopped_at) || null
  const now = Date.now()
  const minutesFor = (id) => clocks.filter(c => c.objective_id === id).reduce((s, c) => s + (c.stopped_at ? (Number(c.minutes) || 0) : (now - new Date(c.started_at).getTime()) / 60000), 0)
  const items = active.map(o => {
    const tags = o.tags || []
    return {
      id: o.id, title: o.title, tags, size: sizeOf(o), hours: hoursOf(o), due_date: o.due_date, activated_at: o.activated_at,
      equipped: !!running && running.objective_id === o.id, running_since: running && running.objective_id === o.id ? running.started_at : null,
      minutes_today: minutesFor(o.id),
      session: tags.includes('session'),
      project: projByObj.get(o.id) || null, project_id: projIdByObj.get(o.id) || null, description: o.description || null,
      kind: tags.includes('impromptu') ? 'Impromptu' : (projByObj.has(o.id) || tags.includes('mission-task')) ? 'Main Mission' : tags.includes('session') ? 'Session' : 'Side Mission',
      personal: tags.includes('personal'), adhoc: tags.includes('impromptu'), call: tags.includes('call'),
    }
  })
  // Three slots for planned work; the Ad Hoc slot carries impromptu items
  // (one at a time) and never counts against the three (David, 10/7).
  const board = items.filter(i => !i.session && !i.adhoc)
  const adhoc = items.filter(i => !i.session && i.adhoc)
  const meetingsLeft = events.filter(e => !e.is_all_day && e.end_at > nowIso).reduce((s, e) => s + Math.max(0, (new Date(e.end_at) - Math.max(now, new Date(e.start_at))) / 3600e3), 0)
  const free = Math.max(0, Math.round((hoursToDayEnd() - meetingsLeft) * 10) / 10)
  const loaded = Math.round(board.reduce((s, i) => s + i.hours, 0) * 10) / 10
  return {
    day, items, board, adhoc, sessions: items.filter(i => i.session),
    equipped: items.find(i => i.equipped) || null,
    slots: { used: board.length, max: SLOTS }, heavy: { used: board.filter(i => i.size === 'heavy').length, max: HEAVY_MAX },
    stamina: { free, loaded, meetingsLeft: Math.round(meetingsLeft * 10) / 10, afterHours: hoursToDayEnd() === 0 },
    clocksTable: true,
  }
}

async function stopClock(c) {
  const stopped = new Date()
  const minutes = Math.max(0, Math.round((stopped - new Date(c.started_at)) / 60000 * 10) / 10)
  await supabase.from('clocks').update({ stopped_at: stopped.toISOString(), minutes }).eq('id', c.id)
  return minutes
}

// Run this item's clock; holster every other clock.
export async function equip(objectiveId) {
  const running = await q(supabase.from('clocks').select('id,objective_id,started_at').is('stopped_at', null))
  for (const c of running) {
    if (c.objective_id === objectiveId) return { already: true }
    await stopClock(c)
  }
  const { error } = await supabase.from('clocks').insert({ objective_id: objectiveId, day: chiToday(), started_at: new Date().toISOString(), note: 'equipped on the Board' })
  if (error) throw new Error(error.message)
  return { ok: true }
}

export async function holster(objectiveId) {
  const running = await q(supabase.from('clocks').select('id,objective_id,started_at').eq('objective_id', objectiveId).is('stopped_at', null))
  let minutes = 0
  for (const c of running) minutes += await stopClock(c)
  return { minutes }
}

// Total clocked minutes on an item, all days (stops a running clock first).
export async function clockedMinutes(objectiveId) {
  await holster(objectiveId)
  const rows = await q(supabase.from('clocks').select('minutes').eq('objective_id', objectiveId))
  return Math.round(rows.reduce((s, r) => s + (Number(r.minutes) || 0), 0))
}

// Stash: park the item (it stays planned), clock holstered.
export async function stash(objectiveId) {
  await holster(objectiveId)
  const { error } = await supabase.from('objectives').update({ state: 'parked', activated_at: null }).eq('id', objectiveId)
  if (error) throw new Error(error.message)
}

// Extract: release the item, keep its clock in the Ledger (never Harvest),
// close a linked Main Mission task, file a note if there is one.
export async function extract(item, { minutes, note } = {}) {
  const clocked = await clockedMinutes(item.id)
  const fallback = item.activated_at ? Math.max(1, Math.round((Date.now() - new Date(item.activated_at).getTime()) / 60000)) : 0
  const mins = Number(minutes) > 0 ? Math.round(Number(minutes)) : (clocked || fallback)
  const now = new Date().toISOString()
  const { error } = await supabase.from('objectives').update({ state: 'released', released_kind: 'done', released_at: now, activated_at: null }).eq('id', item.id)
  if (error) throw new Error(error.message)
  await supabase.from('project_tasks').update({ status: 'done', done: true, released_at: now }).eq('objective_id', item.id).neq('status', 'done')
  const personal = item.personal
  await supabase.from('daily_logs').insert({
    day: chiToday(), kind: 'activity', what: item.title, value: mins,
    note: `${personal ? 'personal' : 'work'} · ${item.kind} clock · ${clocked ? `${clocked} clocked` : 'no clock'}${Number(minutes) > 0 ? ` · David stated ${mins}` : ''}${note ? ` · ${note}` : ''}`,
    source: `objective:${item.id}`,
  })
  return { minutes: mins, clocked, personal }
}

// ---- Putting things on the board from the Board page itself -------------------
export const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

// Same rules as the server: slots, one Heavy, stamina during the working day.
export function fitReasons(L, size = 'light', { alreadyLoadedId, adhoc = false } = {}) {
  const reasons = []
  const already = alreadyLoadedId && L.items.some(i => i.id === alreadyLoadedId)
  if (already) return reasons
  if (adhoc) { if (L.adhoc.length) reasons.push(`the Ad Hoc slot is taken: ${L.adhoc[0].title}. Dispatch it first.`); return reasons }
  const hours = (SIZES[size] || SIZES.light).hours
  if (L.slots.used >= SLOTS) reasons.push(`the loadout is full (${L.slots.used}/${SLOTS}): ${L.board.map(i => i.title).join(' | ')}`)
  if (size === 'heavy' && L.heavy.used >= HEAVY_MAX) reasons.push('a Heavy item is already loaded')
  if (!L.stamina.afterHours && L.stamina.loaded + hours > L.stamina.free) reasons.push(`stamina: ${L.stamina.loaded}h loaded + ${hours}h vs ${L.stamina.free}h free before 6 PM`)
  return reasons
}

// Activate an objective (if it is not already) and run its clock. The Morning
// Protocol loads items without starting a clock (clock: false); Launch picks
// the one that runs.
export async function equipObjective(objectiveId, { size, clock = true } = {}) {
  const L = await fetchLoadout()
  const o = (await q(supabase.from('objectives').select('id,title,state,effort,tags').eq('id', objectiveId).limit(1)))[0]
  if (!o) throw new Error('objective not found')
  const sz = size || sizeOf(o)
  if (o.state !== 'active') {
    const reasons = fitReasons(L, sz, { alreadyLoadedId: o.id })
    if (reasons.length) return { ok: false, reasons }
    const { error } = await supabase.from('objectives').update({ state: 'active', activated_at: new Date().toISOString(), released_at: null, released_kind: null, ...(size ? { effort: effortOf(size) } : {}) }).eq('id', o.id)
    if (error) throw new Error(error.message)
  }
  if (clock) await equip(o.id)
  return { ok: true, title: o.title, id: o.id }
}

// A Main Mission task onto the board: reuse its linked objective or create the
// bridge (the same one Lumen's activate_project_task creates), then equip.
export async function equipTask(task, projectName, { clock = true } = {}) {
  if (task.objective_id) return equipObjective(task.objective_id, { clock })
  const L = await fetchLoadout()
  const reasons = fitReasons(L, 'light')
  if (reasons.length) return { ok: false, reasons }
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('objectives').insert({
    user_id: DAVID, title: String(task.text || '').slice(0, 120), state: 'active', kind: 'execution', effort: 1, importance: 2, needs_sizing: false,
    tags: ['mission-task'], description: `Promoted from project: ${projectName || 'Project'}`, captured_at: now, activated_at: now,
  }).select().single()
  if (error) throw new Error(error.message)
  await supabase.from('project_tasks').update({ objective_id: data.id, status: task.status === 'blocked' ? 'blocked' : 'promoted' }).eq('id', task.id)
  if (clock) await equip(data.id)
  return { ok: true, title: data.title, id: data.id }
}

// Impromptu: something David is doing right now that was never planned. Goes on
// the board tagged impromptu (1 mile on extract), Light, timer running.
export async function addImpromptu(title, { personal = false, tags = [] } = {}) {
  const text = String(title || '').trim()
  if (!text) throw new Error('say what you are doing')
  const L = await fetchLoadout()
  const reasons = fitReasons(L, 'light', { adhoc: true })
  if (reasons.length) return { ok: false, reasons }
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('objectives').insert({
    user_id: DAVID, title: text.slice(0, 160), state: 'active', kind: 'execution', effort: 1, importance: 2, needs_sizing: false,
    tags: [...new Set(['impromptu', ...(personal ? ['personal'] : []), ...tags])], captured_at: now, activated_at: now,
  }).select().single()
  if (error) throw new Error(error.message)
  await equip(data.id)
  return { ok: true, id: data.id, title: data.title }
}
