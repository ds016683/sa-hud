// The Run (David 11/17): "a count down timer of 45 minutes. The system, while that timer is going,
// should be canvassing EVERYTHING every 60 seconds, tracking every possible thing i'm doing ... it
// should be creating a run log, identifying missions i'm hitting, rogue emails, whatever ... and then
// furnish a run report. A run awards 10 miles. When the timer hits 0, it can only close out if i hit
// something to extract from the run. (should have another 10 minute timer after close out to do a
// report and get a post run summary from Lumen that gets documented)." His rulings: "i can extract
// early, but no miles until i've hit 45. no limits on the number of runs taht can award miles."
//
// How it is built: each minute the canvass gathers raw events with no model call; Lumen reads the
// whole log once, at Extract, and writes the report. The run watches; the missions keep their own
// clocks. Two kinds of file in project-files/runs, written here only:
//   index.json   { v, runs: [ the face of every run ] }
//   <id>.json    { id, cursor, seen, seen_events, unread, log, mac }   the working log of one run
import { sb } from './_ledger.mjs'
import { syncEmail } from './_sync-core.mjs'
import { missions } from './_trail.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
export const RUN_MINUTES = 45
export const DEBRIEF_MINUTES = 10
export const RUN_MILES = 10
const CANVASS_MAX_MIN = 180      // a run left open stops being canvassed after three hours; it still waits for Extract
const INDEX = 'runs/index.json'
const logPath = (id) => `runs/${id}.json`

async function readJson(path, blank) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return blank
  try { return { ...blank, ...(await r.json()) } } catch { return blank }
}
async function writeJson(path, doc) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path}`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!r.ok) throw new Error(`run save ${r.status}: ${(await r.text()).slice(0, 160)}`)
}
const chiDay = (iso) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
const chiTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const enc = encodeURIComponent
const plus = (iso, min) => new Date(new Date(iso).getTime() + min * 60000).toISOString()

export async function readIndex() { const d = await readJson(INDEX, { v: 1, runs: [] }); return Array.isArray(d.runs) ? d.runs : [] }
const saveIndex = (runs) => writeJson(INDEX, { v: 1, runs: runs.slice(-400) })
const activeOf = (runs) => runs.find(r => r.state === 'running' || r.state === 'debrief') || null

// What the Board shows: the run that is on (with the tail of its log), or the last one filed today, and today's count.
export async function runState() {
  const runs = await readIndex()
  const today = chiDay(new Date().toISOString())
  const mine = runs.filter(r => r.day === today)
  const on = activeOf(runs)
  const last = on || [...mine].reverse().find(r => r.state === 'filed') || null
  let log = [], logged = last ? last.logged : 0
  if (on) { const doc = await readJson(logPath(on.id), { log: [] }); log = (doc.log || []).slice(-40); logged = (doc.log || []).length }
  return { run: last ? { ...last, log, logged } : null, today: { runs: mine.filter(r => r.state === 'filed').length, miles: mine.reduce((s, r) => s + (r.state === 'filed' ? (r.miles || 0) : 0), 0) } }
}

// ---- the canvass --------------------------------------------------------------------------------
// Names for what a row belongs to: an objective's own title, or its Main Mission when it is a gate's card.
async function namer() {
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

async function gather(doc, now) {
  const since = doc.cursor, events = [], names = await namer()
  const add = (at, source, text, mission = null) => { if (text) events.push({ at: at || now, source, text: flat(text, 200), mission: mission || null }) }
  await syncEmail().catch(() => null)
  const [sent, inbox, clocks, steps, tasks, released, boards, files, said, cal] = await Promise.all([
    sb(`emails?select=id,subject,to_names,received_at&folder=eq.sent&received_at=gt.${enc(since)}&order=received_at.asc&limit=40`).catch(() => []),
    sb(`emails?select=id,subject,from_name,is_read&folder=eq.inbox&received_at=gt.${enc(plus(now, -48 * 60))}&limit=400`).catch(() => []),
    sb(`clocks?select=objective_id,started_at,stopped_at&or=(started_at.gt.${enc(since)},stopped_at.gt.${enc(since)})&order=started_at.asc`).catch(() => []),
    sb(`objective_steps?select=id,text,objective_id,done_at&done=eq.true&done_at=gt.${enc(since)}`).catch(() => []),
    sb(`project_tasks?select=id,text,project_id,released_at&status=eq.done&released_at=gt.${enc(since)}`).catch(() => []),
    sb(`objectives?select=id,title,tags,released_at&state=eq.released&released_at=gt.${enc(since)}&deleted_at=is.null`).catch(() => []),
    sb(`session_boards?select=project,title,phases,updated_at&updated_at=gt.${enc(doc.started_at)}`).catch(() => []),
    sb(`live_files?select=name,objective_id,project_id,created_at,bucket&created_at=gt.${enc(since)}&order=created_at.asc&limit=40`).catch(() => []),
    sb(`lumen_messages?select=at,channel,direction,kind,body&direction=eq.in&at=gt.${enc(since)}&order=at.asc&limit=30`).catch(() => []),
    sb(`calendar_events?select=id,subject,start_at,end_at,is_all_day&is_cancelled=eq.false&start_at=lte.${enc(now)}&end_at=gte.${enc(now)}`).catch(() => []),
  ])
  for (const e of sent) add(e.received_at, 'mail', `Sent: ${flat(e.subject, 80) || '(no subject)'}${(e.to_names || []).length ? ` (to ${(e.to_names || []).slice(0, 3).join(', ')})` : ''}`)
  // Mail he opened during the run: unread at the last look, read now.
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
    const done = []; for (const ph of (b.phases || [])) for (const t of (ph.tasks || [])) if (t.status === 'done') done.push({ id: String(t.id), label: t.label })
    const known = doc.seen[b.project] || []
    for (const t of done.filter(t => !known.includes(t.id)).slice(-12)) add(b.updated_at, 'session', flat(t.label, 160), names.key(b.project))
    doc.seen[b.project] = done.map(t => t.id)
  }
  for (const f of files) { if (f.bucket === 'request') continue; const n = f.objective_id ? await names.objective(f.objective_id) : { mission: names.project(f.project_id) }; add(f.created_at, 'hud', `File added: ${f.name}`, n.mission) }
  for (const m of said) add(m.at, 'lumen', `To Lumen (${m.channel}${m.kind === 'audio' ? ', voice' : ''}): ${flat(m.body, 90)}`)
  for (const ev of cal) { if (ev.is_all_day || (doc.seen_events || []).includes(ev.id)) continue; add(now, 'calendar', `On the calendar now: ${flat(ev.subject, 90)}`); doc.seen_events = [...(doc.seen_events || []), ev.id] }
  return events.sort((a, b) => String(a.at).localeCompare(String(b.at)))
}

async function seedSeen() {
  const boards = await sb('session_boards?select=project,phases').catch(() => [])
  const seen = {}
  for (const b of boards) { const ids = []; for (const ph of (b.phases || [])) for (const t of (ph.tasks || [])) if (t.status === 'done') ids.push(String(t.id)); seen[b.project] = ids }
  return seen
}

// ---- the verbs ----------------------------------------------------------------------------------
export async function startRun() {
  const runs = await readIndex()
  if (activeOf(runs)) throw new Error('a run is already on; extract it first')
  const now = new Date().toISOString(), day = chiDay(now)
  const n = runs.filter(r => r.day === day).length + 1
  const run = { id: `${day}-${n}-${Date.now().toString(36)}`, day, n, state: 'running', started_at: now, ends_at: plus(now, RUN_MINUTES), extracted_at: null, debrief_ends_at: null, filed_at: null, miles: 0, logged: 0, summary: null, hits: [], rogue: [], word: null }
  await syncEmail().catch(() => null)
  const [inbox, seen, cal] = await Promise.all([
    sb(`emails?select=id,is_read&folder=eq.inbox&received_at=gt.${enc(plus(now, -48 * 60))}&limit=400`).catch(() => []), seedSeen(),
    sb(`calendar_events?select=id&is_cancelled=eq.false&start_at=lte.${enc(now)}&end_at=gte.${enc(now)}`).catch(() => []),
  ])
  await writeJson(logPath(run.id), { id: run.id, started_at: now, cursor: now, seen, seen_events: cal.map(e => e.id), unread: inbox.filter(e => !e.is_read).map(e => e.id), log: [{ at: now, source: 'hud', text: `Run ${n} started`, mission: null }], mac: [] })
  await saveIndex([...runs, { ...run, logged: 1 }])
  return run
}

// One minute's look. Called by the schedule; does nothing unless a run is on.
export async function tick() {
  const runs = await readIndex(), run = activeOf(runs)
  if (!run) return { active: false }
  const now = new Date().toISOString()
  if (run.state === 'debrief') {
    // The debrief ran out: the report files as Lumen wrote it.
    if (now > run.debrief_ends_at) { const filed = await fileRun({ word: null }); return { active: false, filed: filed.id } }
    return { active: true, state: 'debrief' }
  }
  if (new Date(now) - new Date(run.started_at) > CANVASS_MAX_MIN * 60000) return { active: true, state: 'running', idle: true }
  const doc = await readJson(logPath(run.id), { log: [], mac: [], seen: {}, seen_events: [], unread: [], cursor: run.started_at, started_at: run.started_at })
  const events = await gather(doc, now)
  doc.log = [...doc.log, ...events].slice(-1500); doc.cursor = now
  await writeJson(logPath(run.id), doc)
  if (events.length) { const all = await readIndex(); await saveIndex(all.map(r => r.id === run.id ? { ...r, logged: doc.log.length } : r)) }
  return { active: true, state: 'running', added: events.length, logged: doc.log.length }
}

// The watcher on the Mac sends what is in front once a minute. Kept only while a run is on.
// probe: only say whether a run is on, so the watcher looks at the screen only when one is.
export async function macSample({ app, title, probe = false }) {
  const run = activeOf(await readIndex())
  if (!run || run.state !== 'running') return { active: false }
  if (probe) return { active: true }
  const doc = await readJson(logPath(run.id), { log: [], mac: [] })
  const now = new Date().toISOString(), a = flat(app, 60), t = flat(title, 140)
  const prev = doc.mac[doc.mac.length - 1]
  doc.mac = [...doc.mac, { at: now, app: a, title: t }].slice(-400)
  if (a && (!prev || prev.app !== a || prev.title !== t)) doc.log = [...doc.log, { at: now, source: 'mac', text: t ? `${a}: ${t}` : a, mission: null }]
  await writeJson(logPath(run.id), doc)
  return { active: true }
}

const parseJson = (text) => { const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('no JSON in the reply'); return JSON.parse(text.slice(a, b + 1)) }

// Minutes on each mission's own clock inside the run's window.
async function clockMinutes(from, to) {
  const rows = await sb(`clocks?select=objective_id,started_at,stopped_at&started_at=lt.${enc(to)}&or=(stopped_at.is.null,stopped_at.gt.${enc(from)})`).catch(() => [])
  const names = await namer(), by = new Map()
  for (const c of rows) {
    const a = Math.max(new Date(c.started_at).getTime(), new Date(from).getTime()), b = Math.min(c.stopped_at ? new Date(c.stopped_at).getTime() : new Date(to).getTime(), new Date(to).getTime())
    if (b <= a) continue
    const n = await names.objective(c.objective_id); if (!n.title || n.session || !n.mission) continue
    by.set(n.mission, (by.get(n.mission) || 0) + (b - a) / 60000)
  }
  return [...by.entries()].map(([mission, m]) => ({ mission, minutes: Math.round(m) })).filter(x => x.minutes > 0)
}

async function report(run, doc, model) {
  const [clocked, list] = await Promise.all([clockMinutes(run.started_at, run.extracted_at), missions().catch(() => [])])
  const apps = new Map(); for (const s of doc.mac || []) { const k = s.title ? `${s.app}: ${s.title}` : s.app; if (k) apps.set(k, (apps.get(k) || 0) + 1) }
  const minutes = Math.round((new Date(run.extracted_at) - new Date(run.started_at)) / 60000)
  const fallback = { summary: `This run was ${minutes} minutes with ${doc.log.length} lines logged. Lumen's written read is not here; the numbers below come straight from the clocks.`, hits: clocked.map(c => ({ mission: c.mission, kind: (list.find(m => m.title === c.mission) || {}).kind || 'Mission', minutes: c.minutes, what: null })), rogue: [] }
  if (!model || !process.env.ANTHROPIC_API_KEY) return fallback
  const prompt = `You are Lumen. David just finished a run: a ${minutes} minute stretch of work he asked you to watch. Write the run report from the log below. He wants to see where the time really went: the missions he hit, and the rogue stretches that belonged to no mission (the inbox, a news site, a stray thread).

Rules: times in the log are Chicago time; if you name a time, write it that way (9:05 AM). Plain and specific, no praise, no advice unless the log makes one pattern obvious, no em dashes. Minutes must add up to about ${minutes}. Use the clock minutes as the base for missions; use the Mac samples (one sample is about one minute) and the mail to find the rogue time and to place work the clocks missed. A mission must be one of the listed missions, named exactly. Anything else is rogue.

## Missions
${list.map(m => `- ${m.title} (${m.kind})`).join('\n') || '(none listed)'}

## Minutes on each mission's own clock during the run
${clocked.map(c => `- ${c.mission}: ${c.minutes}`).join('\n') || '(no mission clock ran)'}

## What was in front on the Mac (samples)
${[...apps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => `- ${n} × ${k}`).join('\n') || '(the Mac watcher sent nothing)'}

## Run log
${doc.log.slice(-400).map(e => `- ${chiTime(e.at)} · ${e.source} · ${e.text}${e.mission ? ` · ${e.mission}` : ''}`).join('\n')}

Reply with one JSON object and nothing else: {"summary":"three or four sentences on where the run went","hits":[{"mission":"<exact mission title>","kind":"Main Mission|Side Mission","minutes":<number>,"what":"one line on what happened there"}],"rogue":[{"text":"what it was, in a few words","minutes":<number>}]}`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) })
    if (!res.ok) throw new Error(`anthropic -> ${res.status}`)
    const out = parseJson(((await res.json()).content || []).filter(c => c.type === 'text').map(c => c.text).join(''))
    const clean = (t) => flat(t, 600).replace(/\s*[—–]\s*/g, ', ')
    return {
      summary: clean(out.summary) || fallback.summary,
      hits: (Array.isArray(out.hits) ? out.hits : []).slice(0, 12).map(h => ({ mission: flat(h.mission, 120), kind: flat(h.kind, 20) || 'Mission', minutes: Math.max(0, Math.round(Number(h.minutes) || 0)), what: h.what ? clean(h.what) : null })).filter(h => h.mission),
      rogue: (Array.isArray(out.rogue) ? out.rogue : []).slice(0, 12).map(r => ({ text: clean(r.text), minutes: Math.max(0, Math.round(Number(r.minutes) || 0)) })).filter(r => r.text),
    }
  } catch (e) { return { ...fallback, summary: `${fallback.summary} (${String(e.message || e).slice(0, 80)})` } }
}

// Extract: the run closes, one last look is taken, and Lumen writes the report. Miles only at 45 minutes.
export async function extractRun({ model }) {
  const runs = await readIndex(), run = runs.find(r => r.state === 'running')
  if (!run) throw new Error('no run is on')
  const now = new Date().toISOString()
  const doc = await readJson(logPath(run.id), { log: [], mac: [], seen: {}, seen_events: [], unread: [], cursor: run.started_at, started_at: run.started_at })
  try { const events = await gather(doc, now); doc.log = [...doc.log, ...events] } catch { /* the log stands as it is */ }
  const full = new Date(now) - new Date(run.started_at) >= RUN_MINUTES * 60000 - 5000
  doc.log = [...doc.log, { at: now, source: 'hud', text: `Run ${run.n} extracted${full ? '' : ' early'}`, mission: null }]; doc.cursor = now
  await writeJson(logPath(run.id), doc)
  const next = { ...run, state: 'debrief', extracted_at: now, debrief_ends_at: plus(now, DEBRIEF_MINUTES), miles: full ? RUN_MILES : 0, logged: doc.log.length }
  const rep = await report(next, doc, model)
  const out = { ...next, ...rep }
  await saveIndex((await readIndex()).map(r => r.id === run.id ? out : r))
  return out
}

// File: David's word goes on the report and the run is done.
export async function fileRun({ word }) {
  const runs = await readIndex(), run = runs.find(r => r.state === 'debrief')
  if (!run) throw new Error('no run is waiting on its report')
  const out = { ...run, state: 'filed', filed_at: new Date().toISOString(), word: word ? flat(word, 1200) : null }
  await saveIndex(runs.map(r => r.id === run.id ? out : r))
  return out
}

// Walk away: the run ends with no miles; its log is kept.
export async function walkAway() {
  const runs = await readIndex(), run = runs.find(r => r.state === 'running')
  if (!run) throw new Error('no run is on')
  const out = { ...run, state: 'walked', extracted_at: new Date().toISOString(), miles: 0 }
  await saveIndex(runs.map(r => r.id === run.id ? out : r))
  return out
}

