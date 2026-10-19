// Live Files (David, 10/16): the files in play right now. The bytes sit in
// storage (bucket project-files) under the thing they belong to; the live_files
// table is the index: what is live, what it is tied to, which version is
// current, and later where it was filed. The final filing system comes later;
// this is the staging surface so nothing new lands on the Desktop.
import { supabase, reportSoft } from './supabase'

export const BUCKET = 'project-files'
const q = async (p) => { const { data, error } = await p; if (error) throw new Error(error.message); return data || [] }
const safe = (n) => String(n || 'file').replace(/[^A-Za-z0-9._ -]/g, '_')

export function rootFor({ objectiveId, projectId } = {}) {
  if (objectiveId) return `objectives/${objectiveId}/files`
  if (projectId) return `${projectId}`
  return 'live'
}

// Every live file (unfiled, current version), newest first, with the names of
// what it is tied to. filter: { objectiveId } | { projectId } | {}.
export async function listLiveFiles(filter = {}, { includeOld = false, includeFiled = false } = {}) {
  let sel = supabase.from('live_files').select('*').order('created_at', { ascending: false }).limit(400)
  if (!includeFiled) sel = sel.is('filed_at', null)
  if (!includeOld) sel = sel.is('superseded_by', null)
  if (filter.objectiveId) sel = sel.eq('objective_id', filter.objectiveId)
  if (filter.projectId) sel = sel.eq('project_id', filter.projectId)
  let rows
  try { rows = await q(sel) } catch (e) { reportSoft('live files list', e); return { rows: [], missing: /live_files/.test(e.message) } }
  const oids = [...new Set(rows.map(r => r.objective_id).filter(Boolean))]
  const pids = [...new Set(rows.map(r => r.project_id).filter(Boolean))]
  const [objs, projs, links] = await Promise.all([
    oids.length ? q(supabase.from('objectives').select('id,title,state,tags,effort').in('id', oids)) : [],
    pids.length ? q(supabase.from('projects').select('id,name').in('id', pids)) : [],
    oids.length ? q(supabase.from('project_tasks').select('objective_id,project_id,text').in('objective_id', oids)) : [],
  ])
  const O = new Map(objs.map(o => [o.id, o])); const P = new Map(projs.map(p => [p.id, p])); const Lk = new Map(links.map(l => [l.objective_id, l]))
  const lpids = [...new Set(links.map(l => l.project_id).filter(p => !P.has(p)))]
  if (lpids.length) for (const p of await q(supabase.from('projects').select('id,name').in('id', lpids))) P.set(p.id, p)
  return {
    rows: rows.map(r => {
      const o = r.objective_id ? O.get(r.objective_id) : null; const lk = o ? Lk.get(o.id) : null
      const p = r.project_id ? P.get(r.project_id) : lk ? P.get(lk.project_id) : null
      const kind = o ? (lk ? 'Main Mission' : (o.tags || []).includes('impromptu') ? 'Ad Hoc' : 'Side Mission') : p ? 'Main Mission' : null
      return { ...r, item: o ? { id: o.id, title: lk ? (lk.text || o.title).replace(/^\s*\d+\s*[·.:)-]\s*/, '') : o.title, state: o.state, stashed: (o.tags || []).includes('stashed'), kind, project: p?.name || null } : p ? { id: null, title: p.name, kind, project: p.name } : null }
    }),
    missing: false,
  }
}

// Paperclip counts: objective id -> number of live files on it.
export async function liveCounts() {
  try {
    const rows = await q(supabase.from('live_files').select('objective_id').is('filed_at', null).is('superseded_by', null).not('objective_id', 'is', null))
    const m = {}; for (const r of rows) m[r.objective_id] = (m[r.objective_id] || 0) + 1; return m
  } catch { return {} }
}

// The HUD's upload door: bytes travel base64 to api/live-files, which writes to storage with the
// service key and indexes the row. Used first for files under 4 MB; the direct path is the fallback.
export async function putLiveFileViaDoor(file, { objectiveId = null, projectId = null, note = null, source = 'david' } = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const b64 = await new Promise((res, rej) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result).split(',')[1] || ''); rd.onerror = () => rej(new Error('could not read the file')); rd.readAsDataURL(file) })
  const r = await fetch('/api/live-files', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'put', name: file.name, mime: file.type || null, content_base64: b64, objective_id: objectiveId, project_id: projectId, note, source }) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error || `upload ${r.status}`)
  return j.row
}

// David drops a file on the Board (or into an item): upload, index, version.
export async function putLiveFile(file, { objectiveId = null, projectId = null, note = null, source = 'david', session = null } = {}) {
  if (file.size <= 4 * 1024 * 1024) {
    try { return await putLiveFileViaDoor(file, { objectiveId, projectId, note, source }) } catch (e) { console.warn('live file door, falling back to direct upload:', e.message) }
  }
  const name = safe(file.name); const root = rootFor({ objectiveId, projectId }); const path = `${root}/${name}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (error) throw new Error(error.message)
  const { data: { session: s } } = await supabase.auth.getSession()
  const inRoot = await q(supabase.from('live_files').select('id,name,version').like('path', `${root}/%`).is('superseded_by', null).is('filed_at', null))
  const prior = inRoot.filter(r => famKey(r.name) === famKey(name)).sort((a, b) => (b.version || 1) - (a.version || 1))
  const row = { user_id: s?.user?.id || null, name, bucket: BUCKET, path, size: file.size || null, mime: file.type || null, objective_id: objectiveId, project_id: projectId, note, source, session, version: prior.length ? Math.max(prior[0].version || 1, versionNum(name, 0)) + (versionNum(name, 0) > (prior[0].version || 1) ? 0 : 1) : versionNum(name, 1) }
  const ins = await q(supabase.from('live_files').insert(row).select())
  for (const pr of prior) await supabase.from('live_files').update({ superseded_by: ins[0].id }).eq('id', pr.id)
  return ins[0]
}

// Tie a live file to a Loadout or Stash item (or untie): the bytes move under
// the item so its Mission Briefing Files tab sees them too.
export async function linkLiveFile(row, { objectiveId = null, projectId = null } = {}) {
  const dest = `${rootFor({ objectiveId, projectId })}/${row.name}`
  if (dest !== row.path) {
    const { error } = await supabase.storage.from(BUCKET).move(row.path, dest)
    if (error && !/not found/i.test(error.message)) throw new Error(error.message)
  }
  await q(supabase.from('live_files').update({ path: dest, objective_id: objectiveId, project_id: projectId }).eq('id', row.id).select())
  return dest
}

export async function noteLiveFile(id, note) { await q(supabase.from('live_files').update({ note }).eq('id', id).select()) }

export async function openLiveFile(row) {
  const { data, error } = await supabase.storage.from(row.bucket || BUCKET).createSignedUrl(row.path, 600)
  if (error) throw new Error(error.message)
  return data.signedUrl
}

// Leave Live Files: the row remembers where it went; the bytes stay until the
// filing system moves them (later). For now this is "done with it, out of view".
export async function markFiled(id, filedTo = null) { await q(supabase.from('live_files').update({ filed_at: new Date().toISOString(), filed_to: filedTo }).eq('id', id).select()) }

export async function removeLiveFile(row) {
  await supabase.storage.from(row.bucket || BUCKET).remove([row.path])
  await q(supabase.from('live_files').delete().eq('id', row.id).select())
}

// Versions (David, 10/17): a file put in play again under the same name, or
// under a name that only adds a version marker (v2, _v3, (2), final), is a new
// version of the same file. Only the current one shows; older ones sit behind
// an expander. The stem is the name without its extension and marker.
export const stemOf = (name) => String(name || '').replace(/\.[^.]+$/, '').replace(/[\s_.-]*(v|ver|version)\s*\d+[a-z]?$/i, '').replace(/[\s_.-]*\(\d+\)$/, '').replace(/[\s_.-]*(final|draft|copy|latest|new)(\s*\d+)?$/i, '').replace(/[\s_.-]+$/, '').trim().toLowerCase()
export const famKey = (name) => `${stemOf(name)}.${(String(name || '').split('.').pop() || '').toLowerCase()}`
export const versionNum = (name, fallback = 1) => { const m = String(name || '').match(/(?:v|ver|version)\s*(\d+)[a-z]?(?:\.[^.]+)?$/i) || String(name || '').match(/\((\d+)\)(?:\.[^.]+)?$/); return m ? parseInt(m[1], 10) : fallback }
// files: [{ name, ... , <timeKey> }] -> [{ key, current, older: [...] }], newest family first.
export function groupVersions(files, { timeKey = 'created_at', rootKey = null } = {}) {
  const fam = new Map()
  for (const f of files || []) {
    const key = `${rootKey && f[rootKey] ? String(f[rootKey]).replace(/\/[^/]+$/, '') + '|' : ''}${famKey(f.name)}`
    if (!fam.has(key)) fam.set(key, [])
    fam.get(key).push(f)
  }
  const rank = (f) => [versionNum(f.name, f.version || 1), f[timeKey] ? new Date(f[timeKey]).getTime() : 0]
  const out = []
  for (const [key, list] of fam) {
    list.sort((a, b) => { const ra = rank(a), rb = rank(b); return rb[0] - ra[0] || rb[1] - ra[1] })
    out.push({ key, current: list[0], older: list.slice(1) })
  }
  out.sort((a, b) => (new Date(b.current[timeKey] || 0).getTime()) - (new Date(a.current[timeKey] || 0).getTime()))
  return out
}
export const fmtStamp = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

export const fmtSize = (n) => !n ? '' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n > 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`
export const extOf = (name) => (String(name || '').split('.').pop() || '').toLowerCase()

// Mail icon: a draft in David's Outlook with the file attached, opened in a
// new tab. Nothing is sent; he writes the note there. `f` is a live_files row
// ({ id }) or any stored file ({ bucket, path, name }).
export async function draftMail(f) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const body = f.id && f.created_at ? { action: 'draft', id: f.id } : { action: 'draft', bucket: f.bucket || BUCKET, path: f.path, name: f.name }
  const r = await fetch('/api/live-files', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error || `draft ${r.status}`)
  return j
}

// A path on David's Mac, typed into the HUD. The browser cannot read it, so the
// row waits (bucket 'request') until a Claude session on the Mac puts the file
// in play (livefile.py put <path> --request <id>); the session hook announces it.
export async function requestLiveFile(localPath, { objectiveId = null, projectId = null, note = null } = {}) {
  const path = String(localPath || '').trim().replace(/^~/, '/Users/davidsmith')
  if (!path) throw new Error('a path is required')
  const name = path.split('/').pop()
  const { data: { session: s } } = await supabase.auth.getSession()
  const row = { user_id: s?.user?.id || null, name, bucket: 'request', path, size: null, mime: null, objective_id: objectiveId, project_id: projectId, note, source: 'request', version: 1 }
  return (await q(supabase.from('live_files').insert(row).select()))[0]
}
export const isRequest = (r) => r && r.bucket === 'request'
