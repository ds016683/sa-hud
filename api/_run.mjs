// The Run (David 11/17): "a count down timer of 45 minutes. The system, while that timer is going,
// should be canvassing EVERYTHING every 60 seconds, tracking every possible thing i'm doing ... it
// should be creating a run log, identifying missions i'm hitting, rogue emails, whatever ... and then
// furnish a run report. A run awards 10 miles. When the timer hits 0, it can only close out if i hit
// something to extract from the run. (should have another 10 minute timer after close out to do a
// report and get a post run summary from Lumen that gets documented)." His rulings: "i can extract
// early, but no miles until i've hit 45. no limits on the number of runs taht can award miles."
//
// How it is built: each minute the canvass gathers raw events with no model call; Lumen reads the
// whole log once, at Extract, and writes the report. Sources: mail, the mission clocks, gates, session
// work, files, messages to Lumen, the calendar, his own Slack messages and the front app on his Mac. The run watches; the missions keep their own
// clocks. Two kinds of file in project-files/runs, written here only:
//   index.json   { v, runs: [ the face of every run ] }
//   <id>.json    { id, ledger, log, mac }   one run's own lines: its marks, the Mac's samples, and what the ledger held at Start
import { sb, sbWrite } from './_ledger.mjs'
import { missions, parseJson } from './_trail.mjs'
import { canvass, eventsBetween, eventsAfter, namer, readJson, writeJson, chiDay, flat } from './_canvass.mjs'
import { loadout, equip as startClock, holster as stopClockOn, boardLog } from './_loadout.mjs'
import { strikeDay } from './_river.mjs'
import { waSendText, waSendTemplate, davidNumber } from './_wa.mjs'

export const RUN_MINUTES = 45
export const DEBRIEF_MINUTES = 10
export const RUN_MILES = 10
const INDEX = 'runs/index.json'
const logPath = (id) => `runs/${id}.json`
const chiTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const enc = encodeURIComponent
const plus = (iso, min) => new Date(new Date(iso).getTime() + min * 60000).toISOString()

// The miles a run brought in (David 11/17: "how many miles were earned, including the run itself"). The
// day is struck when the run starts and again at Extract; what is on the ledger at Extract and was not
// there at Start was earned inside the run. Each line keeps the ledger's own evidence.
const ledgerKey = (r) => `${r.badge}|${r.key}`
async function ledgerOf(day) { await strikeDay(day); return sb(`miles_ledger?select=badge,key,miles,evidence&day=eq.${day}&order=id.asc`) }
async function earnedIn(run, before) {
  const only = run.miles > 0 ? [{ badge: 'run', text: `Run ${run.n}, the full ${RUN_MINUTES} minutes`, miles: run.miles }] : []
  if (!before) return only   // a run started before the ledger was read at Start: only its own miles are known
  try {
    const had = new Set(before.day === chiDay(run.extracted_at) ? before.keys : [])
    const rows = (await ledgerOf(chiDay(run.extracted_at))).filter(r => !had.has(ledgerKey(r)) && Number(r.miles) > 0)
    const rest = rows.filter(r => !(r.badge === 'run' && r.key === run.id)).map(r => ({ badge: r.badge, text: flat(r.evidence, 160), miles: Number(r.miles) }))
    return [...only, ...rest]
  } catch { return only }
}

// A run's log: the stream inside its window (see _canvass.mjs), plus what its own file holds: the Mac's
// samples and the run's start and extract marks.
async function runLog(run, to = new Date().toISOString()) {
  const [stream, doc] = await Promise.all([eventsBetween(run.started_at, run.extracted_at || to), readJson(logPath(run.id), { log: [], mac: [] })])
  const log = [...stream.map(e => ({ at: e.at, source: e.source, text: e.text, mission: e.mission || null })), ...(doc.log || [])].sort((a, b) => String(a.at).localeCompare(String(b.at)))
  return { log, mac: doc.mac || [] }
}

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
  if (on) { const full = (await runLog(on)).log; log = full.slice(-40); logged = full.length }
  // Whether Lumen's WhatsApp line to David is open, so the Board can say so while a run is running.
  const wa_open = on && on.state === 'running' ? await waOpen().catch(() => null) : null
  // The day's runs for the Board's list: when each started, how long it ran, its miles, and how the time split
  // (mission, protocol, rogue minutes from its report).
  const sum = (a) => (Array.isArray(a) ? a : []).reduce((t, x) => t + (Number(x.minutes) || 0), 0)
  const list = mine.filter(r => r.state !== 'running').map(r => ({
    id: r.id, n: r.n, state: r.state, started_at: r.started_at, focus: !!r.focus, miles: r.state === 'walked' ? 0 : (r.miles || 0),
    minutes: Math.max(0, Math.round((new Date(r.extracted_at || r.walked_at || r.filed_at || r.ends_at) - new Date(r.started_at)) / 60000)),
    mix: [sum(r.hits), sum(r.protocol), sum(r.rogue)],
  }))
  return { run: last ? { ...last, log, logged, wa_open } : null, today: { runs: mine.filter(r => r.state === 'filed').length, miles: mine.reduce((s, r) => s + (r.state === 'filed' ? (r.miles || 0) : 0), 0), list } }
}

// ---- the Mission Run ----------------------------------------------------------------------------
// David 11/18: "Two options for a run. A run and a focused run." His rules for focus: "only one thing is
// allowed on the board. only one session can be running. If i'm doing something else that lumen sees (i'm
// responding to an unrelated email or slack message that deviates from the only thing on the board) then i
// get an alert text. When i turn off the focus button, the board resets."
//   Start     the one thing keeps the Board and its clock runs; everything else on the Board is holstered and
//             remembered on the run (focus.parked). A Console button that is on has to be stopped first.
//   Each minute  mail he sent and Slack he wrote since the last look is read against the one thing; a line
//             that shares nothing with it gets one text, at most once in five minutes.
//   The end   Extract or Walk Away puts back what was holstered, clocks off, in the order it sat.
// run.focus = { objective_id, title, mission, words, parked: [{ id, title, activated_at }], cursor, alerted_at, alerts }
const DRIFT_QUIET_MIN = 5
const COMMON = new Set(['with', 'from', 'that', 'this', 'into', 'about', 'your', 'have', 'will', 'gate', 'main', 'side', 'mission', 'review', 'plan', 'call', 'email', 'send', 'draft', 'team', 'third', 'horizon', 'full', 'list', 'final', 'update', 'meeting'])
export const wordsOf = (...t) => [...new Set((t.join(' ').toLowerCase().match(/[a-z0-9]{4,}/g) || []))].filter(w => !COMMON.has(w)).slice(0, 24)
export const related = (e, f) => {
  if (e.mission && (e.mission === f.mission || e.mission === f.title)) return true
  // Whole words only: "live" must not ride in on "deliver".
  const said = new Set(`${e.text} ${e.detail || ''}`.toLowerCase().match(/[a-z0-9]{4,}/g) || [])
  return (f.words || []).some(w => said.has(w))
}

// The focused run that is running now, or null. Lumen's hands ask this before they load or start anything.
export async function focusHold() {
  const run = activeOf(await readIndex())
  return run && run.state === 'running' && run.focus ? { run: run.n, objective_id: run.focus.objective_id, title: run.focus.title } : null
}
// The run that is on, in a few facts, for Lumen (David 11/18, from inside a Mission Run: "i need lumen to know
// what that is"). Null when no run is running.
export async function runBrief(now = Date.now()) {
  const run = (await readIndex()).find(r => r.state === 'running')
  if (!run) return null
  const left = Math.max(0, Math.ceil((new Date(run.ends_at).getTime() - now) / 60000))
  return { run: run.n, focused: !!run.focus, one_thing: run.focus ? run.focus.title : null, mission: run.focus ? run.focus.mission || null : null, started_at: run.started_at, ends_at: run.ends_at, minutes_left: left }
}
export const focusRefusal = (hold) => JSON.stringify({ ok: false, refused: 'focused run', note: `Mission Run ${hold.run} is on: only "${hold.title}" is on the Board until it ends. Tell David that, and do not load or start anything else.` })

async function focusStart(objectiveId, now) {
  const L = await loadout()
  const board = L.items.filter(i => !i.session && !i.meeting)
  const one = objectiveId ? board.find(i => i.id === objectiveId) : (board.find(i => i.equipped) || (board.length === 1 ? board[0] : null))
  if (!one) throw new Error(objectiveId ? 'that item is not on the Board' : board.length ? 'pick the one thing: more than one item is on the Board and no clock is running' : 'nothing is on the Board; load the one thing first')
  const on = (await sb(`meeting_sessions?select=event_id,subject&day=eq.${L.day}&stopped_at=is.null&started_at=not.is.null`).catch(() => []))
    .find(s => /^(adhoc|personal):/.test(s.event_id) && !/:travel$/.test(s.event_id))
  if (on) throw new Error(`${on.subject || 'A Console button'} is on at the Console. Stop it first.`)
  const others = board.filter(i => i.id !== one.id)
  const rows = others.length ? await sb(`objectives?select=id,title,activated_at&id=in.(${others.map(o => o.id).join(',')})`) : []
  for (const o of rows) { await stopClockOn(o.id); await sbWrite('PATCH', `objectives?id=eq.${o.id}`, { state: 'parked', activated_at: null }, 'return=minimal') }
  await startClock(one.id, 'focused run')
  if (rows.length) boardLog(`Mission Run: holstered ${rows.map(o => o.title).join(' | ')} until it ends`)
  const { cursor } = await eventsAfter(chiDay(now), 0).catch(() => ({ cursor: { day: chiDay(now), seq: 0 } }))
  return { objective_id: one.id, title: one.title, mission: one.main_mission || null, words: wordsOf(one.title, one.main_mission || ''), parked: rows.map(o => ({ id: o.id, title: o.title, activated_at: o.activated_at })), cursor, alerted_at: null, alerts: [] }
}

// The Board resets: what the run holstered goes back where it sat, clocks off. Anything David closed,
// stashed or deleted in the meantime is left as he put it.
async function focusEnd(run) {
  const back = []
  for (const p of (run.focus?.parked || [])) {
    const o = (await sb(`objectives?select=id,state,tags,deleted_at&id=eq.${p.id}`).catch(() => []))[0]
    if (!o || o.deleted_at || o.state !== 'parked' || (o.tags || []).includes('stashed')) continue
    await sbWrite('PATCH', `objectives?id=eq.${p.id}`, { state: 'active', activated_at: p.activated_at || new Date().toISOString() }, 'return=minimal')
    back.push(p.title)
  }
  if (back.length) boardLog(`Mission Run ended: back on the Board, ${back.join(' | ')}`)
  return back
}

// One look for drift. Mail he sent and Slack he wrote, taken once each by their place in the stream.
async function drift(run) {
  const f = run.focus
  const { events, cursor } = await eventsAfter(f.cursor?.day, f.cursor?.seq || 0)
  const off = events.filter(e => e.at >= run.started_at && ((e.source === 'mail' && /^Sent:/.test(e.text)) || e.source === 'slack')).filter(e => !related(e, f))
  const quiet = f.alerted_at && Date.now() - new Date(f.alerted_at).getTime() < DRIFT_QUIET_MIN * 60000
  let alert = null
  if (off.length && !quiet) {
    const e = off[off.length - 1], now = new Date().toISOString()
    const text = `Mission Run ${run.n}: ${e.source === 'mail' ? 'you just sent mail' : 'you just wrote in Slack'} that is not the one thing (${flat(e.text.replace(/^Sent:\s*/, ''), 90)}). The one thing is ${f.title}.`
    let id = null, via = null, skipped = null
    try {
      if (await waOpen().catch(() => false)) { via = 'text'; id = await waSendText(davidNumber(), text) }
      else { via = 'knock'; id = await waSendTemplate(davidNumber(), `focus check on Run ${run.n}`) }
    } catch (x) { skipped = String(x.message || x).slice(0, 200) }
    await sbWrite('POST', 'lumen_messages', { channel: 'pulse', direction: 'out', kind: skipped ? 'system' : 'text', body: text, external_id: id, meta: { kind: 'focus', run: run.id, via, skipped } }, 'return=minimal').catch(() => null)
    const doc = await readJson(logPath(run.id), { log: [], mac: [] })
    doc.log = [...(doc.log || []), { at: now, source: 'lumen', text: `Drift text ${skipped ? 'not sent' : 'sent'}: ${flat(e.text, 120)}`, mission: null }]
    await writeJson(logPath(run.id), doc)
    alert = { at: now, text: flat(e.text, 160), sent: !skipped, via }
  }
  await saveIndex((await readIndex()).map(r => r.id === run.id ? { ...r, focus: { ...r.focus, cursor, ...(alert ? { alerted_at: alert.at, alerts: [...(r.focus.alerts || []), alert].slice(-40) } : {}) } } : r))
  return alert
}

// ---- the verbs ----------------------------------------------------------------------------------
// minutes: a shorter clock for a test (5 to 45). A run pays only at the full 45, so a test pays nothing.
// focus: true, or { objective_id } naming the one thing, makes it a Mission Run (see above).
export async function startRun({ minutes = RUN_MINUTES, focus = null } = {}) {
  const span = Math.max(5, Math.min(RUN_MINUTES, Math.round(Number(minutes) || RUN_MINUTES)))
  const runs = await readIndex()
  if (activeOf(runs)) throw new Error('a run is already on; extract it first')
  const now = new Date().toISOString(), day = chiDay(now)
  const n = runs.filter(r => r.day === day).length + 1
  const held = focus ? await focusStart(typeof focus === 'object' ? focus.objective_id : null, now) : null
  const run = { id: `${day}-${n}-${Date.now().toString(36)}`, day, n, state: 'running', started_at: now, ends_at: plus(now, span), minutes: span, extracted_at: null, debrief_ends_at: null, filed_at: null, miles: 0, logged: 0, summary: null, hits: [], rogue: [], word: null }
  // What the ledger already holds, so Extract can tell what this run earned (see earnedIn).
  const ledger = await ledgerOf(day).then(rows => ({ day, keys: rows.map(ledgerKey) })).catch(() => null)
  if (held) run.focus = held
  await writeJson(logPath(run.id), { id: run.id, ledger, log: [{ at: now, source: 'hud', text: held ? `Mission Run ${n} started on ${held.title}` : `Looting Run ${n} started`, mission: held ? (held.mission || held.title) : null }], mac: [] })
  await saveIndex([...runs, { ...run, logged: 1 }])
  return run
}

// The warnings (David 11/17): "can lumen message me through whats app if the timer is still running to give a
// 10 min warning, 5 min warning, and 1 min warning. and done and then 7 minutes over. obviously, when i
// extract, that push notifcation gets turned off." Only a running run is warned, so Extract ends them. The
// schedule's minute lands within half a minute of each mark; if minutes were missed, only the latest mark
// that has passed goes out, and the ones before it are counted as said.
// Run 3 (11/17) showed the catch: WhatsApp takes a plain line from Lumen and hands back an id whether or not it
// will deliver, and it only delivers inside 24 hours of David's last message to him. So the line is checked
// first. Open: the warning goes as written. Closed: it goes as the approved knock, whose one blank carries the
// warning ("Your 10 minute warning on Run 3 from Lumen is ready..."), which does reach his phone.
const MARKS = [
  { key: '10', left: 10, say: (n) => `Run ${n}: 10 minutes left.`, knock: (n) => `10 minute warning on Run ${n}` },
  { key: '5', left: 5, say: (n) => `Run ${n}: 5 minutes left.`, knock: (n) => `5 minute warning on Run ${n}` },
  { key: '1', left: 1, say: (n) => `Run ${n}: 1 minute left.`, knock: (n) => `1 minute warning on Run ${n}` },
  { key: '0', left: 0, say: (n) => `Run ${n} is done. Extract when you are ready.`, knock: (n) => `notice that Run ${n} is done` },
  { key: '+7', left: -7, say: (n) => `Run ${n} is 7 minutes over. It stays open until you extract.`, knock: (n) => `notice that Run ${n} is 7 minutes over` },
]
export async function waOpen() {
  const since = new Date(Date.now() - 23.5 * 3600e3).toISOString()
  return (await sb(`lumen_messages?select=id&channel=eq.whatsapp&direction=eq.in&at=gte.${since}&limit=1`)).length > 0
}
export const markDue = (run, now = Date.now()) => {
  const left = (new Date(run.ends_at).getTime() - now) / 60000
  const due = MARKS.filter(m => left <= m.left + 0.5), last = due[due.length - 1]
  if (!last || (run.warned || []).includes(last.key)) return null
  // A countdown mark more than a minute and a half late would say the wrong number: it is counted, not sent.
  return { mark: last, keys: due.map(m => m.key), late: last.left > 0 && left < last.left - 1.5 }
}
async function warn(run) {
  const due = markDue(run)
  if (!due) return null
  const text = due.mark.say(run.n)
  let id = null, skipped = due.late ? 'late' : null, via = null
  if (!skipped) try {
    if (await waOpen().catch(() => false)) { via = 'text'; id = await waSendText(davidNumber(), text) }
    else { via = 'knock'; id = await waSendTemplate(davidNumber(), due.mark.knock(run.n)) }
  } catch (e) { skipped = String(e.message || e).slice(0, 200) }
  // On the record either way, and marked as said so a failed send is not retried every minute.
  await saveIndex((await readIndex()).map(r => r.id === run.id ? { ...r, warned: [...new Set([...(r.warned || []), ...due.keys])] } : r))
  await sbWrite('POST', 'lumen_messages', { channel: 'pulse', direction: 'out', kind: skipped ? 'system' : 'text', body: text, external_id: id, meta: { kind: 'run', run: run.id, mark: due.mark.key, via, skipped } }, 'return=minimal').catch(() => null)
  return { mark: due.mark.key, sent: !skipped, via, skipped }
}

// The schedule's minute. This is the canvass's caller (Extract takes one last look of its own): every
// minute while a run is on, every fifth minute otherwise (David 11/17: one system, one set of protocols, faster only when a run is on).
export async function tick() {
  const runs = await readIndex(), run = activeOf(runs)
  const now = new Date()
  if (run && run.state === 'debrief' && now.toISOString() > run.debrief_ends_at) await fileRun({ word: null })   // the debrief ran out: it files as written
  const running = !!run && run.state === 'running'
  const warned = running ? await warn(run).catch(() => null) : null
  if (!running && now.getUTCMinutes() % 5 !== 0) return { active: !!run, looked: false }
  const out = await canvass()
  const drifted = running && run.focus ? await drift(run).catch(() => null) : null
  return { active: !!run, looked: true, ...(warned ? { warned } : {}), ...(drifted ? { drifted } : {}), ...out }
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
  const fallback = { summary: `This run was ${minutes} minutes with ${doc.log.length} lines logged. Lumen's written read is not here; the numbers below come straight from the clocks.`, hits: clocked.map(c => ({ mission: c.mission, kind: (list.find(m => m.title === c.mission) || {}).kind || 'Mission', minutes: c.minutes, what: null })), protocol: [], rogue: [], headline: null, accomplished: doc.log.filter(e => /^(Gate closed|Closed out|Sent|File added):/.test(e.text) || e.source === 'session').slice(-6).map(e => flat(e.text, 140)) }
  if (!model || !process.env.ANTHROPIC_API_KEY) return fallback
  const prompt = `You are Lumen. David just finished a run: a ${minutes} minute stretch of work he asked you to watch. Write the run report from the log below. He wants to see where the time really went: the missions he hit, what was part of the protocol he was in, and the rogue stretches that belonged to neither (the inbox, a news site, a stray thread).

Rules: times in the log are Chicago time; if you name a time, write it that way (9:05 AM). Plain and specific, no praise, no advice unless the log makes one pattern obvious, no em dashes. Minutes must add up to about ${minutes}. Use the clock minutes as the base for missions; use the Mac samples (one sample is about one minute) and the mail to find the rogue time and to place work the clocks missed. A mission must be one of the listed missions, named exactly. Time the protocol itself calls for goes under protocol, never rogue: talking to Lumen about the run or the work in it, and in a Mission Run the reading he does between turns and the notes about it he sends Lumen, typed or spoken. Anything else is rogue.

## Missions
${list.map(m => `- ${m.title} (${m.kind})`).join('\n') || '(none listed)'}

${run.focus ? `## This was a Mission Run (the Mission Run Protocol)\nThe one thing on the Board was: ${run.focus.title}${run.focus.mission ? ` (${run.focus.mission})` : ''}. Everything else was locked. Reading a book between turns of a session and sending Lumen notes on it is part of this protocol (David 11/18: "why is that rogue? i thought it was protocol!!"); it is protocol time, not rogue and not drift. Say plainly how much of the run stayed on the one thing. Drift texts Lumen sent: ${(run.focus.alerts || []).length ? run.focus.alerts.map(a => `${chiTime(a.at)} ${a.text}`).join(' | ') : 'none'}.\n\n` : ''}## Minutes on each mission's own clock during the run
${clocked.map(c => `- ${c.mission}: ${c.minutes}`).join('\n') || '(no mission clock ran)'}

## What was in front on the Mac (samples)
${[...apps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, n]) => `- ${n} × ${k}`).join('\n') || '(the Mac watcher sent nothing)'}

## Run log
${doc.log.slice(-400).map(e => `- ${chiTime(e.at)} · ${e.source} · ${e.text}${e.mission ? ` · ${e.mission}` : ''}`).join('\n')}

Also give a headline and what was accomplished. The headline is one plain line of eight words at most, in Title Case, that says what this run turned out to be; it must be true to the log, so a run that went to a meeting or the inbox says so. Accomplished is up to six short lines, each one thing the log shows was finished, sent, produced or closed during the run (a gate closed, mail sent, a file added, work a session closed), past tense, the verb first. Something only opened or looked at is not accomplished. An empty list is a fine answer.

Reply with one JSON object and nothing else: {"headline":"<the headline>","accomplished":["<one line>"],"summary":"three or four sentences on where the run went","hits":[{"mission":"<exact mission title>","kind":"Main Mission|Side Mission","minutes":<number>,"what":"one line on what happened there"}],"protocol":[{"text":"what it was, in a few words","minutes":<number>}],"rogue":[{"text":"what it was, in a few words","minutes":<number>}]}`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) })
    if (!res.ok) throw new Error(`anthropic -> ${res.status}`)
    const out = parseJson(((await res.json()).content || []).filter(c => c.type === 'text').map(c => c.text).join(''))
    // 1200: a report was cut mid-sentence at 600 (Run 4, 11/17)
    const clean = (t) => flat(t, 1200).replace(/\s*[—–]\s*/g, ', ')
    return {
      summary: clean(out.summary) || fallback.summary,
      hits: (Array.isArray(out.hits) ? out.hits : []).slice(0, 12).map(h => ({ mission: flat(h.mission, 120), kind: flat(h.kind, 20) || 'Mission', minutes: Math.max(0, Math.round(Number(h.minutes) || 0)), what: h.what ? clean(h.what) : null })).filter(h => h.mission),
      protocol: (Array.isArray(out.protocol) ? out.protocol : []).slice(0, 12).map(r => ({ text: clean(r.text), minutes: Math.max(0, Math.round(Number(r.minutes) || 0)) })).filter(r => r.text),
      rogue: (Array.isArray(out.rogue) ? out.rogue : []).slice(0, 12).map(r => ({ text: clean(r.text), minutes: Math.max(0, Math.round(Number(r.minutes) || 0)) })).filter(r => r.text),
      headline: out.headline ? flat(clean(out.headline), 90) : null,
      accomplished: (Array.isArray(out.accomplished) ? out.accomplished : []).slice(0, 6).map(a => flat(clean(a), 140)).filter(Boolean),
    }
  } catch (e) { return { ...fallback, summary: `${fallback.summary} (${String(e.message || e).slice(0, 80)})` } }
}

// Extract: the run closes, one last look is taken, and Lumen writes the report. Miles only at 45 minutes.
export async function extractRun({ model }) {
  const runs = await readIndex(), run = runs.find(r => r.state === 'running')
  if (!run) throw new Error('no run is on')
  const now = new Date().toISOString()
  if (run.focus) await focusEnd(run).catch(() => null)
  try { await canvass() } catch { /* the stream stands as it is */ }
  const own = await readJson(logPath(run.id), { log: [], mac: [] })
  const full = new Date(now) - new Date(run.started_at) >= RUN_MINUTES * 60000 - 5000
  own.log = [...(own.log || []), { at: now, source: 'hud', text: `Run ${run.n} extracted${full ? '' : ' early'}`, mission: null }]
  await writeJson(logPath(run.id), own)
  const doc = await runLog({ ...run, extracted_at: now })
  const next = { ...run, state: 'debrief', extracted_at: now, debrief_ends_at: plus(now, DEBRIEF_MINUTES), miles: full ? RUN_MILES : 0, logged: doc.log.length }
  const rep = await report(next, doc, model)
  // The run goes on the index first (the ledger pays a run it can see there), then the miles are counted.
  await saveIndex((await readIndex()).map(r => r.id === run.id ? { ...next, ...rep } : r))
  const earned = await earnedIn(next, own.ledger)
  const out = { ...next, ...rep, earned, earned_total: Math.round(earned.reduce((s, e) => s + e.miles, 0) * 100) / 100 }
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
  if (run.focus) await focusEnd(run).catch(() => null)
  const out = { ...run, state: 'walked', extracted_at: new Date().toISOString(), miles: 0 }
  await saveIndex(runs.map(r => r.id === run.id ? out : r))
  return out
}

