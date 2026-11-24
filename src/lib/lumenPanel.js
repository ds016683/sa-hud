// The Lumen panel's storage (David 11/4: "build the same thing from scratch,
// call it lumen, use the HUD's canon"). Per card, in the project-files bucket
// under the card's root (the mission's id, or objectives/<id>):
//   <root>/lumen/workbook.json   captures and notes (the Workbook tab)
//   <root>/build/<slug>.html     a page Lumen built (build_page), with <slug>.json beside it
//   <root>/build/<slug>.state.json  what David entered in that page, kept through its frame (useBuildState)
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

const STATE_EXT = '.state.json', STATE_MAX = 1048576
const statePath = (root, slug) => `${root}/build/${slug}${STATE_EXT}`
const notThere = (error) => Number(error.status) === 404 || String(error.statusCode) === '404' || /not.?found/i.test(String(error.message || ''))

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
  const slugs = (data || []).filter(f => f.name.endsWith('.json') && !f.name.endsWith(STATE_EXT)).map(f => f.name.replace(/\.json$/, ''))
  const metas = await Promise.all(slugs.map(async slug => { try { return { slug, ...(await readJson(`${root}/build/${slug}.json`)) } } catch { return { slug, title: slug } } }))
  return metas.sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
}
export const buildUrl = (root, slug) => signed(`${root}/build/${slug}.html`, 600)
// Storage serves a stored .html as plain text (David 11/22: "the open button is doing something weird", the tab opened as
// source). Open a built page from its HTML instead, as a text/html blob in a new tab, so it renders the way the tab shows it.
export function openHtml(html) {
  const url = URL.createObjectURL(new Blob([html || ''], { type: 'text/html' }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
export async function readBuildHtml(root, slug) {
  const url = await signed(`${root}/build/${slug}.html`, 60)
  const res = await fetch(`${url}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  return res.text()
}
export async function removeBuild(root, slug) {
  const { error } = await supabase.storage.from(BUCKET).remove([`${root}/build/${slug}.html`, `${root}/build/${slug}.json`, statePath(root, slug)])
  if (error) throw new Error(error.message)
}

// What David entered in a built tab (11/21: his marks on the Revenue Markup tab were gone when he left it). A built
// page is framed with no storage of its own, so it asks its frame to keep its state (useBuildState), and the state
// lives beside the page. It is a .json in the build folder that is not a tab: every reader of that folder skips it.
// readBuildState answers null when nothing is stored and throws when the read fails, so a failed read is never taken
// for an empty one (the page would then save over what is there). Storage answers a caller who is not signed in
// with the same "not found" it gives for a file that is not there, so the session is checked first.
export async function readBuildState(root, slug) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(statePath(root, slug), 60)
  if (error) { if (notThere(error)) return null; throw new Error(error.message) }
  const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  return res.json()
}
export async function writeBuildState(root, slug, state) {
  const body = new Blob([JSON.stringify(state ?? null)], { type: 'application/json' })
  if (body.size > STATE_MAX) throw Object.assign(new Error(`the state is ${Math.ceil(body.size / 1024).toLocaleString('en-US')} KB, over the 1 MB a tab may keep`), { final: true })
  const { error } = await supabase.storage.from(BUCKET).upload(statePath(root, slug), body, { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}

export async function loadThread(itemId, limit = 80) {
  const { data, error } = await supabase.from('lumen_messages').select('id,at,direction,kind,body,meta').eq('channel', 'hud').neq('kind', 'system').contains('meta', { item: itemId }).order('id', { ascending: true }).limit(limit)
  if (error) throw new Error(error.message)
  return data || []
}

// event (11/11): a card event instead of typed words, { kind: 'stop_closed', text, open }; Lumen notices it and asks.
export async function askLumen({ text, where, item, event = null }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const r = await fetch('/api/lumen-hud', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, where, ...(item ? { item: { kind: item.kind, id: item.id } } : {}), ...(event ? { event } : {}) }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(j.error || `lumen ${r.status}`)
  if (j.error) throw new Error(j.error)
  return j.reply || ''
}

// Hand To Claude Code (11/10): David hands one of Lumen's replies (a hand he lacks, a tool that
// failed) to a Claude Code session. Kept server side; the session's answer comes back into
// this thread as a message whose meta.from is 'claude-code'.
async function hudDoor(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const r = await fetch('/api/lumen-hud', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error || `lumen ${r.status}`)
  return j
}
// The extraction debrief (api/_extract.mjs): the final pass, the facts, Lumen's narrative and verdicts. It writes
// nothing; the HUD makes only what David checks.
export const askExtraction = ({ projectId, words }) => hudDoor({ action: 'extract-debrief', item: { kind: 'project', id: projectId }, words }).then(j => j.debrief)
// The gate debrief (api/_gate-debrief.mjs): what goes up to the mission, whether the gate changed it, and a verdict. It writes nothing.
// Process And Post (api/_catch.mjs): Lumen posts a summary on the card's line and catches what needs a follow-up.
export const processAndPost = ({ text, where, root, item, title }) => hudDoor({ action: 'process-post', text, where, root, item, title })
export const parkIdeaDoor = (payload) => hudDoor({ action: 'idea-park', ...payload })
export const askTidy = ({ files, card }) => hudDoor({ action: 'tidy-files', files, card }).then(j => j.tidy)
export const askGateDebrief = ({ objectiveId, taskId, stepId, words }) => hudDoor({ action: 'gate-debrief', item: stepId != null ? { kind: 'step', id: String(stepId) } : taskId ? { kind: 'task', id: taskId } : { kind: 'objective', id: objectiveId }, words }).then(j => j.debrief)
export const handToClaudeCode = ({ item, message_id, ask, gap }) => hudDoor({ action: 'handoff', item: { kind: item.kind, id: item.id }, title: item.title, message_id, ask, gap })
export const listHandoffs = async (item) => (await hudDoor({ action: 'handoffs', item: { kind: item.kind, id: item.id } })).handoffs || []

// The card refreshes itself when Lumen has acted (ItemDetail and the mission page listen).
export const LEDGER_EVENT = 'hud:ledger-changed'
export const fireLedgerChanged = (detail = {}) => { try { window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail })) } catch { /* no window */ } }
