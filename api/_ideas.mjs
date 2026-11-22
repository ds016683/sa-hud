// The Ideas Board (David 11/21): a place to park what comes out, books to video games to political TikToks. Nothing
// on it is ever actioned: no clock, no miles. Intake is his rule, verbatim in spirit: an idea lands here only when he
// tells Lumen directly, or sends it from the reconciliation page (the Catches list); anything he flags otherwise goes
// to reconciliation first. When an idea comes back, it gains a layer ("if it keeps coming out, we can add layers").
// One file in project-files: ideas/index.json
//   { v, ideas: [{ id, title, shelf, project, created_at, layers: [{ id, at, src: 'told' | 'voice' | 'recon', words, where }] }] }
// Shelves are the set of shelf names in use; Lumen names a new one only when nothing fits.
const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 300) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')
export const IDEAS = 'ideas/index.json'
const SRC = new Set(['told', 'voice', 'recon'])

export async function readIdeas() {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${IDEAS}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return { v: 1, ideas: [] }
  try { const d = await r.json(); return { v: 1, ideas: Array.isArray(d?.ideas) ? d.ideas : [] } } catch { return { v: 1, ideas: [] } }
}
async function writeIdeas(doc) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${IDEAS}`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!r.ok) throw new Error(`save ${r.status}: ${(await r.text()).slice(0, 160)}`)
}
async function projectNames() {
  try {
    const r = await fetch(`${URL_BASE}/rest/v1/projects?select=name,status&order=name.asc&limit=80`, { headers: svc() })
    const rows = r.ok ? await r.json() : []
    return rows.filter(p => !['done', 'complete', 'completed', 'archived'].includes(String(p.status || '').toLowerCase())).map(p => p.name).filter(Boolean)
  } catch { return [] }
}

const str = { type: 'string' }
const TOOL = { name: 'shelve', description: 'Say where the idea goes.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['match_id', 'title', 'shelf', 'project'], properties: { match_id: str, title: str, shelf: str, project: str } } }

// words: what David said, kept verbatim as the layer. src: 'told' | 'voice' | 'recon'. where: a few words on where it came from.
export async function parkIdea({ words, src = 'told', where = '', model }) {
  const said = clean(words, 1200)
  if (!said) throw new Error('nothing to park')
  const doc = await readIdeas()
  const shelves = [...new Set(doc.ideas.map(i => i.shelf).filter(Boolean))]
  const projects = await projectNames()
  const prompt = `You are Lumen, shelving an idea on David's Ideas Board. It is a place to park what comes out of him (books, video games, political TikToks, ventures, anything); nothing on it is a task. Decide where these words go.

- If they are the same idea as one already on the board coming out again (a new angle, a title, a detail), give its id as match_id; the words become a new layer on it. Be sure: a different idea on a similar subject is not a match.
- Otherwise match_id is an empty string, and you give the new idea a title: a few words, Title Case, naming the idea itself, no em dashes.
- shelf: the concept it belongs to. Use an existing shelf when one fits: ${shelves.length ? shelves.map(s => `"${s}"`).join(', ') : '(none yet)'}. Name a new shelf only when nothing fits: one or two words, Title Case, a kind of thing (Books, Video Games, Political TikToks, Ventures, Essays, Music, Family).
- project: one of David's missions only if the idea plainly belongs to it, copied exactly from this list, else an empty string: ${projects.length ? projects.map(p => `"${p}"`).join(', ') : '(none)'}.
For a match, repeat that idea's title, shelf and project as they are.

## Ideas already on the board
${doc.ideas.length ? doc.ideas.slice(-120).map(i => `- id ${i.id} · "${i.title}" · shelf ${i.shelf}${i.project ? ` · ${i.project}` : ''} · last words: "${flat((i.layers || []).slice(-1)[0]?.words, 120)}"`).join('\n') : '(none yet)'}

## The words
${said}

Answer by calling the shelve tool exactly once.`
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model: model || process.env.LUMEN_MODEL || 'claude-opus-5-5', max_tokens: 600, tools: [TOOL], tool_choice: { type: 'auto' }, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const msg = await res.json()
  const call = (msg.content || []).find(c => c.type === 'tool_use')
  if (!call || !call.input) throw new Error('Lumen answered in prose instead; try again')
  const at = new Date().toISOString()
  const layer = { id: Math.random().toString(36).slice(2, 10), at, src: SRC.has(src) ? src : 'told', words: said, where: flat(where, 120) || null }
  const fresh = await readIdeas()
  const hit = call.input.match_id ? fresh.ideas.find(i => i.id === String(call.input.match_id)) : null
  let idea
  if (hit) { hit.layers = [...(hit.layers || []), layer]; idea = hit }
  else {
    const project = projects.includes(call.input.project) ? call.input.project : null
    idea = { id: Math.random().toString(36).slice(2, 10), title: clean(call.input.title, 90) || said.slice(0, 60), shelf: clean(call.input.shelf, 40) || 'Unshelved', project, created_at: at, layers: [layer] }
    fresh.ideas.push(idea)
  }
  await writeIdeas(fresh)
  return { idea, layer, new_idea: !hit }
}
