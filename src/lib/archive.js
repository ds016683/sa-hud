// The Archive: the master knowledge system (David approved 10/7). One row per
// filed thing in archive_entries; content copied to
// project-files/archive/<yyyy>/<slug>/... so it outlives the mission that
// made it. Fails soft until the table exists (sql/2026-10-07-side-missions-archive.sql).
import { supabase } from './supabase'

const BUCKET = 'project-files'
const slugify = (s) => String(s || 'entry').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'entry'
const missing = (e) => /archive_entries|schema cache|does not exist/i.test(String(e?.message || e))
export const archiveRoot = (title, when = new Date()) => `archive/${when.getFullYear()}/${slugify(title)}-${Date.now().toString(36)}`

export async function listEntries({ q = '', realm = null, kind = null, limit = 200 } = {}) {
  let query = supabase.from('archive_entries').select('*').order('filed_at', { ascending: false }).limit(limit)
  if (realm) query = query.eq('realm', realm)
  if (kind) query = query.eq('kind', kind)
  // Every word must land somewhere; chained .or() calls are ANDed.
  for (const w of q.trim().split(/\s+/).filter(Boolean).slice(0, 6)) { const e = w.replace(/[(),.%]/g, ''); if (e) query = query.or(`title.ilike.%${e}%,summary.ilike.%${e}%,source_title.ilike.%${e}%`) }
  const { data, error } = await query
  if (error) { if (missing(error)) return null; throw new Error(error.message) }
  return data || []
}

// The Archive's list: every closed mission (released objectives, newest
// first) with its filings grouped under it, plus filings from other sources
// (Main Mission close-outs, decisions) on their own.
export async function listClosedMissions() {
  const [objs, entries, links, projects] = await Promise.all([
    supabase.from('objectives').select('id,title,state,tags,effort,captured_at,activated_at,released_at,released_kind,description').eq('state', 'released').is('deleted_at', null).order('released_at', { ascending: false }).limit(400).then(r => r.data || []),
    listEntries({ limit: 600 }),
    supabase.from('project_tasks').select('objective_id,project_id').not('objective_id', 'is', null).then(r => r.data || []),
    supabase.from('projects').select('id,name').then(r => r.data || []),
  ])
  if (entries === null) return null
  const ids = objs.map(o => o.id)
  const steps = ids.length ? await supabase.from('objective_steps').select('objective_id,done').in('objective_id', ids).then(r => r.data || []) : []
  const projName = new Map(projects.map(p => [p.id, p.name]))
  const projOf = new Map(links.map(l => [l.objective_id, projName.get(l.project_id) || 'Main Mission']))
  const byId = new Map()
  for (const e of entries) { if (!e.source_id) continue; if (!byId.has(e.source_id)) byId.set(e.source_id, []); byId.get(e.source_id).push(e) }
  const missions = objs.map(o => ({ o, project: projOf.get(o.id) || null, entries: byId.get(o.id) || [], gatesDone: steps.filter(s => s.objective_id === o.id && s.done).length, gatesTotal: steps.filter(s => s.objective_id === o.id).length }))
  const seen = new Set(ids)
  const loose = entries.filter(e => !e.source_id || !seen.has(e.source_id))
  return { missions, loose }
}

export async function fileEntry(row) {
  const { data, error } = await supabase.from('archive_entries').insert(row).select().single()
  if (error) { if (missing(error)) throw new Error('The Archive is not set up yet: run sql/2026-10-07-side-missions-archive.sql'); throw new Error(error.message) }
  return data
}

export const signedUrl = async (bucket, path) => { const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600); return data?.signedUrl || null }

// File a Side Mission's pockets. `picks` = { artifacts: [slug], files: [name], boards: [id] }.
// Artifacts and boards are kept inline (body); files are copied into the archive folder.
export async function fileObjective(o, pockets, { realm, summary, picks, notes }) {
  const root = archiveRoot(o.title)
  const base = { realm, source_kind: 'objective', source_id: o.id, source_title: o.title, tags: (o.tags || []).filter(t => !['personal', 'third-horizon'].includes(t)) }
  const filed = []
  if (summary && summary.trim()) filed.push(await fileEntry({ ...base, kind: 'summary', title: o.title, summary: summary.trim(), body: { achieved: summary.trim(), north_star: o.north_star || null, description: o.description || null, steps: (pockets.steps || []).map(s => ({ text: s.text, done: s.done })), notes: notes || null } }))
  for (const a of pockets.artifacts.filter(a => picks.artifacts.includes(a.slug))) {
    filed.push(await fileEntry({ ...base, kind: a.kind === 'decision' ? 'decision' : 'artifact', title: a.title, summary: a.doc?.question || a.doc?.summary || null, body: a.doc || null, bucket: BUCKET, path: `${a.root}/artifacts/${a.slug}.json` }))
  }
  for (const f of pockets.files.filter(f => picks.files.includes(f.name))) {
    const to = `${root}/${f.name}`
    const { error } = await supabase.storage.from(BUCKET).copy(f.path, to)
    filed.push(await fileEntry({ ...base, kind: 'file', title: f.name, bucket: BUCKET, path: error ? f.path : to }))
  }
  for (const b of pockets.boards.filter(b => picks.boards.includes(b.id))) {
    filed.push(await fileEntry({ ...base, kind: 'board', title: b.title, summary: `${b.done}/${b.total} done · ${b.project}`, body: { phases: b.phases } }))
  }
  return filed
}

// File a Main Mission's artifacts and latest board when it is marked complete.
export async function fileProject(project, { artifacts = [], boards = [], realm = 'third-horizon', achieved = null } = {}) {
  const base = { realm, source_kind: 'project', source_id: project.id, source_title: project.name, tags: [] }
  const filed = []
  // The debrief (David 10/21): his answer to "Is it true? What's different now?" leads the mission's archive.
  if (achieved && String(achieved).trim()) filed.push(await fileEntry({ ...base, kind: 'summary', title: project.name, summary: String(achieved).trim().slice(0, 4000), body: { achieved: String(achieved).trim().slice(0, 4000), north_star: project.description || null } }))
  for (const a of artifacts) filed.push(await fileEntry({ ...base, kind: a.kind === 'decision' ? 'decision' : 'artifact', title: a.title, summary: a.doc?.question || null, body: a.doc || null, bucket: BUCKET, path: `${project.id}/artifacts/${a.slug}.json` }))
  for (const b of boards) filed.push(await fileEntry({ ...base, kind: 'board', title: b.title, summary: `${b.done}/${b.total} done`, body: { phases: b.phases } }))
  return filed
}

// Achieved alone (David, 10/16): an extract with nothing else to file still
// records his answer to "Is it true? What's different now?" for the yay page.
export async function fileAchieved(item, text) {
  const t = String(text || '').trim(); if (!t) return null
  return fileEntry({ realm: item.personal ? 'personal' : 'third-horizon', source_kind: 'objective', source_id: item.id, source_title: item.title, tags: [], kind: 'summary', title: item.title, summary: t, body: { achieved: t, north_star: item.north_star || null } })
}
