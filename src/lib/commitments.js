// Commitments (David 11/19): what he said he would do. His boundary, verbatim: "without strong boundaries, lumen will
// take every email in my inbox or slack message a new to-do. it should only be for things lumen is hearing me say i will
// do on a call. or in a sent message. when i say i will send XX by XX it needs to get captured here. I need to be able
// to push asynchronous messages as well." One file in project-files: commitments/index.json
//   { v, items: [{ id, what, by, heard, quote, source: 'david' | 'call' | 'sent', at, state: 'open' | 'done' | 'dropped', ruled_at }] }
import { supabase } from './supabase'

const BUCKET = 'project-files', PATH = 'commitments/index.json'
// Two reads (11/24). A writer changes the list and puts the whole file back, so it may only start from a list it
// truly read: readForWrite hands back an empty list only when storage says the file is not there yet, and throws on
// anything else (no signed URL, a failed fetch, a bad status, a body that is not the list), so nothing is written over
// a list that could not be read. Display keeps the tolerant read: a failure shows an empty list and writes nothing.
const missing = (e) => String(e?.statusCode) === '404' || e?.status === 404 || /not.?found|no such key/i.test(`${e?.error || ''} ${e?.message || ''}`)
const unread = (why) => new Error(`The list could not be read (${why}), so nothing was changed. Try again.`)
async function readForWrite() {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(PATH, 60)
  if (error) { if (missing(error)) return { v: 1, items: [] }; throw unread(error.message || 'no signed URL') }
  if (!data?.signedUrl) throw unread('no signed URL')
  let res
  try { res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' }) } catch (e) { throw unread(e?.message || 'fetch failed') }
  if (!res.ok) throw unread(`status ${res.status}`)
  let d
  try { d = await res.json() } catch { throw unread('not JSON') }
  if (!d || !Array.isArray(d.items)) throw unread('not a list')
  return { v: 1, items: d.items }
}
async function read() {
  try { return await readForWrite() } catch { return { v: 1, items: [] } }
}
async function write(doc) {
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, new Blob([JSON.stringify(doc)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}
export async function loadCommitments() { return (await read()).items }
// A decision ruled (David 11/22): yes makes it, X with a reason closes it, not now parks it. The ruling stays on the Item
// so no session asks twice (sessions read it with ~/.claude/hud-board/item.py ruling <id>). On yes for one Lumen routed,
// Lumen is handed it to carry out what he said would happen.
export async function ruleDecision(c, ruling, why = null) {
  const state = ruling === 'yes' ? 'ruled' : ruling === 'not_now' ? 'parked' : 'dropped'
  await ruleCommitment(c.id, state, why, { ruling })
  if (ruling === 'yes' && ['lumen', 'whatsapp', 'email'].includes(c.source)) {
    const { askLumen } = await import('./lumenPanel')
    return askLumen({ text: `I said yes to your decision: "${c.what}". ${c.recommend ? `You recommended: ${c.recommend}. ` : ''}${c.on_yes ? `You said on yes: ${c.on_yes}. ` : ''}Do it now, then tell me in one line what you did.`, where: 'Items' })
  }
  return null
}
// One he adds himself. by is a day (YYYY-MM-DD) or empty.
export async function addCommitment({ what, by = null }) {
  const text = String(what || '').trim().slice(0, 300)
  if (!text) throw new Error('nothing to add')
  const doc = await readForWrite()
  const at = new Date().toISOString()
  doc.items.push({ id: Math.random().toString(36).slice(2, 10), what: text, by: by || null, heard: null, quote: null, source: 'david', at, state: 'open', ruled_at: null })
  await write(doc)
  return doc.items
}
// Route an Item to the list (David 11/22): checked on a debrief, or sent by a session or Lumen. Nothing is decided here.
export async function routeItem({ what, heard = null, where = null, by = null, source = 'route' }) {
  const text = String(what || '').trim().slice(0, 300)
  if (!text) throw new Error('nothing to route')
  const doc = await readForWrite()
  doc.items.push({ id: Math.random().toString(36).slice(2, 10), what: text, by: by || null, heard: heard ? String(heard).slice(0, 300) : null, quote: null, where: where ? String(where).slice(0, 160) : null, source, at: new Date().toISOString(), state: 'open', ruled_at: null })
  await write(doc)
  return doc.items
}
// state: 'done' | 'dropped' | 'made' | 'routed' | 'idea'. extra: what it became ({ made: 'adhoc' }, { to: { mission, as } }). why: his reason on an X, read back to Lumen before the next catch (11/21).
export async function ruleCommitment(id, state, why = null, extra = null) {
  const doc = await readForWrite()
  doc.items = doc.items.map(c => c.id === id ? { ...c, state, ruled_at: new Date().toISOString(), ...(why ? { why_dropped: String(why).slice(0, 300) } : {}), ...(extra || {}) } : c)
  await write(doc)
  return doc.items
}
