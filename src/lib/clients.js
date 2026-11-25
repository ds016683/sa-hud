// Clients as containers (David 11/25): "a client page needs to be a bit different than a gate. The landing page
// should have the clients where I'm personally tracking things for. Each client should have files and workbench and
// some place to link Harvest and Mission work. Mission work is still mission work, but a mission can tie to a client
// or client initiative. The client page should show what, if any mission work is in play, in addition to being a
// container for everything else."
//
// The Ledger side is sql/2026-11-25-clients.sql (a clients table, projects.client_id, live_files.client_id), which
// David runs himself. Until it has run, the same rows live in the client registry in storage
// (project-files/clients/registry.json: clients and ties, project id -> client id), and this file reads whichever
// exists: a project's client_id when the column is there, the registry's tie when it is not, the key family last
// (Client.MMA.* belongs to Client.MMA). Everything the client owns sits under clients/<client id>/ in storage:
//   clients/<id>/workspace/            its Workbench tabs (the same documents as any card; workspace.py can write here)
//   clients/<id>/build/                pages built on the client
//   clients/<id>/files/<name>          its own Live Files (the path is the tie; live_files.client_id once the column lands)
//   clients/<id>/files-index.json      folders and locks, plus the ids of links and waiting paths tied to the client
//   clients/<id>/legacy/index.json     the Legacy Resources shelf: tabs and files carried over from finished gates
//   clients/<id>/legacy/tabs/<slug>.json   a carried-over blank tab (read-only copy)
//   clients/<id>/legacy/build/<slug>.html  a carried-over built tab (read-only copy)
import { supabase, reportSoft } from './supabase'
import { listPages, readPage, writePage } from './workspace'
import { listBuilds, readBuildHtml } from './lumenPanel'
import { listLiveFiles as listAllLiveFiles, requestLiveFile, addLiveLink, versionNum, famKey } from './livefiles'

const BUCKET = 'project-files'
export const REGISTRY = 'clients/registry.json'
export const clientRoot = (id) => `clients/${id}`
export const clientFilesRoot = (id) => `clients/${id}/files`
const indexPath = (id) => `clients/${id}/files-index.json`
const legacyPath = (id) => `clients/${id}/legacy/index.json`
const q = async (p) => { const { data, error } = await p; if (error) throw new Error(error.message); return data || [] }
const safe = (n) => String(n || 'file').replace(/[^A-Za-z0-9._ -]/g, '_')

async function readJson(path, fallback = null) {
  try {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
    if (error || !data?.signedUrl) return fallback
    const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return fallback
    return await res.json()
  } catch { return fallback }
}
async function writeJson(path, doc) {
  const { error } = await supabase.storage.from(BUCKET).upload(path, new Blob([JSON.stringify(doc, null, 1)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
  if (error) throw new Error(error.message)
}

// ---------------------------------------------------------------------------------------------------------------
// The clients and their ties
// ---------------------------------------------------------------------------------------------------------------
const blankRegistry = () => ({ v: 1, clients: [], ties: {} })
export async function loadClients() {
  const reg = (await readJson(REGISTRY, null)) || blankRegistry()
  reg.clients = Array.isArray(reg.clients) ? reg.clients : []
  reg.ties = reg.ties && typeof reg.ties === 'object' ? reg.ties : {}
  // The table, once David has run the SQL: its rows win over the registry's copy of the same client.
  try {
    const { data, error } = await supabase.from('clients').select('*')
    if (!error && Array.isArray(data)) {
      reg.table = true
      for (const row of data) { const i = reg.clients.findIndex(c => c.id === row.id); if (i >= 0) reg.clients[i] = { ...reg.clients[i], ...row }; else reg.clients.push(row) }
    }
  } catch { /* the table is not there yet */ }
  reg.clients.sort((a, b) => String(a.name).localeCompare(String(b.name)))
  return reg
}
export async function saveRegistry(reg) {
  const out = { v: 1, updated_at: new Date().toISOString(), clients: reg.clients.map(({ id, key, name, short, description, tracked, harvest_clients, created_at }) => ({ id, key, name, short, description, tracked: !!tracked, harvest_clients: harvest_clients || [], created_at })), ties: reg.ties || {} }
  await writeJson(REGISTRY, out)
  return { ...reg, ...out }
}
export async function setTracked(reg, id, on) {
  const next = { ...reg, clients: reg.clients.map(c => c.id === id ? { ...c, tracked: !!on } : c) }
  await saveRegistry(next)
  if (reg.table) { try { await supabase.from('clients').update({ tracked: !!on, updated_at: new Date().toISOString() }).eq('id', id) } catch (e) { reportSoft('clients tracked', e) } }
  return next
}
export const clientByKey = (reg, key) => (reg?.clients || []).find(c => c.key === key) || null
export const clientById = (reg, id) => (reg?.clients || []).find(c => c.id === id) || null
// Which client a mission belongs to: the column, the registry's tie, the key family.
export function clientIdOf(project, reg) {
  if (!project) return null
  if (project.client_id) return project.client_id
  if (reg?.ties?.[project.id]) return reg.ties[project.id]
  const k = String(project.key || '')
  const c = k ? (reg?.clients || []).find(c => k === c.key || k.startsWith(`${c.key}.`)) : null
  return c ? c.id : null
}
export const missionsOf = (client, projects, reg) => (projects || []).filter(p => p.status !== 'deleted' && clientIdOf(p, reg) === client.id)

// A gate is open until it is done; a gate with a card (objective_id) opens that card.
export const isOpenGate = (t) => t.status !== 'done' && !t.done
const NUM_RE = /^\s*(?:gate\s+)?(\d+)\s*[·.:)-]\s*/i
export const gateNumber = (t) => { const m = NUM_RE.exec(String(t.text || '')); return m ? Number(m[1]) : null }
export const gateText = (t) => String(t.text || '').replace(NUM_RE, '')
// The mission's gates in number order (the numbered ones first, the rest after, as ProjectsPage reads a plan).
export function gatesOf(project) {
  const all = [...(project.tasks || [])].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')))
  const numbered = all.filter(t => gateNumber(t) !== null).sort((a, b) => gateNumber(a) - gateNumber(b))
  const rest = all.filter(t => gateNumber(t) === null)
  let n = numbered.length ? Math.max(...numbered.map(gateNumber)) : 0
  return [...numbered.map(t => ({ t, n: gateNumber(t) })), ...rest.filter(isOpenGate).map(t => ({ t, n: ++n }))]
}

// ---------------------------------------------------------------------------------------------------------------
// Harvest: the client's hours, read from the Ledger's time_entries (the Harvest sync writes them; _sync-core.mjs)
// ---------------------------------------------------------------------------------------------------------------
const chiDay = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
export async function harvestFor(client) {
  const names = client?.harvest_clients || []
  if (!names.length) return { rows: [], byProject: [], byPerson: [], mtd: 0, ytd: 0, last: null, none: true }
  const today = chiDay(), year = today.slice(0, 4), month = today.slice(0, 7)
  let rows = []
  try { rows = await q(supabase.from('time_entries').select('person,project,task,hours,spent_date,billable').in('client', names).gte('spent_date', `${year}-01-01`).order('spent_date', { ascending: false }).limit(5000)) }
  catch (e) { reportSoft('harvest for client', e); return { rows: [], byProject: [], byPerson: [], mtd: 0, ytd: 0, last: null, error: e.message } }
  const sum = (list) => list.reduce((s, r) => s + (Number(r.hours) || 0), 0)
  const inMonth = rows.filter(r => String(r.spent_date || '').startsWith(month))
  const group = (key) => { const m = new Map(); for (const r of rows) { const k = r[key] || '(none)'; const g = m.get(k) || { name: k, mtd: 0, ytd: 0, last: null }; g.ytd += Number(r.hours) || 0; if (String(r.spent_date).startsWith(month)) g.mtd += Number(r.hours) || 0; if (!g.last || r.spent_date > g.last) g.last = r.spent_date; m.set(k, g) } return [...m.values()].sort((a, b) => b.mtd - a.mtd || b.ytd - a.ytd) }
  return { rows, byProject: group('project'), byPerson: group('person'), mtd: sum(inMonth), ytd: sum(rows), last: rows[0]?.spent_date || null, month, year }
}

// ---------------------------------------------------------------------------------------------------------------
// Files: the client's own Live Files. A file's path under clients/<id>/files is the tie (and client_id once it
// lands); a link or a waiting path has no path of its own here, so its row id is kept in the client's file index.
// The api object fits CardFiles (its objectiveId prop carries the client id).
// ---------------------------------------------------------------------------------------------------------------
export async function readClientFileIndex(id) {
  const j = await readJson(indexPath(id), null)
  return { v: 1, folders: Array.isArray(j?.folders) ? j.folders : [], of: j?.of && typeof j.of === 'object' ? j.of : {}, locked: j?.locked && typeof j.locked === 'object' ? j.locked : {}, rows: Array.isArray(j?.rows) ? j.rows : [] }
}
export async function writeClientFileIndex(id, index) {
  const prior = await readClientFileIndex(id)
  await writeJson(indexPath(id), { v: 1, folders: index.folders || [], of: index.of || {}, locked: index.locked || {}, rows: index.rows || prior.rows })
}
async function remember(id, rowId) { const idx = await readClientFileIndex(id); if (!idx.rows.includes(rowId)) { idx.rows.push(rowId); await writeJson(indexPath(id), idx) } }
export async function listClientFiles(id, { includeFiled = true } = {}) {
  const idx = await readClientFileIndex(id)
  let sel = supabase.from('live_files').select('*').is('superseded_by', null).order('created_at', { ascending: false }).limit(400)
  sel = idx.rows.length ? sel.or(`path.like.${clientFilesRoot(id)}/%,id.in.(${idx.rows.join(',')})`) : sel.like('path', `${clientFilesRoot(id)}/%`)
  if (!includeFiled) sel = sel.is('filed_at', null)
  let rows = []
  try { rows = await q(sel) } catch (e) { reportSoft('client files', e); return { rows: [] } }
  return { rows: rows.map(r => ({ ...r, item: null })) }
}
export async function putClientFile(file, id, { note = null, source = 'david' } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  if (file.size <= 4 * 1024 * 1024) {
    try {
      const b64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(',')[1] || ''); rd.onerror = () => rej(new Error('could not read the file')); rd.readAsDataURL(file) })
      const r = await fetch('/api/live-files', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'put', name: file.name, mime: file.type || null, content_base64: b64, client_id: id, note, source }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error) throw new Error(j.error || `upload ${r.status}`)
      return j.row
    } catch (e) { console.warn('client file door, falling back to direct upload:', e.message) }
  }
  const name = safe(file.name), root = clientFilesRoot(id), path = `${root}/${name}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  const inRoot = await q(supabase.from('live_files').select('id,name,version').like('path', `${root}/%`).is('superseded_by', null).is('filed_at', null))
  const prior = inRoot.filter(r => famKey(r.name) === famKey(name)).sort((a, b) => (b.version || 1) - (a.version || 1))
  const row = { user_id: session.user.id, name, bucket: BUCKET, path, size: file.size || null, mime: file.type || null, objective_id: null, project_id: null, note, source, version: prior.length ? (prior[0].version || 1) + 1 : versionNum(name, 1) }
  const ins = await q(supabase.from('live_files').insert(row).select())
  for (const pr of prior) await supabase.from('live_files').update({ superseded_by: ins[0].id }).eq('id', pr.id)
  return ins[0]
}
export const newestClientFile = async (id) => (await listClientFiles(id, { includeFiled: false })).rows[0] || null
// What CardFiles calls, with the client in place of a card. Everything else (open, download, mail, synopsis, pin,
// remove) is the same row work as any card's, so those come straight from livefiles.
export function clientFilesApi(base) {
  return {
    ...base,
    listLiveFiles: (filter) => listClientFiles(filter.objectiveId),
    readFileIndex: (id) => readClientFileIndex(id),
    writeFileIndex: (id, idx) => writeClientFileIndex(id, idx),
    putLiveFile: (f, owner) => putClientFile(f, owner.objectiveId),
    requestLiveFile: async (path, owner) => { const r = await requestLiveFile(path, { note: owner.note || null }); await remember(owner.objectiveId, r.id); return r },
    addLiveLink: async (url, owner) => { const r = await addLiveLink(url, { title: owner.title || null, note: owner.note || null }); await remember(owner.objectiveId, r.id); return r },
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Legacy Resources: finished work carried over from a gate or mission, read-only, off the tab strip.
// An item: { id, kind: 'tab' | 'build' | 'file', title, source: { root, slug?, file_id?, label, mission_id?, gate? }, moved_at }
// A moved tab keeps its file where it was with a legacy mark (the source strip hides it), and a read-only copy
// lands under the client. A moved file keeps its row; filed_to says it went to the shelf.
// ---------------------------------------------------------------------------------------------------------------
export async function readLegacy(id) { const j = await readJson(legacyPath(id), null); return { v: 1, items: Array.isArray(j?.items) ? j.items : [] } }
async function writeLegacy(id, doc) { await writeJson(legacyPath(id), { v: 1, updated_at: new Date().toISOString(), items: doc.items || [] }) }
const legacyId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const legacyTabPath = (id, slug) => `clients/${id}/legacy/tabs/${slug}.json`
export const legacyBuildPath = (id, slug) => `clients/${id}/legacy/build/${slug}.html`
export async function readLegacyTab(id, slug) { const d = await readJson(legacyTabPath(id, slug), null); if (!d) throw new Error('that tab could not be read'); return { ...d, strokes: Array.isArray(d.strokes) ? d.strokes : [], text: String(d.text || '') } }
export async function readLegacyBuild(id, slug) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(legacyBuildPath(id, slug), 60)
  if (error) throw new Error(error.message)
  const res = await fetch(`${data.signedUrl}&cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`read ${res.status}`)
  return res.text()
}

export async function moveTabToLegacy(clientId, { root, slug, label, mission_id = null, gate = null }) {
  const doc = await readPage(root, slug)
  const moved_at = new Date().toISOString()
  const item = { id: legacyId(), kind: 'tab', title: doc.title || slug, source: { root, slug, label, mission_id, gate }, moved_at, words: String(doc.text || '').trim() ? String(doc.text).trim().split(/\s+/).length : 0, strokes: (doc.strokes || []).length }
  await writeJson(legacyTabPath(clientId, slug), { ...doc, legacy: { client_id: clientId, from: { root, slug, label }, moved_at } })
  await writePage(root, slug, { ...doc, legacy: { client_id: clientId, moved_at, label } })
  const shelf = await readLegacy(clientId); shelf.items.push(item); await writeLegacy(clientId, shelf)
  return item
}
export async function moveBuildToLegacy(clientId, { root, slug, title, label, mission_id = null, gate = null }) {
  const html = await readBuildHtml(root, slug)
  const moved_at = new Date().toISOString()
  const meta = (await readJson(`${root}/build/${slug}.json`, null)) || { slug, title }
  const { error } = await supabase.storage.from(BUCKET).upload(legacyBuildPath(clientId, slug), new Blob([html], { type: 'text/html' }), { upsert: true, contentType: 'text/html' })
  if (error) throw new Error(error.message)
  await writeJson(`${root}/build/${slug}.json`, { ...meta, legacy: { client_id: clientId, moved_at, label } })
  const item = { id: legacyId(), kind: 'build', title: title || meta.title || slug, note: meta.note || null, source: { root, slug, label, mission_id, gate }, moved_at }
  const shelf = await readLegacy(clientId); shelf.items.push(item); await writeLegacy(clientId, shelf)
  return item
}
export async function moveFileToLegacy(clientId, row, { label, mission_id = null, gate = null }) {
  const moved_at = new Date().toISOString()
  await q(supabase.from('live_files').update({ filed_at: moved_at, filed_to: `legacy:client:${clientId}` }).eq('id', row.id).select())
  const item = { id: legacyId(), kind: 'file', title: row.name, source: { root: null, file_id: row.id, label, mission_id, gate, bucket: row.bucket, path: row.path }, moved_at, size: row.size || null, mime: row.mime || null }
  const shelf = await readLegacy(clientId); shelf.items.push(item); await writeLegacy(clientId, shelf)
  return item
}
// Undo: the tab or built page shows on its gate again, the file is back in play; the copy on the shelf goes.
export async function returnFromLegacy(clientId, item) {
  const s = item.source || {}
  if (item.kind === 'tab' && s.root && s.slug) {
    try { const doc = await readPage(s.root, s.slug); const { legacy, ...rest } = doc; void legacy; await writePage(s.root, s.slug, rest) } catch (e) { reportSoft('legacy return tab', e) }
    await supabase.storage.from(BUCKET).remove([legacyTabPath(clientId, s.slug)])
  }
  if (item.kind === 'build' && s.root && s.slug) {
    const meta = await readJson(`${s.root}/build/${s.slug}.json`, null)
    if (meta) { const { legacy, ...rest } = meta; void legacy; await writeJson(`${s.root}/build/${s.slug}.json`, rest) }
    await supabase.storage.from(BUCKET).remove([legacyBuildPath(clientId, s.slug)])
  }
  if (item.kind === 'file' && s.file_id) await q(supabase.from('live_files').update({ filed_at: null, filed_to: null }).eq('id', s.file_id).select())
  const shelf = await readLegacy(clientId); shelf.items = shelf.items.filter(x => x.id !== item.id); await writeLegacy(clientId, shelf)
}
// Where legacy can come from: the client's missions, each with its own root and its gates' cards.
export async function legacySources(missions) {
  const out = []
  for (const m of missions) {
    const roots = [{ root: m.id, label: m.name, mission_id: m.id, gate: null, objectiveId: null }]
    for (const { t, n } of gatesOf(m)) if (t.objective_id) roots.push({ root: `objectives/${t.objective_id}`, label: `Gate ${n} · ${gateText(t)}`, short: `Gate ${n}`, mission_id: m.id, gate: n, objectiveId: t.objective_id, done: !isOpenGate(t) })
    for (const r of roots) {
      const [pages, builds, files] = await Promise.all([
        listPages(r.root).catch(() => []),
        listBuilds(r.root).catch(() => []),
        r.objectiveId ? listAllLiveFiles({ objectiveId: r.objectiveId }, { includeFiled: false }).then(x => x.rows).catch(() => []) : listAllLiveFiles({ projectId: m.id }, { includeFiled: false }).then(x => x.rows.filter(f => !f.objective_id)).catch(() => []),
      ])
      const tabs = [...builds.filter(b => !b.legacy).map(b => ({ kind: 'build', slug: b.slug, title: b.title || b.slug, at: b.updated_at })), ...pages.filter(p => !p.legacy).map(p => ({ kind: 'tab', slug: p.slug, title: p.title, at: p.updated_at }))]
      if (tabs.length || files.length) out.push({ ...r, mission: m.name, tabs, files })
    }
  }
  return out
}
