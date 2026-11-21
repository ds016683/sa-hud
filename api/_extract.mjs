// The extraction debrief (David 11/21: "completely abandon the current effort. start over. we want an extraction
// debrief. the system knows a lot about the task by the time we're here. it should do a final pass on everything and
// build the mission narrative. What was the objective (polaris)? can the system confirm that it was done? what does
// this system need to see to confirm? what else needs to happen now? has the system verified that it's done.").
//
// Two halves. gather() is the final pass: everything the Ledger and the card's storage hold on the mission, plus what
// the system can check for itself (does each live link still answer, how many gates are closed, how far the session
// board got). facts are those checks, stated without a model. brief() hands the record and the facts to Lumen, who
// builds the narrative and a verdict per gate: confirmed, not confirmed, or cannot see, and in the last case what it
// would need to see. It writes nothing. The HUD shows every line, David blesses what is made, and he alone extracts.
import { sb } from './_ledger.mjs'
import { missions, readSteps } from './_trail.mjs'
import { readProofs, proofLines } from './_proofs.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 400) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')
const day = (iso) => iso ? String(iso).slice(0, 10) : ''
const enc = (p) => p.split('/').map(encodeURIComponent).join('/')
const quiet = (p, fallback) => p.catch(() => fallback)

async function storageList(prefix) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 100, sortBy: { column: 'updated_at', order: 'desc' } }) })
  return r.ok ? ((await r.json()) || []).filter(f => f.id) : []
}
async function storageJson(path) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${enc(path)}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return null
  try { return await r.json() } catch { return null }
}
// Does a link still answer? One request, a short wait, the status it gave. A link the system cannot reach is said so.
async function probe(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000)
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': 'sa-hud extraction check' } })
    return { status: r.status, ok: r.ok }
  } catch (e) { return { status: 0, ok: false, error: String(e?.name || e).slice(0, 40) } } finally { clearTimeout(t) }
}
const tokens = (name) => String(name || '').split(/[^A-Za-z0-9]+/).filter(w => w.length > 3 && !/^(the|and|with|for|from|live|test|build|main|mission|project)$/i.test(w)).slice(0, 4)

// Every card on the mission: the project root and each gate's card root.
async function cardTabs(root) {
  const [ws, bd] = await Promise.all([storageList(`${root}/workspace`), storageList(`${root}/build`)])
  const pages = await Promise.all(ws.filter(f => f.name.endsWith('.json')).slice(0, 12).map(async f => { const d = await storageJson(`${root}/workspace/${f.name}`); return d ? { kind: 'blank tab', title: flat(d.title, 100) || f.name.replace(/\.json$/, ''), updated: day(d.updated_at || f.updated_at), text: flat(d.text, 700) } : null }))
  const builds = await Promise.all(bd.filter(f => f.name.endsWith('.json')).slice(0, 16).map(async f => { const d = await storageJson(`${root}/build/${f.name}`); return d ? { kind: 'built tab', title: flat(d.title, 100) || d.slug, updated: day(d.updated_at || f.updated_at), by: d.updated_by || '', note: flat(d.note, 300) } : null }))
  return [...pages, ...builds].filter(Boolean)
}
async function cardPath(root) {
  const d = await storageJson(`${root}/path.json`)
  const steps = Array.isArray(d?.steps) ? d.steps : []
  return steps.slice(0, 30).map(s => ({ text: flat(s.text, 160), done: !!s.done, vetted: !!s.vetted, by: s.by || '' }))
}

export async function gather(projectId) {
  const [p] = await sb(`projects?select=id,name,key,description,category,status,created_at,last_activity_at,target_date&id=eq.${projectId}`)
  if (!p) throw new Error('no such mission')
  const tasks = await sb(`project_tasks?select=id,text,status,done,notes,due_date,released_at,objective_id,created_at&project_id=eq.${projectId}&order=created_at`)
  const oids = tasks.map(t => t.objective_id).filter(Boolean)
  const inList = oids.length ? `in.(${oids.join(',')})` : null
  const [cards, steps, closes, pnotes, pfiles, cfiles, thread, boards, trail, others, logs] = await Promise.all([
    inList ? quiet(sb(`objectives?select=id,title,state,north_star,description,notes,captured_at,released_at&id=${inList}`), []) : [],
    inList ? quiet(sb(`objective_steps?select=objective_id,text,done&objective_id=${inList}&order=position&limit=200`), []) : [],
    inList ? quiet(sb(`archive_entries?select=source_id,source_title,summary,filed_at&source_id=${inList}&order=filed_at.asc&limit=40`), []) : [],
    quiet(sb(`project_notes?select=*&project_id=eq.${projectId}&order=created_at.desc&limit=20`), []),
    quiet(sb(`live_files?select=id,name,note,bucket,path,created_at,objective_id,project_id&project_id=eq.${projectId}&filed_at=is.null&superseded_by=is.null&order=created_at.asc&limit=80`), []),
    inList ? quiet(sb(`live_files?select=id,name,note,bucket,path,created_at,objective_id,project_id&objective_id=${inList}&filed_at=is.null&superseded_by=is.null&order=created_at.asc&limit=80`), []) : [],
    quiet(sb(`lumen_messages?select=at,direction,body,meta&channel=eq.hud&kind=neq.system&or=(${[projectId, ...oids].map(id => `meta.cs.{"item":"${id}"}`).join(',')})&order=id.desc&limit=30`), []),
    quiet(sb(`session_boards?select=id,title,phases,updated_at&or=(project.eq.${encodeURIComponent(p.key || p.name)},project.eq.${encodeURIComponent(p.name)})&order=updated_at.desc&limit=3`), []),
    quiet(readSteps(), { proposals: [], rulings: {} }),
    quiet(missions(), []),
    quiet(sb(`daily_logs?select=day,kind,what,note&or=(${tokens(p.name).map(w => `what.ilike.*${encodeURIComponent(w)}*`).join(',') || 'what.eq.__none__'})&order=day.desc&limit=12`), []),
  ])
  const words = tokens(p.name)
  const meetings = words.length ? await quiet(sb(`granola_meetings?select=title,meeting_date,summary,key_decisions,action_items&or=(${words.map(w => `title.ilike.*${encodeURIComponent(w)}*,summary.ilike.*${encodeURIComponent(w)}*`).join(',')})&order=meeting_date.desc&limit=6`), []) : []
  // Tabs and hand-set steps on every card, in parallel.
  const roots = [{ id: projectId, root: projectId, who: 'the mission' }, ...cards.map(c => ({ id: c.id, root: `objectives/${c.id}`, who: `gate card "${c.title}"` }))]
  const tabsBy = Object.fromEntries(await Promise.all(roots.map(async r => [r.id, await quiet(cardTabs(r.root), [])])))
  const pathBy = Object.fromEntries(await Promise.all(roots.map(async r => [r.id, await quiet(cardPath(r.root), [])])))
  const proofBy = Object.fromEntries(await Promise.all(tasks.map(async t => [t.id, await quiet(readProofs(projectId, t.id), [])])))
  // Files, deduplicated, and every web link checked.
  const seen = new Set()
  const files = [...pfiles, ...cfiles].filter(f => !seen.has(f.id) && seen.add(f.id)).filter(f => !(f.bucket === 'link' && /^claude:\/\//.test(String(f.path || ''))))
  const links = files.filter(f => f.bucket === 'link' && /^https?:\/\//.test(String(f.path || '')))
  const probes = Object.fromEntries(await Promise.all(links.slice(0, 12).map(async f => [f.id, await probe(f.path)])))
  const stepsOf = (id) => steps.filter(s => s.objective_id === id)
  const closesOf = (id) => closes.filter(c => c.source_id === id)
  const accepted = trail.proposals.filter(x => x.mission && x.mission.id === projectId && (trail.rulings[x.id] || {}).verdict === 'accept').slice(-30).map(x => flat(x.text, 160))
  const waiting = trail.proposals.filter(x => x.mission && x.mission.id === projectId && !trail.rulings[x.id]).slice(-20).map(x => flat(x.text, 160))
  const boardRows = boards.map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { title: flat(b.title, 120), updated: day(b.updated_at), done: ts.filter(t => t.status === 'done').length, total: ts.length, last: ts.filter(t => t.status === 'done').slice(-10).map(t => flat(t.label, 140)), open: ts.filter(t => t.status !== 'done').map(t => flat(t.label, 140)).slice(0, 10) } })
  const gates = tasks.map(t => {
    const card = cards.find(c => c.id === t.objective_id) || null
    return {
      id: t.id, text: flat(t.text, 160), closed: !!(t.done || t.status === 'done'), status: t.status, done_when: flat(t.notes, 500), due: t.due_date || null, released: day(t.released_at),
      card: card ? { title: card.title, state: card.state, polaris: flat(card.north_star, 300), story: flat(card.description, 500), notes: flat(card.notes, 400), released: day(card.released_at) } : null,
      stops: card ? stepsOf(card.id).map(s => ({ text: flat(s.text, 140), done: !!s.done })) : [],
      path: card ? pathBy[card.id] || [] : [],
      closing_words: card ? closesOf(card.id).map(c => ({ at: day(c.filed_at), text: flat(c.summary, 700) })) : [],
      tabs: card ? tabsBy[card.id] || [] : [],
      files: files.filter(f => f.objective_id && f.objective_id === t.objective_id).map(f => f.id),
      proofs: proofBy[t.id] || [],
    }
  })
  const dates = [p.last_activity_at, ...tasks.map(t => t.released_at), ...files.map(f => f.created_at), ...boards.map(b => b.updated_at), ...thread.map(m => m.at), ...Object.values(tabsBy).flat().map(t => t.updated)].filter(Boolean).map(String).sort()
  const facts = {
    gates: { closed: gates.filter(g => g.closed).length, total: gates.length, open: gates.filter(g => !g.closed).map(g => g.text) },
    links: { alive: links.filter(f => probes[f.id]?.ok).length, total: links.length, checked: links.map(f => ({ name: f.name, url: f.path, status: probes[f.id]?.status ?? null, ok: !!probes[f.id]?.ok })) },
    files: { in_play: files.length, documents: files.filter(f => f.bucket !== 'link').length, links: links.length },
    tabs: { total: Object.values(tabsBy).flat().length, built: Object.values(tabsBy).flat().filter(t => t.kind === 'built tab').length },
    boards: boardRows.map(b => ({ title: b.title, done: b.done, total: b.total, updated: b.updated })),
    closing_words: closes.length, thread: thread.length, meetings: meetings.length, steps_accepted: accepted.length, steps_waiting: waiting.length,
    first_day: day(p.created_at), last_day: dates.length ? day(dates[dates.length - 1]) : day(p.created_at),
  }
  return { project: p, gates, files: files.map(f => ({ id: f.id, name: flat(f.name, 140), note: flat(f.note, 220), kind: f.bucket === 'link' ? 'link' : 'file', url: f.bucket === 'link' ? f.path : null, on: f.objective_id ? (cards.find(c => c.id === f.objective_id) || {}).title || 'a gate' : 'the mission', day: day(f.created_at), probe: probes[f.id] || null })),
    tabs: tabsBy[projectId] || [], path: pathBy[projectId] || [], notes: pnotes.map(n => flat(n.body || n.note || n.text || JSON.stringify(n), 300)).filter(Boolean),
    thread: thread.reverse().map(m => ({ at: day(m.at), who: m.direction === 'in' ? 'David' : 'Lumen', text: flat(m.body, 260) })),
    boards: boardRows, accepted, waiting, meetings: meetings.map(m => ({ title: flat(m.title, 120), day: m.meeting_date, summary: flat(m.summary, 500), decisions: flat(m.key_decisions, 300), actions: flat(m.action_items, 300) })),
    logs: logs.map(l => ({ day: l.day, what: flat(l.what, 140) })), others: others.filter(m => m.id !== projectId).map(m => `${m.kind}: ${m.title}`).slice(0, 80), facts }
}

function recordText(g) {
  const p = g.project
  const line = (arr, f) => arr.length ? arr.map(f).join('\n') : 'none on record'
  return `## The mission
${p.name}${p.key ? ` (key ${p.key})` : ''}, opened ${g.facts.first_day}, last movement ${g.facts.last_day}.
Polaris, what was to be true, in the words on the card: ${flat(p.description, 900) || 'none written'}

## What the system checked for itself (the facts)
- Gates: ${g.facts.gates.closed} of ${g.facts.gates.total} closed${g.facts.gates.open.length ? `; still open: ${g.facts.gates.open.join('; ')}` : ''}.
- Live links checked just now: ${g.facts.links.alive} of ${g.facts.links.total} answer.${g.facts.links.checked.map(l => `\n  - ${l.name} (${l.url}): ${l.ok ? `answers, ${l.status}` : `does not answer${l.status ? `, ${l.status}` : ''}`}`).join('')}
- Files in play: ${g.facts.files.documents} documents and ${g.facts.files.links} links. Workbench tabs across the cards: ${g.facts.tabs.total} (${g.facts.tabs.built} built).
- Session boards: ${g.boards.length ? g.boards.map(b => `"${b.title}" ${b.done} of ${b.total} items done, last touched ${b.updated}`).join('; ') : 'none'}.
- Closing words on record: ${g.facts.closing_words}. Lumen thread messages on these cards: ${g.facts.thread}. Meetings that mention it: ${g.facts.meetings}. Trail steps accepted: ${g.facts.steps_accepted}, waiting on David: ${g.facts.steps_waiting}.

## The gates, each with everything on its card
${line(g.gates, (x, i) => `### Gate ${i + 1}: ${x.text} [${x.closed ? `closed ${x.released || ''}` : 'OPEN'}]
done when: ${x.done_when || 'not written'}${x.due ? `\ndue: ${x.due}` : ''}${x.card ? `\ncard: ${x.card.title} (${x.card.state}${x.card.released ? `, released ${x.card.released}` : ''})${x.card.polaris ? `; its Polaris: ${x.card.polaris}` : ''}${x.card.story ? `; back story: ${x.card.story}` : ''}${x.card.notes ? `; notes: ${x.card.notes}` : ''}` : '\ncard: none'}
what David wrote when he closed it: ${x.closing_words.length ? x.closing_words.map(c => `(${c.at}) ${c.text}`).join(' | ') : 'nothing'}
stops on the card: ${x.stops.length ? x.stops.map(s => `[${s.done ? 'x' : ' '}] ${s.text}`).join('; ') : 'none'}
steps he set on its path: ${x.path.length ? x.path.map(s => `[${s.done ? 'x' : s.vetted ? 'vetted' : ' '}] ${s.text}`).join('; ') : 'none'}
tabs on its Workbench: ${x.tabs.length ? x.tabs.map(t => `${t.kind} "${t.title}" (${t.updated}${t.by ? `, ${t.by}` : ''})${t.note ? `: ${t.note}` : ''}${t.text ? `: ${t.text}` : ''}`).join(' | ') : 'none'}
files on it: ${x.files.length}
proof filed by the Claude sessions that worked it:
${proofLines(x.proofs)}`)}

## Tabs on the mission's own Workbench
${line(g.tabs, t => `- ${t.kind} "${t.title}" (${t.updated}${t.by ? `, ${t.by}` : ''})${t.note ? `: ${t.note}` : ''}${t.text ? `: ${t.text}` : ''}`)}

## Steps David set on the mission's own path
${line(g.path, s => `- [${s.done ? 'x' : s.vetted ? 'vetted' : ' '}] ${s.text}`)}

## Files in play (id, name, where, day, note; links carry the check just made)
${line(g.files, f => `- id ${f.id}: ${f.name} (${f.kind}, on ${f.on}, ${f.day})${f.note ? ` | ${f.note}` : ''}${f.probe ? ` | checked: ${f.probe.ok ? `answers ${f.probe.status}` : `no answer${f.probe.status ? ` ${f.probe.status}` : ''}`}` : ''}`)}

## Session boards (what sessions logged as done, latest last)
${line(g.boards, b => `- "${b.title}" (${b.done} of ${b.total}, ${b.updated}). Last done: ${b.last.join('; ') || 'none'}.${b.open.length ? ` Open: ${b.open.join('; ')}.` : ''}`)}

## Mission notes
${line(g.notes, n => `- ${n}`)}

## Trail steps accepted on this mission, in order
${line(g.accepted, s => `- ${s}`)}

## Trail steps still waiting on David
${line(g.waiting, s => `- ${s}`)}

## What David and Lumen said on these cards (latest last)
${line(g.thread, m => `- ${m.at} ${m.who}: ${m.text}`)}

## Meetings whose notes mention it
${line(g.meetings, m => `- ${m.day} ${m.title}: ${m.summary}${m.decisions ? ` | decisions: ${m.decisions}` : ''}${m.actions ? ` | actions: ${m.actions}` : ''}`)}

## Activity log lines that name it
${line(g.logs, l => `- ${l.day}: ${l.what}`)}

## Missions he already has open (do not propose these again)
${g.others.join('\n') || 'none'}`
}

const str = { type: 'string' }
const arr = (props, req) => ({ type: 'array', items: { type: 'object', properties: props, required: req, additionalProperties: false } })
const VERDICT = { type: 'string', enum: ['confirmed', 'not_confirmed', 'cannot_see'] }
const TOOL = { name: 'extraction_debrief', description: 'Hand David the extraction debrief.', strict: true, input_schema: { type: 'object', additionalProperties: false,
  required: ['polaris', 'narrative', 'verification', 'overall', 'needs_to_see', 'what_now', 'who_should_hear', 'missions', 'files'], properties: {
    polaris: { type: 'object', additionalProperties: false, required: ['statement', 'source'], properties: { statement: str, source: str } },
    narrative: str,
    verification: arr({ gate: str, done_when: str, saw: { type: 'array', items: str }, verdict: VERDICT, needs: str }, ['gate', 'done_when', 'saw', 'verdict', 'needs']),
    overall: { type: 'object', additionalProperties: false, required: ['verdict', 'readiness', 'basis'], properties: { verdict: VERDICT, readiness: { type: 'integer' }, basis: str } },
    needs_to_see: arr({ what: str, how: str }, ['what', 'how']),
    what_now: arr({ text: str, why: str }, ['text', 'why']),
    who_should_hear: arr({ who: str, why: str }, ['who', 'why']),
    missions: arr({ title: str, kind: { type: 'string', enum: ['Bounty', 'Contract', 'Mythic', 'Main Mission'] }, why: str }, ['title', 'kind', 'why']),
    files: arr({ id: str, keep: { type: 'string', enum: ['file', 'keep', 'drop'] }, why: str }, ['id', 'keep', 'why']),
  } } }

export async function extractionDebrief({ projectId, words = '', model }) {
  if (!model) throw new Error('no model named for the debrief')
  const g = await gather(projectId)
  const said = flat(words, 4000)
  const prompt = `You are Lumen. David is about to extract a Main Mission, which closes it and banks its miles. Before he does, do the final pass: read everything the system holds on it, below, and hand him the extraction debrief.

His rule: "if he doesn't KNOW a thing, he doesn't say a thing." Every line is something the record below states${said ? ' or his context says' : ''}. No guesses, no likely next steps, no people not named there, no dates not written there. An empty part is a right answer. Nothing you write is acted on until he blesses it.

How to judge. For each gate, set the done-when (its notes, or the gate's own words if none were written) against what the record shows: what David wrote when he closed it, the stops and steps marked done, the tabs built, the files in play, the links the system just checked, the session board, the meetings, the thread. Then one verdict:
- confirmed: the record itself shows the done-when holds (a live link answers, a file exists, closing words say it was done, a session logged it done).
- not_confirmed: the record shows it does not hold, or shows it was set aside.
- cannot_see: the gate is marked closed but nothing in the record shows the thing itself. Then say in "needs" exactly what the system would need to see to confirm it (a file, a link that answers, a reply from a named person, a row in a table, a note from David). Be concrete and name the kind of thing.
"saw" lists the two to five pieces of evidence you leaned on, each one short and traceable to a line below (a link and its status, a tab title, a file name, the closing words, a board item). The Polaris gets the same treatment in "overall": the mission's own done-when, a verdict, a readiness from 0 to 100 (100 means every gate confirmed and the Polaris confirmed by the record; a gate that cannot be seen holds it under 90; one not confirmed holds it under 60), and the basis in one or two sentences.

The parts:
1. polaris: statement is the objective in the record's own words (the card's Polaris, or if none is written, the closest thing the record says the mission set out to make true); source says where it came from.
2. narrative: the mission narrative, filed as its record. Four to eight sentences, past tense, plain: what it set out to make true, what was built or done and when, who it reached, what the record shows at the end. His context leads where he gave it. No praise, no em dashes.
3. verification: one row per gate, in order.
4. overall: the verdict on the Polaris, the readiness, the basis.
5. needs_to_see: what the system would need to see to confirm what it cannot (one line per thing; empty if everything is confirmed).
6. what_now: only loose ends the record or his context states are not finished (a stop left open, a step waiting, a closing note that names something to keep running, a file note that says "not yet sent"). Verb first, twelve words at most, with where it came from.
7. who_should_hear: only people named in the record or his context who are owed word, name exactly as written, and why.
8. missions: only next work the record or his context names, with a kind ("Bounty" one discrete action, "Contract" a standard piece of work with a deliverable, "Mythic" a large piece of work with several gates, "Main Mission" a body of work with gates of its own) and where it came from.
9. files: for every file id listed, "file" (belongs with the record and can leave play), "keep" (still live work; a link that still serves people stays in play), or "drop" (a working scrap), with a few words of why. Never build a loose end, a person or a mission out of a file's name or note alone; files are evidence and things to sort.

Write the way he reads: plain, short. No em dashes. Title Case for any title you propose.

${recordText(g)}

## Context David added at the extraction
${said || 'none yet'}

Hand the debrief back by calling the extraction_debrief tool exactly once, with every field. Do not answer in prose.`
  // The model on this door turns back a forced tool (11/21: 400 on tool_choice type "tool"), so the tool is offered
  // with a strict schema and the ask is in the message.
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 9000, tools: [TOOL], tool_choice: { type: 'auto' }, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const msg = await res.json()
  const call = (msg.content || []).find(c => c.type === 'tool_use')
  if (!call || !call.input) throw new Error(msg.stop_reason === 'max_tokens' ? 'the brief ran long; try again' : 'Lumen answered in prose instead of the brief; try again')
  const out = call.input
  const ids = new Set(g.files.map(f => f.id))
  const V = (v) => ['confirmed', 'not_confirmed', 'cannot_see'].includes(v) ? v : 'cannot_see'
  const KINDS = ['Bounty', 'Contract', 'Mythic', 'Main Mission']
  const list = (x) => Array.isArray(x) ? x : []
  return {
    facts: g.facts,
    polaris: { statement: clean(out.polaris?.statement, 600), source: clean(out.polaris?.source, 160) },
    narrative: clean(out.narrative, 2400),
    verification: list(out.verification).slice(0, 20).map(v => ({ gate: clean(v.gate, 160), done_when: clean(v.done_when, 300), saw: list(v.saw).slice(0, 6).map(s => clean(s, 200)).filter(Boolean), verdict: V(v.verdict), needs: clean(v.needs, 300) })),
    overall: { verdict: V(out.overall?.verdict), readiness: Math.max(0, Math.min(100, Math.round(Number(out.overall?.readiness) || 0))), basis: clean(out.overall?.basis, 500) },
    needs_to_see: list(out.needs_to_see).slice(0, 8).map(x => ({ what: clean(x.what, 200), how: clean(x.how, 200) })).filter(x => x.what),
    what_now: list(out.what_now).slice(0, 8).map(x => ({ text: clean(x.text, 160), why: clean(x.why, 160) })).filter(x => x.text),
    who_should_hear: list(out.who_should_hear).slice(0, 8).map(x => ({ who: clean(x.who, 80), why: clean(x.why, 160) })).filter(x => x.who),
    missions: list(out.missions).slice(0, 6).map(x => ({ title: clean(x.title, 120), kind: KINDS.includes(x.kind) ? x.kind : 'Bounty', why: clean(x.why, 160) })).filter(x => x.title),
    files: list(out.files).filter(f => ids.has(String(f.id))).map(f => ({ id: String(f.id), keep: ['file', 'keep', 'drop'].includes(f.keep) ? f.keep : 'file', why: clean(f.why, 120) })),
    file_rows: g.files.map(f => ({ id: f.id, name: f.name, note: f.note, kind: f.kind, url: f.url, on: f.on, probe: f.probe })),
  }
}
