// Proposed steps (David 11/17): "a Gate is the big thing and that's me. What i want you
// documenting are the smaller "steps" that happen between gates, which are ultimately just
// documenting my work. If i make a "change to slide 6" it would get documented here. Pithy.
// Succinct. I don't need old versions, integration sourcing, etc. Just document what i have
// actively done. Sent emails. Claude session. Slack (when we reconnect). That said..... I don't
// want the system doing the writing directly to the cards just yet. So, what i'd like to do, is
// wire and test some of this documentation so we can calibrate before unintetionally
// reintegrating new noise back into the system."
//
// So nothing here touches a card. Lumen reads what David did (the mail he sent, the work a
// Claude Code session closed on its board), proposes one line per event against a mission, and
// the lines wait on the Proposed Steps page for his Accept or Reject. His rulings, with the
// reason on a reject, are read back before the next run: that is how the voice is calibrated.
//
// Two files in project-files/trail-steps, one writer each, so neither overwrites the other:
//   proposals.json  { v, proposals, skipped, cursor, ran_at }       written here only
//   rulings.json    { v, rulings: { <id>: { verdict, why, at } } }  written by the HUD only
import { sb } from './_ledger.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
export const PROPOSALS = 'trail-steps/proposals.json'
export const RULINGS = 'trail-steps/rulings.json'
export const CLEAR_AT = 15          // his rule: at 15 or more waiting, he is reminded on every turn
const FIRST_DAYS = 3                // a first run reads this far back
const FIRST_SAMPLE = 8              // and takes this many closed tasks from a board it has not seen
const KEEP = 600

async function readJson(path, blank) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return blank
  try { return { ...blank, ...(await r.json()) } } catch { return blank }
}
async function writeJson(path, doc) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path}`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!r.ok) throw new Error(`steps save ${r.status}: ${(await r.text()).slice(0, 160)}`)
}
export async function readSteps() {
  const [p, r] = await Promise.all([
    readJson(PROPOSALS, { v: 1, proposals: [], skipped: [], cursor: {}, ran_at: null }),
    readJson(RULINGS, { v: 1, rulings: {} }),
  ])
  return { ...p, proposals: Array.isArray(p.proposals) ? p.proposals : [], skipped: Array.isArray(p.skipped) ? p.skipped : [], cursor: p.cursor || {}, rulings: r.rulings && typeof r.rulings === 'object' ? r.rulings : {} }
}
export const pendingOf = (s) => s.proposals.filter(p => !s.rulings[p.id])
export async function stepsWaiting() { try { return pendingOf(await readSteps()).length } catch { return 0 } }

const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)

// What David did since the last run. Each event: { ref, source, at, basis, detail, hint }.
async function sentMail(after) {
  const rows = await sb(`emails?select=id,subject,to_names,preview,received_at&folder=eq.sent&received_at=gt.${encodeURIComponent(after)}&order=received_at.asc&limit=80`)
  return rows.map(e => {
    const to = (Array.isArray(e.to_names) ? e.to_names : []).slice(0, 4).join(', ') || 'no one named'
    return { ref: `email:${e.id}`, source: 'email', at: e.received_at, basis: `To ${to}: ${flat(e.subject, 90) || '(no subject)'}`, detail: flat(e.preview, 220), hint: null }
  })
}
async function sessionWork(seen, since) {
  const boards = await sb(`session_boards?select=project,title,phases,updated_at&updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc`)
  const events = [], next = { ...seen }
  for (const b of boards) {
    const done = []
    for (const ph of (Array.isArray(b.phases) ? b.phases : [])) for (const t of (ph.tasks || [])) if (t.status === 'done') done.push({ id: String(t.id), label: t.label, phase: ph.title })
    const known = seen[b.project]
    let fresh = known ? done.filter(t => !known.includes(t.id)) : done.slice(-FIRST_SAMPLE)
    fresh = fresh.slice(-20)
    for (const t of fresh) events.push({ ref: `session:${b.project}:${t.id}`, source: 'session', at: b.updated_at, basis: `Session board ${flat(b.title, 60)}: ${flat(t.label, 140)}`, detail: flat(t.phase, 120), hint: b.project })
    next[b.project] = done.map(t => t.id)
  }
  return { events, seen: next }
}

// The missions a step can sit on: every active Main Mission (with its open gates, for matching)
// and every open Side Mission. A card opened for a Main Mission's gate folds into that mission.
async function missions() {
  const [projects, tasks, objs] = await Promise.all([
    sb('projects?select=id,key,name&status=eq.active'),
    sb('project_tasks?select=project_id,text,objective_id,done&limit=3000'),
    sb('objectives?select=id,title,tags,parent_id&deleted_at=is.null&state=in.(active,parked,waiting,follow_up)&limit=500'),
  ])
  const linked = new Set(tasks.filter(t => t.objective_id).map(t => t.objective_id))
  const list = projects.map(p => ({ id: p.id, kind: 'Main Mission', title: p.name, key: p.key, gates: tasks.filter(t => t.project_id === p.id && !t.done).slice(0, 14).map(t => flat(t.text, 90)) }))
  for (const o of objs) {
    if (linked.has(o.id) || o.parent_id || (o.tags || []).includes('session')) continue
    list.push({ id: o.id, kind: 'Side Mission', title: o.title })
  }
  return list
}

const parseJson = (text) => { const a = text.indexOf('{'), b = text.lastIndexOf('}'); if (a < 0 || b < 0) throw new Error('no JSON in the reply'); return JSON.parse(text.slice(a, b + 1)) }
const clean = (t) => flat(t, 160).replace(/\s*[—–]\s*/g, ', ')

function prompt(events, list, state) {
  const ruled = state.proposals.filter(p => state.rulings[p.id])
  const no = ruled.filter(p => state.rulings[p.id].verdict === 'reject').slice(-25)
  const yes = ruled.filter(p => state.rulings[p.id].verdict === 'accept').slice(-25)
  const learned = (no.length || yes.length)
    ? `\n\n## What David has ruled so far. Calibrate to it: write more like the accepted lines, and do not repeat what he rejected or the reason he gave.\n${no.length ? `Rejected:\n${no.map(p => `- "${p.text}" (from: ${p.basis})${state.rulings[p.id].why ? `. His reason: ${flat(state.rulings[p.id].why, 240)}` : ''}`).join('\n')}\n` : ''}${yes.length ? `Accepted:\n${yes.map(p => `- "${p.text}" (from: ${p.basis})`).join('\n')}` : ''}`
    : ''
  return `You are Lumen. You keep a short record of David's own work on his missions: the small steps that happen between a mission's gates. A gate is the big requirement and David sets those himself; you never write one. You only propose steps, and David accepts or rejects each one before anything reaches a card.

His rule, in his words: "What i want you documenting are the smaller steps that happen between gates, which are ultimately just documenting my work. If i make a change to slide 6 it would get documented here. Pithy. Succinct. I don't need old versions, integration sourcing, etc. Just document what i have actively done."

For each event below, decide whether it is a step on one of the listed missions, and if it is, write the step.

How a step reads: one line, past tense, the verb first, what he did and for or to whom. Twelve words at most. No em dashes. No adjectives or praise. No file versions, tool names or system names, and nothing about where the fact came from. The shape, not the words: "Sent the revised scope to the client." "Changed slide 6."

What is not a step: a reply that only thanks, confirms or sets a time; anything personal; work that built or repaired the tools themselves unless a listed mission is about those tools. For those, give text null.

Matching: use the mission whose work the event plainly belongs to. A session event carries the project key its board ran under; that is a strong hint, not proof. If the event is real work but no listed mission fits, give mission null and still write the text. Never force a match.${learned}

## Missions
${list.map(m => `- ${m.id} · ${m.kind} · ${m.title}${m.key ? ` (key ${m.key})` : ''}${m.gates && m.gates.length ? `\n  open gates: ${m.gates.join(' | ')}` : ''}`).join('\n')}

## Events
${events.map((e, i) => `- ref e${i + 1} · ${e.source === 'email' ? 'email David sent' : 'work a Claude Code session closed for David'} · ${e.at}${e.hint ? ` · project key ${e.hint}` : ''}\n  ${e.basis}${e.detail ? `\n  ${e.detail}` : ''}`).join('\n')}

Reply with one JSON object and nothing else: {"steps":[{"ref":"<the event ref>","mission":"<mission id, or null>","text":"<the step, or null>"}]} with one entry for every event.`
}

// One run: gather, ask, append. Returns { events, added, skipped, pending }.
export async function capture({ model }) {
  if (!model) throw new Error('no model named for the capture')
  const state = await readSteps()
  const first = !state.ran_at
  const since = state.ran_at || new Date(Date.now() - FIRST_DAYS * 864e5).toISOString()
  const mailAfter = state.cursor.mail_after || since
  const [mail, work, list] = await Promise.all([sentMail(mailAfter), sessionWork(state.cursor.seen || {}, first ? since : new Date(new Date(since).getTime() - 36e5).toISOString()), missions()])
  const had = new Set([...state.proposals.map(p => p.id), ...state.skipped.map(s => s.ref)])
  const events = [...mail, ...work.events].filter(e => !had.has(e.ref))
  const now = new Date().toISOString()
  const cursor = { mail_after: mail.length ? mail[mail.length - 1].at : mailAfter, seen: work.seen }
  if (!events.length) {
    await writeJson(PROPOSALS, { v: 1, proposals: state.proposals, skipped: state.skipped, cursor, ran_at: now })
    return { events: 0, added: 0, skipped: 0, pending: pendingOf(state).length }
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: 'user', content: prompt(events, list, state) }] }),
  })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const body = await res.json()
  const text = (body.content || []).filter(c => c.type === 'text').map(c => c.text).join('')
  const steps = parseJson(text).steps
  if (!Array.isArray(steps)) throw new Error('the reply held no steps')
  // The prompt names each event e1, e2, ... (a mail id is too long to copy back reliably).
  const byRef = new Map(steps.map(s => [String(s.ref), s]))
  const byId = new Map(list.map(m => [m.id, m]))
  const added = [], skipped = []
  for (const [i, e] of events.entries()) {
    const s = byRef.get(`e${i + 1}`)
    const line = s && s.text ? clean(s.text) : ''
    if (!line) { skipped.push({ ref: e.ref, source: e.source, at: e.at, basis: e.basis }); continue }
    const m = s.mission ? byId.get(String(s.mission)) : null
    added.push({ id: e.ref, source: e.source, at: e.at, basis: e.basis, text: line, mission: m ? { id: m.id, kind: m.kind, title: m.title } : null, proposed_at: now })
  }
  const next = { v: 1, proposals: [...state.proposals, ...added].slice(-KEEP), skipped: [...state.skipped, ...skipped].slice(-200), cursor, ran_at: now }
  await writeJson(PROPOSALS, next)
  return { events: events.length, added: added.length, skipped: skipped.length, pending: pendingOf({ ...next, rulings: state.rulings }).length }
}
