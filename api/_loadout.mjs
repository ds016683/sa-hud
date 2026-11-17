// The Loadout (David, 9/27): what he carries into the day.
//
//   Slots     two mission slots, Primary and Secondary, one mission each; the Utility slot is the third
//             (the slot economy, David 10/7)
//   Type      Bounty (1 slot, a quick hit), Contract (2 slots, a standard job),
//             Mythic (3 slots, several steps, the only type with a steps module); bigger than that is a Main
//             Mission, split into tasks
//   Equipped  exactly one item's clock runs at a time; equipping another
//             holsters the rest
//   Hours     free hours left before 6 PM Chicago after the meetings still to (shown, never enforced: David 10/21)
//             come; the loadout's hours can't exceed it
//   Extract   release: stop the clock, sum the segments, bank the miles
//
// Sizes ride the existing objectives.effort column (1-2 Light, 3 Medium,
// 4-5 Heavy) so nothing in the Side Missions history is lost. Clocks live in
// `clocks` (sql/2026-09-27-loadout.sql). Harvest is never touched.
import { sb, sbWrite, chiToday } from './_ledger.mjs'

export const SLOTS = 2   // Primary and Secondary, one mission each (David 11/17); the Utility slot is the third
export const HEAVY_MAX = 1
export const DAY_END_HOUR = 18
export const SIZES = {
  light:  { label: 'Bounty',  slots: 1, hours: 1, effort: 1 },
  medium: { label: 'Contract',  slots: 1, hours: 4, effort: 3 },
  heavy:  { label: 'Mythic', slots: 1, hours: 8, effort: 5 },
}
export const sizeOf = (o) => { const e = Number(o?.effort) || 1; return e >= 4 ? 'heavy' : e === 3 ? 'medium' : 'light' }
export const effortOf = (size) => (SIZES[String(size || '').toLowerCase()] || SIZES.light).effort
export const hoursOf = (o) => SIZES[sizeOf(o)].hours

// Chicago clock math without a tz library: format the instant in Chicago and
// read the parts back.
function chicagoParts(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(x => [x.type, x.value]))
  return { day: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, minute: Number(p.minute) }
}
export function hoursToDayEnd(d = new Date()) {
  const { hour, minute } = chicagoParts(d)
  return Math.max(0, DAY_END_HOUR - (hour + minute / 60))
}

const isBoardItem = (o) => !(o.tags || []).includes('session')

// Everything on the board, with clocks and the day's hours.
export async function loadout() {
  const day = chiToday()
  const nowIso = new Date().toISOString()
  const [active, clocks, events, meetingsRunning, links, projects] = await Promise.all([
    sb(`objectives?select=id,title,state,tags,effort,due_date,activated_at,captured_at&state=eq.active&deleted_at=is.null&order=activated_at.asc`),
    sb(`clocks?select=id,objective_id,day,started_at,stopped_at,minutes&or=(stopped_at.is.null,day.eq.${day})`).catch(() => []),
    sb(`calendar_events?select=subject,start_at,end_at,is_all_day&day=eq.${day}&is_cancelled=eq.false`).catch(() => []),
    sb(`meeting_sessions?select=event_id,subject,started_at,hours&day=eq.${day}&stopped_at=is.null&started_at=not.is.null&event_id=not.like.adhoc:*&event_id=not.like.personal:*`).catch(() => []),
    sb(`project_tasks?select=objective_id,project_id,text&objective_id=not.is.null`).catch(() => []),
    sb(`projects?select=id,name`).catch(() => []),
  ])
  const projName = new Map(projects.map(p => [p.id, p.name]))
  const linkByObj = new Map(links.map(l => [l.objective_id, l]))
  const running = clocks.find(c => !c.stopped_at) || null
  const minutesFor = (id) => clocks.filter(c => c.objective_id === id).reduce((s, c) => s + (c.stopped_at ? (Number(c.minutes) || 0) : (Date.now() - new Date(c.started_at).getTime()) / 60000), 0)
  const items = active.map(o => ({
    id: o.id, title: o.title, tags: o.tags || [], size: sizeOf(o), size_label: SIZES[sizeOf(o)].label, slots: SIZES[sizeOf(o)].slots, hours: hoursOf(o), due_date: o.due_date,
    equipped: !!running && running.objective_id === o.id,
    minutes_today: Math.round(minutesFor(o.id)),
    session: !isBoardItem(o),
    kind: (o.tags || []).includes('impromptu') ? 'impromptu' : (linkByObj.has(o.id) || (o.tags || []).includes('mission-task')) ? 'mission-task' : 'side-mission',
    ...(linkByObj.has(o.id) ? { main_mission: projName.get(linkByObj.get(o.id).project_id) || null, gate: linkByObj.get(o.id).text } : {}),
    adhoc: (o.tags || []).includes('impromptu'),
  }))
  // A meeting with its timer running takes one slot while it runs (David, 10/14).
  for (const ms of meetingsRunning) items.push({ id: `meeting:${ms.event_id}`, title: ms.subject || 'Meeting', tags: [], size: 'light', size_label: 'Meeting', slots: 1, hours: 1, due_date: null, equipped: true, minutes_today: Math.round(((Number(ms.hours) || 0) * 60) + (Date.now() - new Date(ms.started_at).getTime()) / 60000), session: false, kind: 'meeting', adhoc: false, meeting: true })
  // Two mission slots, Primary and Secondary. The unplanned, a running meeting and the Console's buttons
  // ride the Utility slot and never count against the two (David 11/17).
  const board = items.filter(i => !i.session && !i.adhoc && !i.meeting)
  const adhoc = items.filter(i => !i.session && i.adhoc)
  const meetingsLeft = events.filter(e => !e.is_all_day && e.end_at > nowIso).reduce((s, e) => s + Math.max(0, (new Date(e.end_at) - Math.max(Date.now(), new Date(e.start_at))) / 3600e3), 0)
  const freeHours = Math.max(0, Math.round((hoursToDayEnd() - meetingsLeft) * 10) / 10)
  const loaded = Math.round(board.reduce((s, i) => s + i.hours, 0) * 10) / 10
  return {
    day, slots: { used: board.reduce((n, i) => n + i.slots, 0), max: SLOTS, items: board.length }, heavy: { used: board.filter(i => i.size === 'heavy').length, max: HEAVY_MAX },
    hours: { free_hours: freeHours, loaded_hours: loaded, meetings_left_hours: Math.round(meetingsLeft * 10) / 10, day_end: `${DAY_END_HOUR}:00 CT`, after_hours: hoursToDayEnd() === 0, note: hoursToDayEnd() === 0 ? 'After 6 PM: stamina is not enforced, slots and Heavy still are.' : 'Loaded hours must fit within free hours before 6 PM.' },
    equipped: items.find(i => i.equipped) || null,
    items, sessions: items.filter(i => i.session), adhoc,
    rules: `Two mission slots, Primary and Secondary; every mission takes one, whatever its size. One clock running. The third slot is the Utility slot: only a Console button (E-mail, Slack Review, Bill Pay and the others) or the unplanned (a phone call or a non-mission task, 1 mile each), which must be dispatched before another lands. Both mission slots taken: stash (park) one first.`,
  }
}

// Would this item fit on the board? candidate = { id?, effort|size }.
export async function checkFit(candidate, { force = false } = {}) {
  const L = await loadout()
  const size = candidate.size ? String(candidate.size).toLowerCase() : sizeOf(candidate)
  const hours = (SIZES[size] || SIZES.light).hours
  const already = candidate.id && L.items.some(i => i.id === candidate.id)
  const reasons = []
  const impromptu = candidate.impromptu || (Array.isArray(candidate.tags) && candidate.tags.includes('impromptu'))
  if (impromptu && !already) {
    if (L.adhoc.length) reasons.push(`the Utility slot is taken: "${L.adhoc[0].title}" (${L.adhoc[0].minutes_today}m on the clock). Dispatch it first.`)
    return { ok: force || reasons.length === 0, forced: force && reasons.length > 0, reasons, loadout: L }
  }
  if (!already) {
    const free = SLOTS - L.slots.used
    if (free < 1) reasons.push(`Primary and Secondary are both taken: ${L.items.filter(i => !i.session && !i.adhoc && !i.meeting).map(i => i.title).join(' | ')}. Stash or holster one first.`)
    // The only fit rule (David 11/17): two mission slots, one mission each.
  }
  return { ok: force || reasons.length === 0, forced: force && reasons.length > 0, reasons, loadout: L }
}

// Run this item's clock; holster everything else.
export async function boardLog(text) {
  try { await sbWrite('POST', 'daily_logs', { day: chiToday(), kind: 'note', what: 'board', note: String(text).slice(0, 300), source: 'lumen', at: new Date().toISOString() }, 'return=minimal') } catch { /* best effort */ }
}
const titleOf = async (id) => (await sb(`objectives?select=title&id=eq.${id}`).catch(() => []))[0]?.title || id

export async function equip(objectiveId, note = null) {
  const day = chiToday()
  const running = await sb(`clocks?select=id,objective_id,started_at&stopped_at=is.null`).catch(() => [])
  const holstered = []
  for (const c of running) {
    if (c.objective_id === objectiveId) return { ok: true, already: true, started_at: c.started_at }
    await stopClock(c)
    holstered.push(c.objective_id)
  }
  const row = await sbWrite('POST', 'clocks', { objective_id: objectiveId, day, started_at: new Date().toISOString(), note })
  boardLog(`Timer on: ${await titleOf(objectiveId)}`)
  return { ok: true, started_at: row?.[0]?.started_at, holstered }
}

async function stopClock(c) {
  const stopped = new Date()
  const minutes = Math.max(0, Math.round((stopped - new Date(c.started_at)) / 60000 * 10) / 10)
  await sbWrite('PATCH', `clocks?id=eq.${c.id}`, { stopped_at: stopped.toISOString(), minutes }, 'return=minimal')
  return minutes
}

// Stop this item's clock (it stays on the board).
export async function holster(objectiveId) {
  const running = await sb(`clocks?select=id,objective_id,started_at&objective_id=eq.${objectiveId}&stopped_at=is.null`).catch(() => [])
  let minutes = 0
  for (const c of running) minutes += await stopClock(c)
  if (running.length) boardLog(`Timer off: ${await titleOf(objectiveId)}`)
  return { ok: true, was_running: running.length > 0, minutes_this_run: minutes }
}

// Total clocked minutes on an item, all days (stops a running clock first).
export async function extract(objectiveId) {
  await holster(objectiveId)
  const rows = await sb(`clocks?select=minutes,day&objective_id=eq.${objectiveId}`).catch(() => [])
  const minutes = Math.round(rows.reduce((s, r) => s + (Number(r.minutes) || 0), 0))
  return { minutes, segments: rows.length, days: [...new Set(rows.map(r => r.day))] }
}
