// The mission debrief (David 11/21, on the old Mark Mission Complete box: "i think it would be pretty fun to have a
// debref package. what needs to be kept and filed, what else needs to happen, does any other comunication need to
// occur. maybe i could type it in a box and then Lumen can recommend closing notes, organization, and any other
// missions that got blasted out of it"). This reads the mission's record and David's own words and drafts the five
// parts. It writes nothing: every line comes back for David to check, and only what he checks is made, by the HUD.
import { sb } from './_ledger.mjs'
import { missions, readSteps } from './_trail.mjs'

const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 400) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')

export async function debrief({ projectId, words, files = [], model }) {
  if (!model) throw new Error('no model named for the debrief')
  const [p] = await sb(`projects?select=id,name,key,description,created_at&id=eq.${projectId}`)
  if (!p) throw new Error('no such mission')
  const tasks = await sb(`project_tasks?select=text,status,done,notes,released_at,objective_id&project_id=eq.${projectId}&order=created_at`)
  // What David wrote when he closed each gate, and the steps he accepted on this mission: the record's own words.
  const cards = tasks.map(t => t.objective_id).filter(Boolean)
  const closes = cards.length ? await sb(`archive_entries?select=source_title,summary,filed_at&source_id=in.(${cards.join(',')})&kind=eq.summary&order=filed_at.asc&limit=30`).catch(() => []) : []
  const steps = await readSteps().then(st => st.proposals.filter(x => x.mission && x.mission.id === projectId && (st.rulings[x.id] || {}).verdict === 'accept').slice(-30).map(x => x.text)).catch(() => [])
  const others = (await missions()).filter(m => m.id !== projectId).map(m => `${m.kind}: ${m.title}`).slice(0, 80)
  const fl = (Array.isArray(files) ? files : []).slice(0, 60).map(f => ({ id: String(f.id), name: flat(f.name, 140), note: flat(f.note, 160) }))
  const said = flat(words, 4000)
  const prompt = `You are Lumen. David is closing a Main Mission. Brief him before it is put away, from the mission's record${said ? ' and the context he has added' : ''}.

His rule for this brief, in his words: "Lumen briefs, pre-populates. if he doesn't KNOW a thing, he doesn't say a thing." So every line must be something the record below states${said ? ' or his context says' : ''}: a gate, what he wrote when he closed a gate, a step he accepted${said ? ', his context' : ''}. No guesses, no likely next steps, no people who are not named there, no dates or commitments that are not written there. If you do not know, leave that part empty. An empty part is a right answer. Nothing you write is acted on until he blesses it.

The files are there to be sorted, not read as news: never build a note, a loose end, a person to tell or a mission out of a file's name or its note alone.

Write the way he reads: plain, short, past tense for what happened. No em dashes. No praise. Title Case for any title you propose.

## The mission
${p.name}${p.key ? ` (key ${p.key})` : ''}
Its Polaris, what was to be true: ${flat(p.description, 900) || 'none written'}

## Its gates
${tasks.map(t => `- ${t.done || t.status === 'done' ? 'closed' : 'OPEN'}: ${flat(t.text, 140)}${t.notes ? ` | ${flat(t.notes, 420)}` : ''}`).join('\n') || 'none'}

## What David wrote when he closed a gate
${closes.map(c => `- ${flat(c.source_title, 80)}: ${flat(c.summary, 600)}`).join('\n') || 'nothing on record'}

## Steps he accepted on this mission, in order
${steps.map(x => `- ${flat(x, 160)}`).join('\n') || 'none'}

## Files in play on it
${fl.map(f => `- id ${f.id}: ${f.name}${f.note ? ` | ${f.note}` : ''}`).join('\n') || 'none'}

## Missions he already has open (do not propose these again)
${others.join('\n') || 'none'}

## Context David added at the close
${said || 'none yet'}

The five parts:
1. closing_notes: two to five sentences. What the mission set out to make true and what the record shows happened. His context, where he gave it, leads. This is filed as the mission's record.
2. files: for every file listed, "file" (belongs with the mission's record and can leave play), "keep" (still live work, stays in play), or "drop" (a working scrap), with a few words of why.
3. still_to_happen: only loose ends the record or his context states are not finished. One line each, the verb first, twelve words at most, and where it came from in a few words.
4. who_should_hear: only people named in the record or his context who are owed word. The name exactly as written, and why in a few words.
5. missions: only next work the record or his context names. A title, a kind ("Bounty" one discrete action, "Contract" a standard piece of work with a deliverable, "Mythic" a large piece of work with several gates, "Main Mission" a body of work with gates of its own), and where it came from in a few words.`
  // The reply comes back through a tool call, so it is always one well-formed object (a hand-written JSON reply broke on 11/21).
  const line = (props, req) => ({ type: 'array', items: { type: 'object', properties: props, required: req } })
  const str = { type: 'string' }
  const tool = { name: 'debrief', description: 'Hand David the brief.', input_schema: { type: 'object', required: ['closing_notes', 'files', 'still_to_happen', 'who_should_hear', 'missions'], properties: {
    closing_notes: str,
    files: line({ id: str, keep: { type: 'string', enum: ['file', 'keep', 'drop'] }, why: str }, ['id', 'keep']),
    still_to_happen: line({ text: str, why: str }, ['text']),
    who_should_hear: line({ who: str, why: str }, ['who']),
    missions: line({ title: str, kind: { type: 'string', enum: ['Bounty', 'Contract', 'Mythic', 'Main Mission'] }, why: str }, ['title', 'kind']),
  } } }
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 6000, tools: [tool], tool_choice: { type: 'tool', name: 'debrief' }, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const call = ((await res.json()).content || []).find(c => c.type === 'tool_use')
  if (!call || !call.input) throw new Error('Lumen sent no brief back')
  const out = call.input
  const ids = new Set(fl.map(f => f.id))
  const KINDS = ['Bounty', 'Contract', 'Mythic', 'Main Mission']
  return {
    closing_notes: clean(out.closing_notes, 1600),
    files: (Array.isArray(out.files) ? out.files : []).filter(f => ids.has(String(f.id))).map(f => ({ id: String(f.id), keep: ['file', 'keep', 'drop'].includes(f.keep) ? f.keep : 'file', why: clean(f.why, 120) })),
    still_to_happen: (Array.isArray(out.still_to_happen) ? out.still_to_happen : []).slice(0, 8).map(x => ({ text: clean(x.text, 160), why: clean(x.why, 160) })).filter(x => x.text),
    who_should_hear: (Array.isArray(out.who_should_hear) ? out.who_should_hear : []).slice(0, 8).map(x => ({ who: clean(x.who, 80), why: clean(x.why, 160) })).filter(x => x.who),
    missions: (Array.isArray(out.missions) ? out.missions : []).slice(0, 6).map(x => ({ title: clean(x.title, 120), kind: KINDS.includes(x.kind) ? x.kind : 'Bounty', why: clean(x.why, 160) })).filter(x => x.title),
  }
}
