// The Loadout (David, 9/27): what he carries into the day.
//
//   Slots     three items active at once, one of them Heavy at most
//   Size      Light (an hour or less), Medium (a half day), Heavy (a full day);
//             bigger than Heavy is a Main Mission, split into tasks
//   Equipped  exactly one item's clock runs at a time; equipping another
//             holsters the rest
//   Stamina   free hours left before 6 PM Chicago after the meetings still to
//             come; the loadout's hours can't exceed it
//   Extract   release: stop the clock, sum the segments, bank the miles
//
// Sizes ride the existing objectives.effort column (1-2 Light, 3 Medium,
// 4-5 Heavy) so nothing in the Side Missions history is lost. Clocks live in
// `clocks` (sql/2026-09-27-loadout.sql). Harvest is never touched.
import { sb, sbWrite, chiToday } from './_ledger.mjs'

export const SLOTS = 3
export const HEAVY_MAX = 1
export const DAY_END_HOUR = 18
export const SIZES = {
  light:  { label: 'Light',  hours: 1, effort: 1 },
  medium: { label: 'Medium', hours: 4, effort: 3 },
  heavy:  { label: 'Heavy',  hours: 8, effort: 5 },
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

// Everything on the board, with clocks and stamina.
export async function loadout() {
  const day = chiToday()
  const nowIso = new Date().toISOString()
  const [active, clocks, events] = await Promise.all([
    sb(`objectives?select=id,title,state,tags,effort,due_date,activated_at,captured_at&state=eq.active&deleted_at=is.null&order=activated_at.asc`),
    sb(`clocks?select=id,objective_id,day,started_at,stopped_at,minutes&or=(stopped_at.is.null,day.eq.${day})`).catch(() => []),
    sb(`calendar_events?select=subject,start_at,end_at,is_all_day&day=eq.${day}&is_cancelled=eq.false`).catch(() => []),
  ])
  const running = clocks.find(c => !c.stopped_at) || null
  const minutesFor = (id) => clocks.filter(c => c.objective_id === id).reduce((s, c) => s + (c.stopped_at ? (Number(c.minutes) || 0) : (Date.now() - new Date(c.started_at).getTime()) / 60000), 0)
  const items = active.map(o => ({
    id: o.id, title: o.title, tags: o.tags || [], size: sizeOf(o), hours: hoursOf(o), due_date: o.due_date,
    equipped: !!running && running.objective_id === o.id,
    minutes_today: Math.round(minutesFor(o.id)),
    session: !isBoardItem(o),
    kind: (o.tags || []).includes('impromptu') ? 'impromptu' : (o.tags || []).includes('mission-task') ? 'mission-task' : 'side-mission',
  }))
  const board = items.filter(i => !i.session)
  const meetingsLeft = events.filter(e => !e.is_all_day && e.end_at > nowIso).reduce((s, e) => s + Math.max(0, (new Date(e.end_at) - Math.max(Date.now(), new Date(e.start_at))) / 3600e3), 0)
  const stamina = Math.max(0, Math.round((hoursToDayEnd() - meetingsLeft) * 10) / 10)
  const loaded = Math.round(board.reduce((s, i) => s + i.hours, 0) * 10) / 10
  return {
    day, slots: { used: board.length, max: SLOTS }, heavy: { used: board.filter(i => i.size === 'heavy').length, max: HEAVY_MAX },
    stamina: { free_hours: stamina, loaded_hours: loaded, meetings_left_hours: Math.round(meetingsLeft * 10) / 10, day_end: `${DAY_END_HOUR}:00 CT` },
    equipped: items.find(i => i.equipped) || null,
    items, sessions: items.filter(i => i.session),
    rules: `${SLOTS} slots, at most ${HEAVY_MAX} Heavy, one clock running, loaded hours within stamina. Over the limit: stash (park) something first.`,
  }
}

// Would this item fit on the board? candidate = { id?, effort|size }.
export async function checkFit(candidate, { force = false } = {}) {
  const L = await loadout()
  const size = candidate.size ? String(candidate.size).toLowerCase() : sizeOf(candidate)
  const hours = (SIZES[size] || SIZES.light).hours
  const already = candidate.id && L.items.some(i => i.id === candidate.id)
  const reasons = []
  if (!already) {
    if (L.slots.used >= SLOTS) reasons.push(`the loadout is full (${L.slots.used}/${SLOTS} slots): ${L.items.filter(i => !i.session).map(i => i.title).join(' | ')}`)
    if (size === 'heavy' && L.heavy.used >= HEAVY_MAX) reasons.push(`a Heavy item is already loaded (${L.items.find(i => i.size === 'heavy')?.title})`)
    if (L.stamina.loaded_hours + hours > L.stamina.free_hours) reasons.push(`stamina: ${L.stamina.loaded_hours}h loaded + ${hours}h for this vs ${L.stamina.free_hours}h free before ${L.stamina.day_end}`)
  }
  return { ok: force || reasons.length === 0, forced: force && reasons.length > 0, reasons, loadout: L }
}

// Run this item's clock; holster everything else.
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
  return { ok: true, was_running: running.length > 0, minutes_this_run: minutes }
}

// Total clocked minutes on an item, all days (stops a running clock first).
export async function extract(objectiveId) {
  await holster(objectiveId)
  const rows = await sb(`clocks?select=minutes,day&objective_id=eq.${objectiveId}`).catch(() => [])
  const minutes = Math.round(rows.reduce((s, r) => s + (Number(r.minutes) || 0), 0))
  return { minutes, segments: rows.length, days: [...new Set(rows.map(r => r.day))] }
}
