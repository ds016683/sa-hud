// The Lumen panel's storage (David 11/4: "build the same thing from scratch,
// call it lumen, use the HUD's canon"). Per card, in the project-files bucket
// under the card's root (the mission's id, or objectives/<id>):
//   <root>/lumen/workbook.json   captures and notes (the Workbook tab)
//   <root>/build/<slug>.html     a page Lumen built (build_page), with <slug>.json beside it
// The thread is Lumen's own (lumen_messages, channel hud) with meta.item = the card.
import { supabase } from './supabase'

const BUCKET = 'project-files'
const signed = async (path, secs = 120) => {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, secs)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
const readJson = async (path) => {
  const url = await signed(path, 60)
  const res = await fetch(`${url}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  return res.json()
}
const writeJson = async (path, doc) => {
  const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([JSON.stringify(doc)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}

export const blankWorkbook = () => ({ v: 1, kind: 'lumen-workbook', captures: [], notes: '', updated_at: null })
export async function readWorkbook(root) {
  try { const d = await readJson(`${root}/lumen/workbook.json`); return { ...blankWorkbook(), ...d, captures: Array.isArray(d.captures) ? d.captures : [] } } catch { return blankWorkbook() }
}
export async function writeWorkbook(root, wb) {
  const out = { ...wb, updated_at: new Date().toISOString() }
  await writeJson(`${root}/lumen/workbook.json`, out)
  return out
}

export async function listBuilds(root) {
  const { data, error } = await supabase.storage.from(BUCKET).list(`${root}/build`, { limit: 100 })
  if (error) throw new Error(error.message)
  const slugs = (data || []).filter(f => f.name.endsWith('.json')).map(f => f.name.replace(/\.json$/, ''))
  const metas = await Promise.all(slugs.map(async slug => { try { return { slug, ...(await readJson(`${root}/build/${slug}.json`)) } } catch { return { slug, title: slug } } }))
  return metas.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
}
export const buildUrl = (root, slug) => signed(`${root}/build/${slug}.html`, 600)
export async function readBuildHtml(root, slug) {
  const url = await signed(`${root}/build/${slug}.html`, 60)
  const res = await fetch(`${url}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  return res.text()
}
export async function removeBuild(root, slug) {
  const { error } = await supabase.storage.from(BUCKET).remove([`${root}/build/${slug}.html`, `${root}/build/${slug}.json`])
  if (error) throw new Error(error.message)
}

export async function loadThread(itemId, limit = 80) {
  const { data, error } = await supabase.from('lumen_messages').select('id,at,direction,kind,body,meta').eq('channel', 'hud').neq('kind', 'system').contains('meta', { item: itemId }).order('id', { ascending: true }).limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}

export async function askLumen({ text, where, item }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const r = await fetch('/api/lumen-hud', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, where, item: { kind: item.kind, id: item.id } }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `lumen ${r.status}`)
  if (j.error) throw new Error(j.error)
  return j.reply || ''
}

// The card refreshes itself when Lumen has acted (ItemDetail and the mission page listen).
export const LEDGER_EVENT = 'hud:ledger-changed'
export const fireLedgerChanged = (detail = {}) => { try { window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail })) } catch { /* no window */ } }
