// Catches (David 11/21): "as i'm extracting, or adding notes, or doing anything, lumen is catching stuff ... anything
// and everywhere lumen thinks i need to follow up. then i x stuff that's out of context so he starts learning. same
// exact construct as proposed steps." The Commitments list (11/19) grows into this one; he confirmed widening its
// boundary ("this functionality was always the end game").
//
// Process And Post: Lumen reads what David wrote somewhere (a gate's notes first), posts a one-line summary to that
// card's line, and puts what needs a follow-up on the Catches list. A catch is a line on a list and nothing more:
// what it becomes is settled with David, one at a time. His X's, with their reasons, are read back before each run.
const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const flat = (t, max) => String(t || '').replace(/\s+/g, ' ').trim().slice(0, max)
const clean = (t, max = 300) => flat(t, max).replace(/\s*[—–]\s*/g, ', ')
const enc = (p) => p.split('/').map(encodeURIComponent).join('/')
export const CATCHES = 'commitments/index.json'

async function getJson(path) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${enc(path)}?cb=${Date.now()}`, { headers: { ...svc(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  if (!r.ok) return null
  try { return await r.json() } catch { return null }
}
async function putJson(path, doc) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${enc(path)}`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!r.ok) throw new Error(`save ${r.status}: ${(await r.text()).slice(0, 160)}`)
}
// Route an Item to the list (David 11/22): "if it's a push communication to lumen, everything needs to go in the bucket."
// kind 'decision' carries the recommendation first and what happens on yes; David rules it on the list or in a live chat.
export async function routeItem({ what, heard = null, where = null, by = null, source = 'route', kind = null, recommend = null, on_yes = null, quote = null }) {
  const text = String(what || '').replace(/\s+/g, ' ').trim().slice(0, 300)
  if (!text) throw new Error('nothing to route')
  const doc = (await getJson(CATCHES)) || { v: 1, items: [] }
  const items = Array.isArray(doc.items) ? doc.items : []
  const dup = items.find(c => c.state === 'open' && String(c.what).toLowerCase() === text.toLowerCase())
  if (dup) return { item: dup, dup: true }
  const item = { id: Math.random().toString(36).slice(2, 10), what: text, by: by ? String(by).slice(0, 10) : null, heard: heard ? String(heard).slice(0, 300) : null, quote: quote ? String(quote).slice(0, 1200) : null, where: where ? String(where).slice(0, 160) : null, source, ...(kind === 'decision' ? { kind: 'decision', recommend: recommend ? String(recommend).slice(0, 400) : null, on_yes: on_yes ? String(on_yes).slice(0, 300) : null } : {}), at: new Date().toISOString(), state: 'open', ruled_at: null }
  await putJson(CATCHES, { v: 1, items: [...items, item] })
  return { item, dup: false }
}
const chiDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })

const str = { type: 'string' }
const TOOL = { name: 'process_and_post', description: 'Hand David the summary and the catches.', strict: true, input_schema: { type: 'object', additionalProperties: false, required: ['summary', 'catches'], properties: {
  summary: str,
  catches: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'why', 'due'], properties: { text: str, why: str, due: str } } },
} } }

// text: what David wrote. where: a few words for where it was written ("Gate 19 · Re-direct Lumen's brain").
// root: the card's storage root, to post the summary on its line (optional). item: { kind, id, title } (optional).
export async function processAndPost({ text, where = '', root = null, item = null, model }) {
  if (!model) throw new Error('no model named')
  const said = flat(text, 6000)
  if (!said) throw new Error('nothing written to process')
  const doc = (await getJson(CATCHES)) || { v: 1, items: [] }
  const items = Array.isArray(doc.items) ? doc.items : []
  const dropped = items.filter(c => c.state === 'dropped').slice(-25), kept = items.filter(c => c.state === 'done' || c.state === 'made').slice(-25), open = items.filter(c => c.state === 'open').slice(-40)
  const now = new Date()
  const prompt = `You are Lumen. David wrote this in ${where || 'the HUD'} and pressed Process And Post. Do two things.

1. summary: one line, past tense, twelve words at most, that says what he wrote, for the record on that card. No em dashes.
2. catches: what in it needs a follow-up from David or from you. His rule: "anything and everywhere lumen thinks i need to follow up", and "if he doesn't KNOW a thing, he doesn't say a thing". So only what the words ask for or plainly imply: a request to you, a promise he made, a check he wants, a date he named. Each is one line, the verb first, twelve words at most, with where it came from in a few words, and a due date (YYYY-MM-DD) only when the words give one or a span ("in 24 hours" is ${chiDay(new Date(now.getTime() + 864e5))}); otherwise an empty string. Today is ${chiDay(now)} in Chicago. If nothing needs a follow-up, return an empty list.
${dropped.length || kept.length ? `\n## What David has ruled so far. Calibrate to it: catch more like the kept ones, and nothing like the ones he threw out, for the reason he gave.\n${dropped.length ? `Thrown out:\n${dropped.map(c => `- "${flat(c.what, 140)}"${c.why_dropped ? `. His reason: ${flat(c.why_dropped, 200)}` : ''}`).join('\n')}\n` : ''}${kept.length ? `Kept:\n${kept.map(c => `- "${flat(c.what, 140)}"`).join('\n')}\n` : ''}` : ''}
${open.length ? `\n## Already on the list (do not catch these again)\n${open.map(c => `- ${flat(c.what, 140)}`).join('\n')}\n` : ''}
## What he wrote
${said}

Hand it back by calling the process_and_post tool exactly once. Do not answer in prose.`
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, body: JSON.stringify({ model, max_tokens: 1500, tools: [TOOL], tool_choice: { type: 'auto' }, messages: [{ role: 'user', content: prompt }] }) })
  if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const msg = await res.json()
  const call = (msg.content || []).find(c => c.type === 'tool_use')
  if (!call || !call.input) throw new Error('Lumen answered in prose instead; try again')
  const summary = clean(call.input.summary, 160)
  const caught = (Array.isArray(call.input.catches) ? call.input.catches : []).slice(0, 8).map(c => ({ text: clean(c.text, 160), why: clean(c.why, 160), due: /^\d{4}-\d{2}-\d{2}$/.test(String(c.due || '')) ? c.due : null })).filter(c => c.text)
  const at = now.toISOString()
  // The summary goes on the card's line as a note, dated now.
  if (root && summary) {
    const path = (await getJson(`${root}/path.json`)) || { steps: [], sources: {} }
    const steps = Array.isArray(path.steps) ? path.steps : []
    await putJson(`${root}/path.json`, { ...path, steps: [...steps, { id: `n${Date.now().toString(36)}`, text: `Note: ${summary}`, by: 'lumen', made_at: at, done: true, at, note: true }] })
  }
  // The catches go on the list, and nowhere else.
  if (caught.length) {
    const fresh = (await getJson(CATCHES)) || { v: 1, items: [] }
    const list = Array.isArray(fresh.items) ? fresh.items : []
    for (const c of caught) list.push({ id: Math.random().toString(36).slice(2, 10), what: c.text, by: c.due, heard: c.why, quote: said.slice(0, 280), source: 'catch', where: flat(where, 120) || null, item: item && item.id ? { kind: item.kind, id: item.id, title: flat(item.title, 120) } : null, at, state: 'open', ruled_at: null })
    await putJson(CATCHES, { v: 1, items: list })
  }
  return { summary, catches: caught }
}
