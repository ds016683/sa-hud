// The mission debrief (David 11/21, on the old Mark Mission Complete box: "i think it would be pretty fun to have a
// debref package. what needs to be kept and filed, what else needs to happen, does any other comunication need to
// occur. maybe i could type it in a box and then Lumen can recommend closing notes, organization, and any other
// missions that got blasted out of it"). This reads the mission's record and David's own words and drafts the five
// parts. It writes nothing: every line comes back for David to check, and only what he checks is made, by the HUD.
import { sb } from './_ledger.mjs'
import { missions, parseJson } from './_trail.mjs'

const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 400) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')

export async function debrief({ projectId, words, files = [], model }) {
  if (!model) throw new Error('no model named for the debrief')
  const [p] = await sb(`projects?select=id,name,key,description,created_at&id=eq.${projectId}`)
  if (!p) throw new Error('no such mission')
  const tasks = await sb(`project_tasks?select=text,status,done,notes,released_at&project_id=eq.${projectId}&order=created_at`)
  const others = (await missions()).filter(m => m.id !== projectId).map(m => `${m.kind}: ${m.title}`).slice(0, 80)
  const fl = (Array.isArray(files) ? files : []).slice(0, 60).map(f => ({ id: String(f.id), name: flat(f.name, 140), note: flat(f.note, 160) }))
  const prompt = `You are Lumen. David is closing a Main Mission and has written, in his own words, what is true now. Draft his debrief package from his words and the mission's record. Nothing you write is acted on until he checks it, so propose plainly and only what the record or his words support. If a part has nothing real in it, return an empty list for it. Never invent a person, a file, a date or a commitment.

Write the way he reads: plain, short, past tense for what happened. No em dashes. No praise. Title Case for any title you propose.

## The mission
${p.name}${p.key ? ` (key ${p.key})` : ''}
Its Polaris, what was to be true: ${flat(p.description, 900) || 'none written'}

## Its gates
${tasks.map(t => `- ${t.done || t.status === 'done' ? 'closed' : 'OPEN'}: ${flat(t.text, 140)}${t.notes ? ` | ${flat(t.notes, 420)}` : ''}`).join('\n') || 'none'}

## Files in play on it
${fl.map(f => `- id ${f.id}: ${f.name}${f.note ? ` | ${f.note}` : ''}`).join('\n') || 'none'}

## Missions he already has open (do not propose these again)
${others.join('\n') || 'none'}

## David's words at the close
${flat(words, 4000)}

Draft five parts:
1. closing_notes: three to five sentences. What the mission set out to make true, what happened, and whether it is true now, leaning on his words. This is filed as the mission's record.
2. files: for every file listed, one of "file" (belongs with the mission's record and can leave play), "keep" (still live work, stays in play), or "drop" (a working scrap with no lasting value), with a few words of why.
3. still_to_happen: loose ends the record or his words show are not finished and that nobody owns. One line each, the verb first, twelve words at most, with a few words of why.
4. who_should_hear: people named in the record or his words who would want to know the mission closed or who are owed a note. The name exactly as it appears, and why in a few words.
5. missions: new missions this one set in motion, only where the record or his words point at real next work. For each a title, a kind ("Bounty" for one discrete action, "Contract" for a standard piece of work with a deliverable, "Mythic" for a large piece of work with several gates, "Main Mission" for a body of work with gates of its own), and why in a few words.

Reply with one JSON object and nothing else: {"closing_notes":"...","files":[{"id":"<the file id>","keep":"file|keep|drop","why":"..."}],"still_to_happen":[{"text":"...","why":"..."}],"who_should_hear":[{"who":"...","why":"..."}],"missions":[{"title":"...","kind":"Bounty|Contract|Mythic|Main Mission","why":"..."}]}`
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const out = parseJson(((await res.json()).content || []).filter(c => c.type === 'text').map(c => c.text).join(''))
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
