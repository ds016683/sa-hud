// The canvass (David 11/17): "lets be sure we have one system running one set of protocols, unless the
// run protocols are on or something, that is feedding information to whatever endpoints." This is that
// one system. It looks at what David did since its last look and writes each thing once to the day's
// stream. Everything else reads the stream and collects nothing of its own:
//   the Run            its log is the stream inside the run's window
//   Proposed Steps     Lumen proposes steps from the stream's new lines
//   the Activity Log   shows the stream beside the calendar, Harvest and the day's logs
// Cadence: every five minutes, and every minute while a run is on. One caller (api/run.mjs's schedule),
// so the stream has one writer.
//   project-files/events/<day>.json  { v, day, from?, cursor, seen, unread, seen_events, seen_slack, events: [{ seq, at, source, text, mission, detail }] }
import { sb } from './_ledger.mjs'
import { syncEmail } from './_sync-core.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const enc = encodeURIComponent
export const chiDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
export const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const plus = (iso, min) => new Date(new Date(iso).getTime() + min * 60000).toISOString()
const streamPath = (day) => `events/${day}.json`

export async function readJson(path, blank) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return blank
  try { return { ...blank, ...(await r.json()) } } catch { return blank }
}
export async function writeJson(path, doc) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path}`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!r.ok) throw new Error(`save ${path} ${r.status}: ${(await r.text()).slice(0, 160)}`)
}

// Names for what a row belongs to: an objective's own title, or its Main Mission when it is a gate's card.
export async function namer() {
  const [projects, tasks] = await Promise.all([sb('projects?select=id,key,name'), sb('project_tasks?select=id,project_id,objective_id&objective_id=not.is.null')])
  const proj = new Map(projects.map(p => [p.id, p.name])), byKey = new Map(projects.filter(p => p.key).map(p => [p.key, p.name]))
  const viaTask = new Map(tasks.map(t => [t.objective_id, proj.get(t.project_id)]))
  const cache = new Map()
  const objective = async (id) => {
    if (!id) return { title: null, mission: null }
    if (cache.has(id)) return cache.get(id)
    const [o] = await sb(`objectives?select=id,title,tags&id=eq.${id}`).catch(() => [])
    const out = !o ? { title: null, mission: null } : { title: o.title, mission: (o.tags || []).includes('session') ? null : (viaTask.get(id) || o.title), session: (o.tags || []).includes('session') }
    cache.set(id, out); return out
  }
  return { objective, project: (id) => proj.get(id) || null, key: (k) => byKey.get(k) || null }
}

async function doneBoardTasks() {
  const boards = await sb('session_boards?select=project,phases').catch(() => [])
  const seen = {}
  for (const b of boards) { const ids = []; for (const ph of (b.phases || [])) for (const t of (ph.tasks || [])) if (t.status === 'done') ids.push(String(t.id)); seen[b.project] = ids }
  return seen
}

// A first look ever starts from now: nothing before it is pulled in.
async function freshState(now) {
  const [inbox, seen, cal] = await Promise.all([
    sb(`emails?select=id,is_read&folder=eq.inbox&received_at=gt.${enc(plus(now, -48 * 60))}&limit=400`).catch(() => []), doneBoardTasks(),
    sb(`calendar_events?select=id&is_cancelled=eq.false&start_at=lte.${enc(now)}&end_at=gte.${enc(now)}`).catch(() => []),
  ])
  return { cursor: now, seen, unread: inbox.filter(e => !e.is_read).map(e => e.id), seen_events: cal.map(e => e.id), seen_slack: [] }
}

// What happened since the last look. Each: { at, source, text, mission, detail? }.
async function gather(doc, now) {
  const since = doc.cursor, events = [], names = await namer()
  const add = (at, source, text, mission = null, detail = null) => { if (text) events.push({ at: at || now, source, text: flat(text, 200), mission: mission || null, ...(detail ? { detail: flat(detail, 220) } : {}) }) }
  await syncEmail().catch(() => null)
  const me = process.env.SLACK_USER_ID
  const [sent, inbox, clocks, steps, tasks, released, boards, files, said, cal, slack] = await Promise.all([
    sb(`emails?select=id,subject,to_names,preview,received_at&folder=eq.sent&received_at=gt.${enc(since)}&order=received_at.asc&limit=40`).catch(() => []),
    sb(`emails?select=id,subject,from_name,is_read&folder=eq.inbox&received_at=gt.${enc(plus(now, -48 * 60))}&limit=400`).catch(() => []),
    sb(`clocks?select=objective_id,started_at,stopped_at&or=(started_at.gt.${enc(since)},stopped_at.gt.${enc(since)})&order=started_at.asc`).catch(() => []),
    sb(`objective_steps?select=id,text,objective_id,done_at&done=eq.true&done_at=gt.${enc(since)}`).catch(() => []),
    sb(`project_tasks?select=id,text,project_id,released_at&status=eq.done&released_at=gt.${enc(since)}`).catch(() => []),
    sb(`objectives?select=id,title,tags,released_at&state=eq.released&released_at=gt.${enc(since)}&deleted_at=is.null`).catch(() => []),
    sb(`session_boards?select=project,title,phases,updated_at&updated_at=gt.${enc(plus(since, -60))}`).catch(() => []),
    sb(`live_files?select=name,objective_id,project_id,created_at,bucket&created_at=gt.${enc(since)}&order=created_at.asc&limit=40`).catch(() => []),
    sb(`lumen_messages?select=at,channel,direction,kind,body&direction=eq.in&at=gt.${enc(since)}&order=at.asc&limit=30`).catch(() => []),
    sb(`calendar_events?select=id,subject,start_at,end_at,is_all_day&is_cancelled=eq.false&start_at=lte.${enc(now)}&end_at=gte.${enc(now)}`).catch(() => []),
    // The Slack pipe lands every five minutes, so a message can arrive after the minute it was sent: taken once by id.
    me ? sb(`slack_messages?select=id,ts,channel_name,channel_type,body_preview,text&user_id=eq.${enc(me)}&ts=gt.${enc(plus(since, -20))}&order=ts.asc&limit=80`).catch(() => []) : [],
  ])
  for (const e of sent) add(e.received_at, 'mail', `Sent: ${flat(e.subject, 80) || '(no subject)'}${(e.to_names || []).length ? ` (to ${(e.to_names || []).slice(0, 3).join(', ')})` : ''}`, null, e.preview)
  // Mail he opened: unread at the last look, read now.
  const was = new Set(doc.unread || [])
  for (const e of inbox) if (e.is_read && was.has(e.id)) add(now, 'mail', `Read: ${flat(e.subject, 80) || '(no subject)'}${e.from_name ? ` (from ${e.from_name})` : ''}`)
  doc.unread = inbox.filter(e => !e.is_read).map(e => e.id)
  for (const c of clocks) {
    const n = await names.objective(c.objective_id); if (!n.title || n.session) continue
    if (c.started_at > since) add(c.started_at, 'hud', `Clock started: ${n.title}`, n.mission)
    if (c.stopped_at && c.stopped_at > since) add(c.stopped_at, 'hud', `Clock stopped: ${n.title}`, n.mission)
  }
  for (const s of steps) { const n = await names.objective(s.objective_id); if (!n.session) add(s.done_at, 'hud', `Gate closed: ${s.text}`, n.mission) }
  for (const t of tasks) add(t.released_at, 'hud', `Gate closed: ${t.text}`, names.project(t.project_id))
  for (const o of released) if (!(o.tags || []).includes('session') && !(o.tags || []).includes('mission-task')) add(o.released_at, 'hud', `Closed out: ${o.title}`, o.title)
  for (const b of boards) {
    const done = []; for (const ph of (b.phases || [])) for (const t of (ph.tasks || [])) if (t.status === 'done') done.push({ id: String(t.id), label: t.label, phase: ph.title })
    const known = doc.seen[b.project]
    // A board never seen before brings nothing in: only what closes from here on.
    if (known) for (const t of done.filter(t => !known.includes(t.id)).slice(-12)) add(b.updated_at, 'session', flat(t.label, 160), names.key(b.project), `${b.title}: ${t.phase}`)
    doc.seen[b.project] = done.map(t => t.id)
  }
  for (const f of files) { if (f.bucket === 'request') continue; const n = f.objective_id ? await names.objective(f.objective_id) : { mission: names.project(f.project_id) }; add(f.created_at, 'hud', `File added: ${f.name}`, n.mission) }
  for (const m of slack) {
    if ((doc.seen_slack || []).includes(m.id)) continue
    add(m.ts, 'slack', `${m.channel_type === 'im' || m.channel_type === 'mpim' ? 'Direct message' : `#${m.channel_name || 'channel'}`}: ${flat(m.body_preview || m.text, 90)}`)
    doc.seen_slack = [...(doc.seen_slack || []), m.id].slice(-400)
  }
  for (const m of said) add(m.at, 'lumen', `To Lumen (${m.channel}${m.kind === 'audio' ? ', voice' : ''}): ${flat(m.body, 90)}`)
  for (const ev of cal) { if (ev.is_all_day || (doc.seen_events || []).includes(ev.id)) continue; add(now, 'calendar', `On the calendar now: ${flat(ev.subject, 90)}`); doc.seen_events = [...(doc.seen_events || []), ev.id].slice(-200) }
  return events.sort((a, b) => String(a.at).localeCompare(String(b.at)))
}

// One look. Returns { added, total }.
export async function canvass() {
  const now = new Date().toISOString(), day = chiDay(now)
  let doc = await readJson(streamPath(day), null)
  if (!doc) {
    // A new day carries yesterday's place forward; the very first look starts from now.
    const y = await readJson(streamPath(chiDay(plus(now, -24 * 60))), null)
    const state = y ? { cursor: y.cursor, seen: y.seen || {}, unread: y.unread || [], seen_events: y.seen_events || [], seen_slack: y.seen_slack || [] } : await freshState(now)
    doc = { v: 1, day, ...(y ? {} : { from: now }), ...state, events: [] }   // from: the stream began partway through this day
  }
  doc.seen = doc.seen || {}
  const found = await gather(doc, now)
  let seq = doc.events.length ? doc.events[doc.events.length - 1].seq : 0
  doc.events = [...doc.events, ...found.map(e => ({ seq: ++seq, ...e }))].slice(-4000)
  doc.cursor = now
  await writeJson(streamPath(day), doc)
  return { added: found.length, total: doc.events.length }
}

// The stream between two moments (a run's window, or what a reader has not taken yet).
export async function eventsBetween(from, to = new Date().toISOString()) {
  const days = [...new Set([chiDay(from), chiDay(to)])]
  const docs = await Promise.all(days.map(d => readJson(streamPath(d), { events: [] })))
  return docs.flatMap((d, i) => (d.events || []).map(e => ({ ...e, day: days[i] }))).filter(e => e.at >= from && e.at <= to).sort((a, b) => String(a.at).localeCompare(String(b.at)))
}
// Everything on a day after a given line: how Proposed Steps takes each line once.
export async function eventsAfter(day, seq) {
  const today = chiDay(new Date().toISOString())
  const days = day && day !== today ? [day, today] : [today]
  const docs = await Promise.all(days.map(d => readJson(streamPath(d), { events: [] })))
  const out = []
  docs.forEach((d, i) => { for (const e of (d.events || [])) if (days[i] !== day || e.seq > seq) out.push({ ...e, day: days[i] }) })
  const last = out.length ? out[out.length - 1] : null
  return { events: out, cursor: last ? { day: last.day, seq: last.seq } : { day: day || today, seq: seq || 0 } }
}
