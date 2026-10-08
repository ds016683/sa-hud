// Side Missions (objectives) as objects. The queue page and the detail view
// read and write through here; anything that touches the Board (play, pause,
// park, done) goes through lib/loadout so the fit rules and the clocks are the
// same everywhere and Harvest is never touched.
//
// A Side Mission has four pockets, by convention, in the project-files bucket:
//   objectives/<id>/artifacts/<slug>.json   (same shape as mission artifacts)
//   objectives/<id>/files/<name>            (the file cabinet)
// plus session boards whose items carry objective_id, and its steps
// (objective_steps: what needs to happen to close this out).
import { supabase } from './supabase'
import { DAVID, effortOf, sizeOf, equipObjective, holster, extract as extractItem } from './loadout'
import { listArtifacts, readArtifact } from './artifacts'

export const STATES = [
  { key: 'inbox',     label: 'Inbox',     color: '#E6B54F' },
  { key: 'follow_up', label: 'Follow Up', color: '#E0985C' },
  { key: 'waiting',   label: 'Waiting',   color: '#A9C9E8' },
  { key: 'foreman',   label: 'Delegated', color: '#B4A3E8' },
  { key: 'parked',    label: 'In Queue',  color: '#9DB0C1' },
  { key: 'active',    label: 'On the Board', color: '#43D392' },
  { key: 'released',  label: 'Released',  color: '#7FA8D4' },
]
export const STATE = Object.fromEntries(STATES.map(s => [s.key, s]))
export const TAGS = {
  scope: [{ id: 'personal', label: 'Personal' }, { id: 'third-horizon', label: 'Third Horizon' }],
  domain: ['client', 'biz-dev', 'finance', 'administrative', 'management', 'communications', 'content', 'tooling'].map(id => ({ id, label: id === 'biz-dev' ? 'Business Dev' : id[0].toUpperCase() + id.slice(1) })),
}
export const realmOf = (o) => (o?.tags || []).includes('personal') ? 'personal' : 'third-horizon'
export { sizeOf }

// Where a Side Mission came from, read from what the writers left on it.
export function provenance(o) {
  const tags = o?.tags || []
  const d = String(o?.description || '')
  if (tags.includes('impromptu')) return { label: tags.includes('call') ? 'Ambush · call' : 'Ambush', detail: 'landed on the Ad Hoc slot' }
  if (tags.includes('session')) return { label: 'Claude session', detail: 'a working session with Claude' }
  if (d.startsWith('Promoted from project')) return { label: 'Main Mission task', detail: d.replace('Promoted from project: ', '') }
  if (d.startsWith('Follow-up from ')) return { label: 'Meeting close-out', detail: d.replace('Follow-up from ', '') }
  if (d.startsWith('From ') && / notes$/.test(d.split('\n')[0])) return { label: 'Meeting notes · Lumen', detail: d.split('\n')[0].replace(/^From /, '').replace(/ notes$/, '') }
  if (d.startsWith('From ambush')) return { label: 'Dispatched from an ambush', detail: d.replace('From ambush: ', '') }
  if (tags.includes('source:email')) return { label: tags.includes('via:mr-pulse') ? 'Email · Lumen' : 'Email', detail: 'pulled from the inbox' }
  if (tags.includes('agent') || tags.includes('suggested')) return { label: 'Suggested by Lumen', detail: 'from the morning read or a sweep' }
  return { label: 'Added by hand', detail: 'the Side Missions page, the Board, or Lumen on request' }
}

const q = (p) => p.then(r => { if (r.error) throw new Error(r.error.message); return r.data })

export async function fetchObjectives() {
  return q(supabase.from('objectives').select('*').eq('user_id', DAVID).order('captured_at', { ascending: false }).limit(3000))
}

export async function addObjective({ title, size = 'light', personal = false, tags = [], due_date = null, follow_up_date = null, description = null, state = 'parked', stakeholder = null }) {
  const text = String(title || '').trim()
  if (!text) throw new Error('give it a name')
  const now = new Date().toISOString()
  const allTags = [...new Set([...(personal ? ['personal'] : []), ...tags.filter(t => t !== 'personal')])]
  const row = { user_id: DAVID, title: text.slice(0, 200), state: state === 'active' ? 'parked' : state, kind: 'execution', effort: effortOf(size), importance: 2, needs_sizing: false, tags: allTags, due_date, follow_up_date, description, stakeholder, captured_at: now }
  const data = await q(supabase.from('objectives').insert(row).select().single())
  if (state === 'active') { const r = await equipObjective(data.id, { clock: true }); if (!r.ok) return { ...data, refused: r.reasons } }
  return data
}

export const updateObjective = (id, patch) => q(supabase.from('objectives').update(patch).eq('id', id).select().single())
export const setSize = (id, size) => updateObjective(id, { effort: effortOf(size), needs_sizing: false })

// Move between containers. Active goes through the Board's fit check; done is
// a close-out (see closeOut). Everything else holsters the clock and moves.
export async function route(id, state, { follow_up_date } = {}) {
  if (state === 'active') return equipObjective(id, { clock: true })
  if (state === 'released') throw new Error('use closeOut')
  await holster(id).catch(() => {})
  const patch = { state, activated_at: null }
  if (state === 'follow_up') { const d = new Date(); d.setDate(d.getDate() + 7); patch.follow_up_date = follow_up_date || d.toISOString().slice(0, 10) }
  await updateObjective(id, patch)
  return { ok: true }
}
export async function binObjective(id) { await holster(id).catch(() => {}); return updateObjective(id, { deleted_at: new Date().toISOString(), activated_at: null }) }
export const restoreObjective = (id) => updateObjective(id, { deleted_at: null })
export const purgeObjective = (id) => q(supabase.from('objectives').delete().eq('id', id))
export async function reopenObjective(id) { return updateObjective(id, { state: 'parked', released_kind: null, released_at: null, activated_at: null }) }

// ---- steps: what needs to happen to close this out ---------------------------
const soft = async (p) => { try { return await q(p) } catch (e) { if (/objective_steps|schema cache|does not exist/i.test(e.message)) return null; throw e } }
export const fetchSteps = (objectiveId) => soft(supabase.from('objective_steps').select('*').eq('objective_id', objectiveId).order('position').order('id'))
export const MYTHIC_STEPS_MAX = 5
export async function addStep(objectiveId, text, position = 0) {
  const existing = await fetchSteps(objectiveId)
  if (existing && existing.length >= MYTHIC_STEPS_MAX) throw new Error(`a Mythic holds ${MYTHIC_STEPS_MAX} steps at most; a sixth means this is a Main Mission`)
  return soft(supabase.from('objective_steps').insert({ objective_id: objectiveId, text: String(text).trim().slice(0, 300), position }).select().single())
}
export const toggleStep = (id, done) => soft(supabase.from('objective_steps').update({ done, done_at: done ? new Date().toISOString() : null }).eq('id', id).select().single())
export const removeStep = (id) => soft(supabase.from('objective_steps').delete().eq('id', id))

// ---- pockets -------------------------------------------------------------------
export const objRoot = (id) => `objectives/${id}`
export async function listObjectiveArtifacts(id) {
  try {
    const list = await listArtifacts(objRoot(id))
    return Promise.all(list.map(async a => { try { const d = await readArtifact(objRoot(id), a.slug); return { slug: a.slug, title: d.title || a.slug, kind: d.kind || 'artifact', updated_at: d.updated_at, root: objRoot(id), doc: d } } catch { return { slug: a.slug, title: a.slug, root: objRoot(id) } } }))
  } catch { return [] }
}
export async function listObjectiveFiles(id) {
  const { data } = await supabase.storage.from('project-files').list(`${objRoot(id)}/files`, { limit: 200 })
  return (data || []).filter(f => f.id !== null).map(f => ({ name: f.name, path: `${objRoot(id)}/files/${f.name}`, bucket: 'project-files', size: f.metadata?.size, updated_at: f.updated_at }))
}
export async function uploadObjectiveFile(id, file) {
  const name = String(file.name || 'file').replace(/[^A-Za-z0-9._ -]/g, '_')
  const { error } = await supabase.storage.from('project-files').upload(`${objRoot(id)}/files/${name}`, file, { upsert: true })
  if (error) throw new Error(error.message)
  return name
}
export async function listObjectiveBoards(id) {
  const boards = await q(supabase.from('session_boards').select('id,project,title,updated_at,phases,board').order('updated_at', { ascending: false }).limit(60)).catch(() => [])
  return boards.filter(b => (b.board && b.board.objective_id === id) || (b.phases || []).some(ph => (ph.tasks || []).some(t => t.objective_id === id)))
    .map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, project: b.project, title: b.title, updated_at: b.updated_at, phases: b.phases || [], linked: true, done: ts.filter(t => t.status === 'done').length, total: ts.length } })
}
export async function pockets(id) {
  const [artifacts, files, boards, steps] = await Promise.all([listObjectiveArtifacts(id), listObjectiveFiles(id), listObjectiveBoards(id), fetchSteps(id)])
  const openSteps = (steps || []).filter(s => !s.done)
  return { artifacts, files, boards, steps: steps || [], openSteps, carrying: artifacts.length + files.length + boards.length > 0 }
}

// ---- close-out -----------------------------------------------------------------
// Extract through the Board (clock summed into the Ledger, bridged task
// closed, miles on the next update). The File Away gate (the Archive) sits in
// front of this in the HUD when the mission is carrying content.
export async function closeOut(o, { minutes, note } = {}) {
  const tags = o.tags || []
  const r = await extractItem({ id: o.id, title: o.title, activated_at: o.activated_at, personal: tags.includes('personal'), kind: tags.includes('impromptu') ? 'Ad Hoc' : 'Side Mission' }, { minutes, note })
  return r
}
