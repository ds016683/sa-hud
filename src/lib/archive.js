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
  if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,summary.ilike.%${q.trim()}%,source_title.ilike.%${q.trim()}%`)
  const { data, error } = await query
  if (error) { if (missing(error)) return null; throw new Error(error.message) }
  return data || []
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
  if (summary && summary.trim()) filed.push(await fileEntry({ ...base, kind: 'summary', title: o.title, summary: summary.trim(), body: { description: o.description || null, steps: (pockets.steps || []).map(s => ({ text: s.text, done: s.done })), notes: notes || null } }))
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
export async function fileProject(project, { artifacts = [], boards = [], realm = 'third-horizon' } = {}) {
  const base = { realm, source_kind: 'project', source_id: project.id, source_title: project.name, tags: [] }
  const filed = []
  for (const a of artifacts) filed.push(await fileEntry({ ...base, kind: a.kind === 'decision' ? 'decision' : 'artifact', title: a.title, summary: a.doc?.question || null, body: a.doc || null, bucket: BUCKET, path: `${project.id}/artifacts/${a.slug}.json` }))
  for (const b of boards) filed.push(await fileEntry({ ...base, kind: 'board', title: b.title, summary: `${b.done}/${b.total} done`, body: { phases: b.phases } }))
  return filed
}
