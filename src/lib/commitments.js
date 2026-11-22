// Commitments (David 11/19): what he said he would do. His boundary, verbatim: "without strong boundaries, lumen will
// take every email in my inbox or slack message a new to-do. it should only be for things lumen is hearing me say i will
// do on a call. or in a sent message. when i say i will send XX by XX it needs to get captured here. I need to be able
// to push asynchronous messages as well." One file in project-files: commitments/index.json
//   { v, items: [{ id, what, by, heard, quote, source: 'david' | 'call' | 'sent', at, state: 'open' | 'done' | 'dropped', ruled_at }] }
import { supabase } from './supabase'

const BUCKET = 'project-files', PATH = 'commitments/index.json'
async function read() {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(PATH, 60)
    if (error || !data?.signedUrl) return { v: 1, items: [] }
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    const d = res.ok ? await res.json() : null
    return { v: 1, items: Array.isArray(d?.items) ? d.items : [] }
  } catch { return { v: 1, items: [] } }
}
async function write(doc) {
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, new Blob([JSON.stringify(doc)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}
export async function loadCommitments() { return (await read()).items }
// One he adds himself. by is a day (YYYY-MM-DD) or empty.
export async function addCommitment({ what, by = null }) {
  const text = String(what || '').trim().slice(0, 300)
  if (!text) throw new Error('nothing to add')
  const doc = await read()
  const at = new Date().toISOString()
  doc.items.push({ id: Math.random().toString(36).slice(2, 10), what: text, by: by || null, heard: null, quote: null, source: 'david', at, state: 'open', ruled_at: null })
  await write(doc)
  return doc.items
}
// Route an Item to the list (David 11/22): checked on a debrief, or sent by a session or Lumen. Nothing is decided here.
export async function routeItem({ what, heard = null, where = null, by = null, source = 'route' }) {
  const text = String(what || '').trim().slice(0, 300)
  if (!text) throw new Error('nothing to route')
  const doc = await read()
  doc.items.push({ id: Math.random().toString(36).slice(2, 10), what: text, by: by || null, heard: heard ? String(heard).slice(0, 300) : null, quote: null, where: where ? String(where).slice(0, 160) : null, source, at: new Date().toISOString(), state: 'open', ruled_at: null })
  await write(doc)
  return doc.items
}
// state: 'done' | 'dropped' | 'made' | 'routed' | 'idea'. extra: what it became ({ made: 'adhoc' }, { to: { mission, as } }). why: his reason on an X, read back to Lumen before the next catch (11/21).
export async function ruleCommitment(id, state, why = null, extra = null) {
  const doc = await read()
  doc.items = doc.items.map(c => c.id === id ? { ...c, state, ruled_at: new Date().toISOString(), ...(why ? { why_dropped: String(why).slice(0, 300) } : {}), ...(extra || {}) } : c)
  await write(doc)
  return doc.items
}
