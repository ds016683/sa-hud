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
import { sb } from './_ledger.mjs'
import { missions } from './_trail.mjs'
import { canvass, eventsBetween, namer, readJson, writeJson, chiDay, flat } from './_canvass.mjs'
import { strikeDay } from './_river.mjs'

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
  return { run: last ? { ...last, log, logged } : null, today: { runs: mine.filter(r => r.state === 'filed').length, miles: mine.reduce((s, r) => s + (r.state === 'filed' ? (r.miles || 0) : 0), 0) } }
}

// ---- the verbs ----------------------------------------------------------------------------------
export async function startRun() {
  const runs = await readIndex()
  if (activeOf(runs)) throw new Error('a run is already on; extract it first')
  const now = new Date().toISOString(), day = chiDay(now)
  const n = runs.filter(r => r.day === day).length + 1
  const run = { id: `${day}-${n}-${Date.now().toString(36)}`, day, n, state: 'running', started_at: now, ends_at: plus(now, RUN_MINUTES), extracted_at: null, debrief_ends_at: null, filed_at: null, miles: 0, logged: 0, summary: null, hits: [], rogue: [], word: null }
  // What the ledger already holds, so Extract can tell what this run earned (see earnedIn).
  const ledger = await ledgerOf(day).then(rows => ({ day, keys: rows.map(ledgerKey) })).catch(() => null)
  await writeJson(logPath(run.id), { id: run.id, ledger, log: [{ at: now, source: 'hud', text: `Run ${n} started`, mission: null }], mac: [] })
  await saveIndex([...runs, { ...run, logged: 1 }])
  return run
}

// The schedule's minute. This is the canvass's caller (Extract takes one last look of its own): every
// minute while a run is on, every fifth minute otherwise (David 11/17: one system, one set of protocols, faster only when a run is on).
export async function tick() {
  const runs = await readIndex(), run = activeOf(runs)
  const now = new Date()
  if (run && run.state === 'debrief' && now.toISOString() > run.debrief_ends_at) await fileRun({ word: null })   // the debrief ran out: it files as written
  const running = !!run && run.state === 'running'
  if (!running && now.getUTCMinutes() % 5 !== 0) return { active: !!run, looked: false }
  const out = await canvass()
  return { active: !!run, looked: true, ...out }
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
  const fallback = { summary: `This run was ${minutes} minutes with ${doc.log.length} lines logged. Lumen's written read is not here; the numbers below come straight from the clocks.`, hits: clocked.map(c => ({ mission: c.mission, kind: (list.find(m => m.title === c.mission) || {}).kind || 'Mission', minutes: c.minutes, what: null })), rogue: [], headline: null, accomplished: doc.log.filter(e => /^(Gate closed|Closed out|Sent|File added):/.test(e.text) || e.source === 'session').slice(-6).map(e => flat(e.text, 140)) }
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

Also give a headline and what was accomplished. The headline is one plain line of eight words at most, in Title Case, that says what this run turned out to be; it must be true to the log, so a run that went to a meeting or the inbox says so. Accomplished is up to six short lines, each one thing the log shows was finished, sent, produced or closed during the run (a gate closed, mail sent, a file added, work a session closed), past tense, the verb first. Something only opened or looked at is not accomplished. An empty list is a fine answer.

Reply with one JSON object and nothing else: {"headline":"<the headline>","accomplished":["<one line>"],"summary":"three or four sentences on where the run went","hits":[{"mission":"<exact mission title>","kind":"Main Mission|Side Mission","minutes":<number>,"what":"one line on what happened there"}],"rogue":[{"text":"what it was, in a few words","minutes":<number>}]}`
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) })
    if (!res.ok) throw new Error(`anthropic -> ${res.status}`)
    const out = parseJson(((await res.json()).content || []).filter(c => c.type === 'text').map(c => c.text).join(''))
    const clean = (t) => flat(t, 600).replace(/\s*[—–]\s*/g, ', ')
    return {
      summary: clean(out.summary) || fallback.summary,
      hits: (Array.isArray(out.hits) ? out.hits : []).slice(0, 12).map(h => ({ mission: flat(h.mission, 120), kind: flat(h.kind, 20) || 'Mission', minutes: Math.max(0, Math.round(Number(h.minutes) || 0)), what: h.what ? clean(h.what) : null })).filter(h => h.mission),
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
  const out = { ...run, state: 'walked', extracted_at: new Date().toISOString(), miles: 0 }
  await saveIndex(runs.map(r => r.id === run.id ? out : r))
  return out
}

