// The gate debrief (David 11/21): "i think gate's are substantial enough to get a smaller version of this. honestly,
// what we should be doing is determining what information should be pulled up inot the main mission page itself
// (artifacts, files, notes) and determining if anything with the mission changed as a result of that particular
// gate. did teh gate change the nature of the mission. but similar construct, yay page, and then some tooling
// indicator for get back to work."
//
// One gate of a Main Mission, read in full: its done-when, its steps, its Workbench tabs, its files. Lumen answers
// three things: can the system confirm the gate is done, what on the gate belongs up on the mission, and did the gate
// change the mission (its Polaris, a gate ahead, a gate that is now needed). It writes nothing. A change to a gate or
// the Polaris is only ever a proposal: David's check makes it, in the HUD.
import { sb } from './_ledger.mjs'
import { readProofs, proofLines } from './_proofs.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 400) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')
const enc = (p) => p.split('/').map(encodeURIComponent).join('/')
const NUM = /^\s*(?:gate\s+)?(\d+)\s*[·.:)-]\s*/i
const numOf = (t) => { const m = NUM.exec(String(t || '')); return m ? Number(m[1]) : null }
const strip = (t) => String(t || '').replace(NUM, '')

async function storageList(prefix) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 100, sortBy: { column: 'updated_at', order: 'desc' } }) })
  return r.ok ? ((await r.json()) || []).filter(f => f.id) : []
}
async function storageJson(path) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${enc(path)}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return null
  try { return await r.json() } catch { return null }
}

// Everything on the gate, and the mission it sits on.
// A gate with no card of its own (taskId, David 11/23: the trail's Extract on Gate 1 skipped the debrief) is read from
// its task and the Workbench it keeps on the mission card, <project id>/gates/<task id>.
export async function gatherGate(objectiveId, taskId = null) {
  let o = null, task = null
  if (objectiveId) {
    ;[o] = await sb(`objectives?select=id,title,description,north_star,captured_at&id=eq.${objectiveId}`)
    if (!o) throw new Error('no such gate card')
    ;[task] = await sb(`project_tasks?select=id,text,notes,project_id&objective_id=eq.${objectiveId}&limit=1`)
    if (!task) throw new Error('this card is not a Main Mission gate')
  } else {
    ;[task] = await sb(`project_tasks?select=id,text,notes,project_id&id=eq.${taskId}&limit=1`)
    if (!task) throw new Error('no such gate')
    o = { id: null, title: task.text, description: task.notes || '', north_star: null }
  }
  const [[p], all] = await Promise.all([
    sb(`projects?select=id,name,key,description&id=eq.${task.project_id}`),
    sb(`project_tasks?select=id,text,status,done,notes,objective_id,created_at&project_id=eq.${task.project_id}&order=created_at`),
  ])
  const root = objectiveId ? `objectives/${objectiveId}` : `${task.project_id}/gates/${task.id}`
  const [ws, bd, files, path, proofs] = await Promise.all([
    storageList(`${root}/workspace`), storageList(`${root}/build`),
    objectiveId ? sb(`live_files?select=id,name,note,bucket,project_id&objective_id=eq.${objectiveId}&filed_at=is.null&superseded_by=is.null&order=created_at.desc&limit=60`).catch(() => []) : Promise.resolve([]),
    storageJson(`${root}/path.json`),
    readProofs(task.project_id, task.id).catch(() => []),
  ])
  const pages = (await Promise.all(ws.filter(f => f.name.endsWith('.json')).slice(0, 14).map(async f => { const d = await storageJson(`${root}/workspace/${f.name}`); const slug = f.name.replace(/\.json$/, ''); return d && (String(d.text || '').trim() || (Array.isArray(d.strokes) && d.strokes.length)) ? { key: `tab:${slug}`, kind: 'Tab', name: flat(d.title, 100) || slug, note: flat(d.text, 260) } : null }))).filter(Boolean)
  const builds = (await Promise.all(bd.filter(f => f.name.endsWith('.json') && !f.name.endsWith('.state.json')).slice(0, 16).map(async f => { const d = await storageJson(`${root}/build/${f.name}`); const slug = f.name.replace(/\.json$/, ''); return d ? { key: `build:${slug}`, kind: 'Built Tab', name: flat(d.title, 100) || slug, note: flat(d.note, 220) } : null }))).filter(Boolean)
  const fl = files.map(f => ({ key: `file:${f.id}`, kind: f.bucket === 'link' ? 'Link' : 'File', name: flat(f.name, 140), note: flat(f.note, 180), on_mission: !!f.project_id }))
  // The gates are the numbered tasks plus any open one without a number, the way the mission page counts them.
  const numbered = all.filter(t => numOf(t.text) !== null), top = Math.max(0, ...numbered.map(t => numOf(t.text)))
  const open = all.filter(t => numOf(t.text) === null && t.status !== 'done' && !t.done)
  const gates = [...numbered, ...open].map((t, i) => ({ id: t.id, n: numOf(t.text) !== null ? numOf(t.text) : top + (i - numbered.length) + 1, text: strip(t.text), done: t.status === 'done' || !!t.done, notes: flat(t.notes, 360), objective_id: t.objective_id })).sort((a, b) => a.n - b.n)
  const me = gates.find(g => g.id === task.id) || { id: task.id, n: numOf(task.text), text: strip(task.text) }
  const next = gates.find(g => !g.done && g.id !== task.id && g.n > (me.n || 0)) || gates.find(g => !g.done && g.id !== task.id) || null
  return { o, task, mission: { id: p.id, name: p.name, polaris: p.description || '' }, gate: me, gates, next, items: [...builds, ...pages, ...fl], proofs, steps: (Array.isArray(path?.steps) ? path.steps : []).slice(0, 30).map(s => ({ text: flat(s.text, 160), done: !!s.done || !!s.vetted })) }
}

const str = { type: 'string' }
const TOOL = { name: 'gate_debrief', description: 'Hand David the gate debrief.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['verification', 'closing_note', 'up', 'changes', 'reconcile'], properties: {
  verification: { type: 'object', additionalProperties: false, required: ['verdict', 'saw', 'need'], properties: { verdict: { type: 'string', enum: ['confirmed', 'not_confirmed', 'cannot_see'] }, saw: str, need: str } },
  closing_note: str,
  up: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'pull', 'why'], properties: { key: str, pull: { type: 'boolean' }, why: str } } },
  reconcile: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['what', 'why'], properties: { what: str, why: str } } },
  changes: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['kind', 'gate', 'text', 'why'], properties: { kind: { type: 'string', enum: ['polaris', 'reword_gate', 'new_gate'] }, gate: str, text: str, why: str } } },
} } }

export async function gateDebrief({ objectiveId = null, taskId = null, words = '', model }) {
  if (!model) throw new Error('no model named for the gate debrief')
  const g = await gatherGate(objectiveId, taskId)
  const said = flat(words, 4000)
  const prompt = `You are Lumen. David is extracting one gate of a Main Mission. Brief him before it closes, from the gate's record${said ? ' and the context he has added' : ''}.

His rule: "if he doesn't KNOW a thing, he doesn't say a thing." Every line must be something the record below states${said ? ' or his context says' : ''}. No guesses. An empty list is a right answer. Nothing you write is acted on until he checks it.

Write the way he reads: plain, short. No em dashes. No praise. Title Case for any title you propose.

## The mission
${g.mission.name}
Its Polaris, what is to be true: ${flat(g.mission.polaris, 900) || 'none written'}

## Its gates, in order
${g.gates.map(x => `- Gate ${x.n} (${x.done ? 'closed' : x.id === g.gate.id ? 'THIS GATE' : 'open'}): ${x.text}${x.notes ? ` | ${x.notes}` : ''}`).join('\n')}

## This gate
Gate ${g.gate.n}: ${g.gate.text}
What came in with it, and its done-when: ${flat(g.task.notes, 1400) || 'none written'}

## Steps on its trail
${g.steps.map(s => `- ${s.done ? 'done' : 'OPEN'}: ${s.text}`).join('\n') || 'none'}

## Proof filed by the Claude sessions that worked this gate (what each says it built and tested)
${proofLines(g.proofs)}

## What sits on the gate's card
${g.items.map(i => `- key ${i.key} · ${i.kind}: ${i.name}${i.note ? ` | ${i.note}` : ''}${i.on_mission ? ' | already on the mission' : ''}`).join('\n') || 'nothing'}

## Context David added at the close
${said || 'none yet'}

Answer five things:
1. verification: can the record confirm this gate is done? verdict is "confirmed" when the record shows the done-when met (a session's proof counts as record: what it says it built and tested is evidence; what it says it did not test is not), "not_confirmed" when it shows it is not met, "cannot_see" when the record does not hold what would show it. saw: what the record shows, in one or two sentences. need: what the system would need to see to confirm it, or an empty string when confirmed.
2. closing_note: two or three sentences on what this gate produced. His context, where he gave it, leads.
3. up: for EVERY item on the gate's card, by its key: pull true when it is something the mission as a whole will want at hand (a deliverable, an agreement, an analysis others will use, a decision record), false when it is working material that belongs with the gate. A few words of why.
4. changes: did this gate change the mission? Only where the record or his context shows it. kind "polaris" when what the mission is to make true has moved (text is the new Polaris, gate is an empty string); "reword_gate" when a gate still open ahead no longer says what it must (gate is that gate's current words exactly, text is the new words); "new_gate" when the record shows work the mission now needs that no gate holds (text is the gate's words, gate is an empty string). A few words of why, naming where in the record it comes from. If the gate changed nothing, return an empty list.
5. reconcile: Items (David 11/22: "Item means a task, piece of information, email fragment, a document ... anything") in his context or the record that belong somewhere other than this mission: another mission, a gate or data elsewhere, a follow-up, an idea. Do not decide where it goes; he reconciles it on his list. what: the Item in his words where he gave them. why: a few words on why it does not belong to this mission's changes. Anything already in changes is not repeated here. An empty list is a right answer.

Hand the debrief back by calling the gate_debrief tool exactly once, with every field. Do not answer in prose.`
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 5000, tools: [TOOL], tool_choice: { type: 'auto' }, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const msg = await res.json()
  const call = (msg.content || []).find(c => c.type === 'tool_use')
  if (!call || !call.input) throw new Error(msg.stop_reason === 'max_tokens' ? 'the brief ran long; try again' : 'Lumen answered in prose instead of the brief; try again')
  const out = call.input
  const byKey = new Map((Array.isArray(out.up) ? out.up : []).map(u => [String(u.key), u]))
  const openAhead = g.gates.filter(x => !x.done && x.id !== g.gate.id)
  const changes = (Array.isArray(out.changes) ? out.changes : []).slice(0, 6).map(c => {
    const text = clean(c.text, c.kind === 'polaris' ? 900 : 200), why = clean(c.why, 200)
    if (!text) return null
    if (c.kind === 'reword_gate') { const t = openAhead.find(x => x.text.toLowerCase() === flat(c.gate, 300).toLowerCase()) || openAhead.find(x => flat(c.gate, 300).toLowerCase().includes(x.text.toLowerCase())); return t ? { kind: 'reword_gate', task_id: t.id, n: t.n, from: t.text, text, why } : null }
    return { kind: c.kind === 'polaris' ? 'polaris' : 'new_gate', text, why }
  }).filter(Boolean)
  const v = out.verification || {}
  return {
    mission: g.mission, gate: { id: g.gate.id, n: g.gate.n, text: g.gate.text }, next: g.next ? { task_id: g.next.id, n: g.next.n, text: g.next.text, objective_id: g.next.objective_id || null } : null,
    top: Math.max(0, ...g.gates.map(x => x.n || 0)),
    verification: { verdict: ['confirmed', 'not_confirmed', 'cannot_see'].includes(v.verdict) ? v.verdict : 'cannot_see', saw: clean(v.saw, 500), need: clean(v.need, 400) },
    closing_note: clean(out.closing_note, 900),
    proofs: g.proofs,
    items: g.items.map(i => ({ ...i, pull: !!byKey.get(i.key)?.pull, why: clean(byKey.get(i.key)?.why, 140) })),
    changes,
    reconcile: (Array.isArray(out.reconcile) ? out.reconcile : []).slice(0, 6).map(r => ({ what: clean(r.what, 300), why: clean(r.why, 200) })).filter(r => r.what),
  }
}
