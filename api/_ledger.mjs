// The Ledger toolbox: every read and write the Friend can perform, shared by
// the MCP server (api/mcp.mjs) and Lumen's brain (api/_lumen-brain.mjs).
// Reads are the v1 set; writes are the "hands" (David's 9/14 top-of-list ask).
// Writes touch only David's own tables and always go through PostgREST with
// the service key; nothing here can reach the pipes or the identity bucket.

import { graphToken, MAILBOX } from './_sync-core.mjs'
import { waSendDocument, waSendAudio, waSendText, davidNumber } from './_wa.mjs'
import { extractText, clip } from './_docs.mjs'
import { logHours, setHours } from './time.mjs'
import { sendMail } from './_mail.mjs'

// Graph answers a PATCH with the wall time in the event's own zone (Chicago,
// after our own patch), not UTC. Turn that into the instant (10/14: an 8:30
// Chicago meeting landed in the Ledger as 8:30 UTC and the clock ran six
// hours long).
function zonedToIso(g) {
  const dt = String(g?.dateTime || '').slice(0, 19), tz = String(g?.timeZone || 'UTC')
  if (!dt) return null
  if (/^utc$/i.test(tz)) return new Date(dt + 'Z').toISOString()
  const guess = new Date(dt + 'Z')
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(guess)
  const get = (t) => Number(parts.find(p => p.type === t)?.value || 0)
  const asLocal = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'))
  return new Date(guess.getTime() - (asLocal - guess.getTime())).toISOString()
}
import { loadout, checkFit, equip, holster, extract, effortOf, sizeOf, SIZES, boardLog } from './_loadout.mjs'
import { markdownToDocx, DOCX_MIME, letterheadDocx, inspectDocx } from './_docx.mjs'
import { createDraft } from './_draft.mjs'
import { fillScorecard } from './_scorecard.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
export const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY
  return { apikey: key, Authorization: `Bearer ${key}` }
}
export async function sb(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`${path.split('?')[0]} -> ${res.status}`)
  return res.json()
}
// Granola transcript for a note id (public API). Tries the transcript route,
// then the note itself for an embedded transcript. Speaker turns joined by newline.
export async function granolaTranscript(noteId, { fromMin = null, toMin = null } = {}) {
  const key = process.env.GRANOLA_API_KEY
  if (!key) return { ok: false, error: 'GRANOLA_API_KEY not set' }
  const gh = { Authorization: `Bearer ${key}`, Accept: 'application/json' }
  // Paged: { transcript: [{ text, start_time, end_time, speaker: { source, attribution } }], hasMore, cursor }
  const utt = []
  let cursor = null, status = null
  for (let page = 0; page < 80; page++) {
    const qs = new URLSearchParams({ page_size: '100' })
    if (cursor) qs.set('cursor', cursor)
    const res = await fetch(`https://public-api.granola.ai/v1/notes/${noteId}/transcript?${qs}`, { headers: gh })
    status = res.status
    if (!res.ok) break
    const d = await res.json()
    const arr = Array.isArray(d) ? d : (d?.transcript || [])
    utt.push(...arr)
    if (!d?.hasMore || !d?.cursor || !arr.length) break
    cursor = d.cursor
  }
  if (!utt.length) return { ok: false, error: `no transcript available (transcript route -> ${status})` }
  const t0 = new Date(utt[0].start_time || 0).getTime()
  const who = (u) => (u.speaker?.attribution === 'me' || u.speaker?.source === 'microphone') ? 'David' : 'Them'
  const mmss = (iso) => { const s = Math.max(0, Math.round((new Date(iso).getTime() - t0) / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
  // Merge consecutive utterances from the same speaker into turns.
  const turns = []
  for (const u of utt) {
    const min = (new Date(u.start_time).getTime() - t0) / 60000
    if (fromMin != null && min < fromMin) continue
    if (toMin != null && min > toMin) continue
    const w = who(u)
    const last = turns[turns.length - 1]
    if (last && last.who === w && (new Date(u.start_time).getTime() - last.end) < 20000) { last.text += ' ' + (u.text || '').trim(); last.end = new Date(u.end_time || u.start_time).getTime() }
    else turns.push({ who: w, at: mmss(u.start_time), text: (u.text || '').trim(), end: new Date(u.end_time || u.start_time).getTime() })
  }
  const text = turns.map(t => `[${t.at}] ${t.who}: ${t.text}`).join('\n')
  return { ok: true, text, utterances: utt.length, turns: turns.length, minutes: Math.round((new Date(utt[utt.length - 1].end_time || utt[utt.length - 1].start_time).getTime() - t0) / 60000) }
}

// Artifacts: structured work products a project carries (a scorecard, a
// memo in progress), kept as JSON in the project-files bucket under
// <project id>/artifacts/<slug>.json. The HUD renders and edits them on the
// project page; Lumen drafts into them and ports them out with write_file.
async function findProject(q) {
  const pq = esc(String(q || ''))
  const ps = await sb(`projects?select=id,key,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(pq)},name.ilike.*${encodeURIComponent(pq)}*)&limit=5`)
  if (ps.length !== 1) throw new Error(ps.length ? `project ambiguous: ${ps.map(p => p.name).join(' | ')}` : `no project matches "${q}"`)
  return ps[0]
}
// Artifacts live on a Main Mission (project-files/<project id>/artifacts) or on a
// Side Mission (project-files/objectives/<objective id>/artifacts). Tools take
// either `project` or `side_mission` (an objective title).
async function resolveRoot(args) {
  if (args.side_mission) { const o = await findObjective(args.side_mission); return { id: `objectives/${o.id}`, name: o.title, objective: o } }
  return findProject(args.project)
}
const artifactPath = (projectId, slug) => `${projectId}/artifacts/${String(slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`
async function readArtifact(projectId, slug) {
  // Storage objects sit behind a CDN; a read right after a write can come back
  // stale, which made per-question patches overwrite each other. Bust it.
  const res = await fetch(`${URL_BASE}/storage/v1/object/project-files/${artifactPath(projectId, slug)}?cb=${Date.now()}`, { headers: { ...sbHeaders(), 'Cache-Control': 'no-cache', Pragma: 'no-cache' }, cache: 'no-store' })
  if (!res.ok) return null
  return res.json()
}
async function writeArtifact(projectId, slug, doc) {
  const body = JSON.stringify({ ...doc, updated_at: new Date().toISOString() }, null, 1)
  const res = await fetch(`${URL_BASE}/storage/v1/object/project-files/${artifactPath(projectId, slug)}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body })
  if (!res.ok) throw new Error(`artifact write -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  return artifactPath(projectId, slug)
}
function mergeArtifact(base, patch) {
  const out = { ...base }
  for (const [k, v] of Object.entries(patch || {})) {
    if (Array.isArray(v) && Array.isArray(base[k])) {
      const key = (x) => x?.id ?? x?.name
      const list = base[k].map(x => ({ ...x }))
      for (const item of v) {
        const i = list.findIndex(x => key(x) === key(item))
        if (i >= 0) list[i] = { ...list[i], ...item }
        else list.push(item)
      }
      out[k] = list
    } else if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      out[k] = mergeArtifact(base[k], v)
    } else out[k] = v
  }
  return out
}
async function listArtifacts(projectId) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: `${projectId}/artifacts`, limit: 200 }) })
  if (!res.ok) return []
  const rows = await res.json()
  return (Array.isArray(rows) ? rows : []).filter(r => r.name.endsWith('.json')).map(r => ({ slug: r.name.replace(/\.json$/, ''), updated_at: r.updated_at }))
}

// Put a binary into the `files` bucket (receipts, photos David sends). Returns the path.
// Live Files index: a row for anything Lumen writes or files, so the Board's
// Live Files window sees it. Never fatal (the table may not exist yet).
const stemOf = (n) => String(n || '').replace(/\.[^.]+$/, '').replace(/[\s_.-]*(v|ver|version)\s*\d+[a-z]?$/i, '').replace(/[\s_.-]*\(\d+\)$/, '').replace(/[\s_.-]*(final|draft|copy|latest|new)(\s*\d+)?$/i, '').replace(/[\s_.-]+$/, '').trim().toLowerCase()
export async function indexLiveFile({ name, bucket, path, size, mime, objective_id = null, project_id = null, note = null, source = 'lumen' }) {
  try {
    const root = path.replace(/\/[^/]+$/, '')
    const inRoot = await sb(`live_files?select=id,name,version&path=like.${encodeURIComponent(root + '/%')}&bucket=eq.${bucket}&superseded_by=is.null&filed_at=is.null`)
    const ext = (n) => (String(n || '').split('.').pop() || '').toLowerCase()
    const prior = inRoot.filter(r => stemOf(r.name) === stemOf(name) && ext(r.name) === ext(name)).sort((a, b) => (b.version || 1) - (a.version || 1))
    const ins = await sbWrite('POST', 'live_files', { user_id: DAVID, name, bucket, path, size: size || null, mime: mime || null, objective_id, project_id, note, source, version: prior.length ? (prior[0].version || 1) + 1 : 1 })
    if (ins?.[0]) for (const pr of prior) await sbWrite('PATCH', `live_files?id=eq.${pr.id}`, { superseded_by: ins[0].id }, 'return=minimal')
  } catch (e) { console.warn('live file index', e.message) }
}
export async function putFile(path, bytes, mime) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/files/${path.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST', headers: { ...sbHeaders(), 'Content-Type': mime || 'application/octet-stream', 'x-upsert': 'true' }, body: bytes,
  })
  if (!res.ok) throw new Error(`storage put -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
  return path
}

export async function sbWrite(method, path, body, prefer = 'return=representation') {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method, headers: { ...sbHeaders(), 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const txt = await res.text()
  return txt ? JSON.parse(txt) : null
}
export async function identityDoc(name) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/identity/${name}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`identity/${name} -> ${res.status}`)
  return res.text()
}
export const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const chiDayOf = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts))
const esc = (s) => String(s).replace(/[%_,()]/g, '')
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

const OBJ_STATES = ['active', 'parked', 'waiting', 'follow_up', 'foreman', 'released', 'inbox']

// Exact title first, then a contains match; refuses ambiguity rather than guessing.
// ---- storage, generic (11/4, the Lumen panel): write any object into project-files; list a prefix
async function putStorage(path, body, contentType) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': contentType, 'x-upsert': 'true' }, body })
  if (!res.ok) throw new Error(`storage write ${res.status}: ${(await res.text()).slice(0, 160)}`)
  return path
}
async function getStorageJson(path) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path.split('/').map(encodeURIComponent).join('/')}?cb=${Date.now()}`, { headers: { ...sbHeaders(), 'Cache-Control': 'no-cache' }, cache: 'no-store' })
  return res.ok ? res.json() : null
}
async function listStorage(prefix, limit = 200) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit, sortBy: { column: 'updated_at', order: 'desc' } }) })
  if (!res.ok) return []
  return (await res.json()) || []
}
const slugOf = (t) => String(t || 'page').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'page'
const rootOf = (item) => item.kind === 'project' ? item.id : `objectives/${item.id}`

// The card frame (11/4): what Lumen sees of the card David is working in from the
// Lumen panel. Title, Polaris, back story, state, milestones or steps, the files
// in play, the Workbench tabs, the builds. Short: it rides every turn.
export async function cardFrame(item) {
  const lines = []
  const root = rootOf(item)
  if (item.kind === 'project') {
    const pr = (await sb(`projects?select=id,key,name,description,status&id=eq.${item.id}&limit=1`))[0]
    if (!pr) return `Main Mission ${item.id} (not found)`
    lines.push(`Main Mission: ${pr.name} (project key ${pr.key}, status ${pr.status}). Address it in tools as project "${pr.key}".`)
    if (pr.description) lines.push(`Description: ${String(pr.description).slice(0, 600)}`)
    const tasks = await sb(`project_tasks?select=text,status,notes&project_id=eq.${item.id}&order=id.asc&limit=40`).catch(() => [])
    if (tasks.length) lines.push(`Milestones (${tasks.length}):\n` + tasks.map(t => `- [${t.status}] ${t.text}`).join('\n'))
  } else {
    const o = (await sb(`objectives?select=id,title,state,effort,tags,description,notes,north_star,due_date,follow_up_date,parent_id&id=eq.${item.id}&limit=1`))[0]
    if (!o) return `Side Mission ${item.id} (not found)`
    const size = Number(o.effort) >= 4 ? 'Mythic' : Number(o.effort) === 3 ? 'Contract' : 'Bounty'
    lines.push(`${o.parent_id ? 'Milestone of a Mythic' : 'Side Mission'}: "${o.title}" (${size}, ${o.state}${(o.tags || []).includes('impromptu') ? ', Ad Hoc' : ''}). Address it in tools as side_mission "${o.title}".`)
    if (o.north_star) lines.push(`Polaris: ${o.north_star}`)
    if (o.description) lines.push(`Back story: ${String(o.description).slice(0, 600)}`)
    if (o.notes) lines.push(`Notes: ${String(o.notes).slice(0, 400)}`)
    if (o.due_date || o.follow_up_date) lines.push(`Dates: due ${o.due_date || 'none'}, follow up ${o.follow_up_date || 'none'}`)
    const kids = await sb(`objectives?select=title,state,description&parent_id=eq.${item.id}&deleted_at=is.null&order=captured_at.asc&limit=10`).catch(() => [])
    if (kids.length) lines.push(`Milestones (${kids.length}):\n` + kids.map((k, i) => `- ${i + 1}. [${k.state}] ${k.title}${k.description ? ` (done when: ${String(k.description).slice(0, 120)})` : ''}`).join('\n'))
    const steps = await sb(`objective_steps?select=text,done&objective_id=eq.${item.id}&order=id.asc&limit=20`).catch(() => [])
    if (steps.length) lines.push(`Stops on the path (End Of The Trail on the card):\n` + steps.map(s => `- [${s.done ? 'x' : ' '}] ${s.text}`).join('\n'))
  }
  const files = await sb(`live_files?select=name,note,bucket,path&${item.kind === 'project' ? 'project_id' : 'objective_id'}=eq.${item.id}&filed_at=is.null&superseded_by=is.null&order=created_at.desc&limit=30`).catch(() => [])
  const inPlay = files.filter(f => !(f.bucket === 'link' && /^claude:\/\//.test(String(f.path || ''))))
  if (inPlay.length) lines.push(`Files in play (${inPlay.length}):\n` + inPlay.map(f => `- ${f.name}${f.bucket === 'link' ? ` (link: ${f.path})` : ''}${f.note ? ` · ${String(f.note).slice(0, 100)}` : ''}`).join('\n'))
  const pages = (await listStorage(`${root}/workspace`)).filter(f => f.name.endsWith('.json'))
  if (pages.length) lines.push(`Workbench tabs: ${pages.map(f => f.name.replace(/\.json$/, '')).join(', ')} (read one with read_workbench_tab; write with workbench_tab)`)
  const builds = (await listStorage(`${root}/build`)).filter(f => f.name.endsWith('.json'))
  if (builds.length) lines.push(`Builds on the Build tab: ${builds.map(f => f.name.replace(/\.json$/, '')).join(', ')} (rewrite one with build_page using the same slug)`)
  return lines.join('\n')
}

async function findObjective(title) {
  const q = esc(title || '')
  if (!q) throw new Error('title required')
  const exact = await sb(`objectives?select=id,title,state,due_date,follow_up_date,activated_at,tags,effort,north_star&deleted_at=is.null&title=ilike.${encodeURIComponent(q)}&limit=5`)
  if (exact.length === 1) return exact[0]
  const like = await sb(`objectives?select=id,title,state,due_date,follow_up_date,activated_at,tags,effort&deleted_at=is.null&title=ilike.*${encodeURIComponent(q)}*&order=captured_at.desc&limit=5`)
  if (like.length === 1) return like[0]
  if (!like.length) {
    // A title with a comma, a parenthesis or an underscore in it lost those marks above and matched nothing (11/10):
    // one more pass on the words alone, in order.
    const loose = await sb(`objectives?select=id,title,state,due_date,follow_up_date,activated_at,tags,effort,north_star&deleted_at=is.null&title=ilike.${encodeURIComponent(nameLike(title))}&order=captured_at.desc&limit=6`)
    const same = loose.filter(o => norm(o.title) === norm(title))
    if (same.length === 1) return same[0]
    if (loose.length === 1) return loose[0]
    if (loose.length > 1) throw new Error(`"${title}" is ambiguous: ${loose.map(o => `${o.title} (${o.state})`).join(' | ')}`)
  }
  if (!like.length) throw new Error(`no objective matches "${title}"`)
  throw new Error(`"${title}" is ambiguous: ${like.map(o => `${o.title} (${o.state})`).join(' | ')}`)
}

// ---------------------------------------------------------------- tools

// ---- live mailbox helpers (Microsoft Graph, app-only, David's mailbox)
let FOLDER_CACHE = null
async function graphFolders(token) {
  if (FOLDER_CACHE) return FOLDER_CACHE
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/mailFolders?$select=id,displayName&$top=100`, { headers: { Authorization: `Bearer ${token}` } })
  const map = {}
  if (res.ok) for (const f of (await res.json()).value || []) map[f.id] = f.displayName
  FOLDER_CACHE = map
  return map
}
async function mailAttachments(token, encodedId) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${encodedId}/attachments?$select=id,name,contentType,size,isInline`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`attachments -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return ((await res.json()).value || []).filter(a => (a['@odata.type'] || '').includes('fileAttachment') && !a.isInline)
}


// ---- file store (private bucket 'files'), walked recursively
async function listFiles(prefix) {
  // Folders at the same depth are read together (11/10: a search took 3 to 4.5 seconds walking them one at a time).
  const out = []
  const walk = async (pre) => {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: pre, limit: 1000, sortBy: { column: 'name', order: 'asc' } }) })
    if (!res.ok) throw new Error(`files list -> ${res.status}`)
    const folders = []
    for (const e of await res.json()) {
      if (e.name === '.emptyFolderPlaceholder') continue
      const p = pre ? `${pre}/${e.name}` : e.name
      if (e.id) out.push({ path: p, size: e.metadata?.size || null, type: e.metadata?.mimetype || null, updated: e.updated_at || null })
      else folders.push(p)
    }
    await Promise.all(folders.map(walk))
  }
  await walk(prefix || '')
  return out.sort((x, y) => x.path.localeCompare(y.path))
}

// ---- one way to name a file (11/10) ---------------------------------------------------
// Lumen reached for a file four ways in one evening and three of them missed: read_file
// could not open a card's file, look_at_file lost a name with an underscore in it, and an
// attachment asked for as "Chief_Analytics" was not found beside "Chief Analytics". Every
// tool that takes a file now resolves it here: a path in either store (the file cabinet or
// a card's files), or a name (the card first, then Live Files, then the cabinet), with
// spaces, underscores, case and punctuation forgiven.
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const nameLike = (s) => `*${String(s || '').split(/[^A-Za-z0-9]+/).filter(Boolean).join('*')}*`
const encPath = (p) => String(p).split('/').map(encodeURIComponent).join('/')
function pickAttachment(atts, want) {
  const w = norm(want)
  if (!w) return atts.length === 1 ? atts[0] : null
  const exact = atts.filter(a => norm(a.name) === w || norm(a.name.replace(/\.[^.]+$/, '')) === w)
  if (exact.length === 1) return exact[0]
  const part = atts.filter(a => norm(a.name).includes(w))
  return part.length === 1 ? part[0] : null
}
async function fetchObject(bucket, path) {
  // Past storage's cached copy: a document rewritten a moment ago must be read as it is now, not as it was.
  const r = await fetch(`${URL_BASE}/storage/v1/object/${bucket}/${encPath(path)}?cb=${Date.now()}`, { headers: sbHeaders(), cache: 'no-store' })
  return r.ok ? r : null
}
const num01 = (v, d) => (v === undefined || v === null || Number.isNaN(Number(v))) ? d : Math.min(Math.max(Number(v), 0), 1)
// The record of cloned voices: who it is, the voice id, the sample it came from and the permission behind it.
const CLONES_REC = 'lumen/voice-clones.json'
async function voiceClones() {
  const got = await fetchObject('project-files', CLONES_REC)
  const list = got ? await got.json().catch(() => []) : []
  return Array.isArray(list) ? list : []
}
async function saveVoiceClones(list) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/project-files/${CLONES_REC}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(list.slice(-100)) })
  if (!r.ok) throw new Error(`clone record -> ${r.status}`)
}
// The card a tool call names: { objective_id, project_id, root, files (where its files sit), title }.
async function cardScope(args) {
  if (args.side_mission) { const o = await findObjective(args.side_mission); return { objective_id: o.id, project_id: null, root: `objectives/${o.id}`, files: `objectives/${o.id}/files`, title: o.title } }
  if (args.project) {
    const q = esc(args.project)
    const ps = await sb(`projects?select=id,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(q)},name.ilike.${encodeURIComponent(q)})&limit=2`)
    if (ps.length !== 1) throw new Error(ps.length ? 'ambiguous project' : 'no such project')
    return { objective_id: null, project_id: ps[0].id, root: ps[0].id, files: ps[0].id, title: ps[0].name }
  }
  return null
}
async function resolveFile(args) {
  const path = String(args.path || '').replace(/^\/+/, '').trim()
  if (path) {
    const order = /^(objectives\/|[0-9a-f]{8}-[0-9a-f]{4}-)/i.test(path) ? ['project-files', 'files'] : ['files', 'project-files']
    for (const bucket of order) {
      const r = await fetchObject(bucket, path)
      if (r) return { name: path.split('/').pop(), bucket, path, mime: r.headers.get('content-type') || null, bytes: Buffer.from(await r.arrayBuffer()), row: null }
    }
  }
  const needle = String(args.name || (path ? path.split('/').pop() : '')).trim()
  if (!needle) throw new Error('path or name required')
  const card = await cardScope(args).catch(() => null)
  const base = `live_files?select=id,name,bucket,path,mime,size,created_at,objective_id,project_id,note&superseded_by=is.null&bucket=neq.link&bucket=neq.request&name=ilike.${encodeURIComponent(nameLike(needle))}&order=created_at.desc&limit=12`
  let rows = card ? await sb(`${base}&${card.objective_id ? `objective_id=eq.${card.objective_id}` : `project_id=eq.${card.project_id}`}`) : []
  if (!rows.length) rows = await sb(base)
  if (rows.length) {
    const exact = rows.filter(r => norm(r.name) === norm(needle) || norm(r.name.replace(/\.[^.]+$/, '')) === norm(needle))
    const names = [...new Set((exact.length ? exact : rows).map(r => r.name))]
    if (names.length > 1) throw new Error(`"${needle}" matches more than one file: ${names.slice(0, 8).join(' | ')}. Name one exactly.`)
    const row = (exact.length ? exact : rows)[0]
    const r = await fetchObject(row.bucket, row.path)
    if (r) return { name: row.name, bucket: row.bucket, path: row.path, mime: row.mime || r.headers.get('content-type') || null, bytes: Buffer.from(await r.arrayBuffer()), row }
  }
  const all = await listFiles('')
  const hits = all.filter(f => norm(f.path.split('/').pop()).includes(norm(needle)))
  if (hits.length > 1 && !hits.some(f => norm(f.path.split('/').pop().replace(/\.[^.]+$/, '')) === norm(needle))) throw new Error(`"${needle}" matches more than one file in the cabinet: ${hits.slice(0, 8).map(f => f.path).join(' | ')}. Give the path.`)
  const hit = hits.find(f => norm(f.path.split('/').pop().replace(/\.[^.]+$/, '')) === norm(needle)) || hits[0]
  if (hit) { const r = await fetchObject('files', hit.path); if (r) return { name: hit.path.split('/').pop(), bucket: 'files', path: hit.path, mime: r.headers.get('content-type') || null, bytes: Buffer.from(await r.arrayBuffer()), row: null } }
  throw new Error(`no file matching "${needle}"${card ? ` on ${card.title},` : ''} in Live Files or in the file cabinet`)
}
// Where a stop on a card's path came from (David 11/11: "shouldn't really be guess work. should be coming out of
// the work with lumen"): kept beside the card's files at objectives/<id>/path.json, the same file the HUD reads
// and writes (src/lib/path.js). by 'david' with his words in quote, or 'lumen' when he gave the word without them.
async function notePathSource(objectiveId, stepId, src) {
  const path = `objectives/${objectiveId}/path.json`
  let doc = { v: 1, sources: {} }
  const r = await fetchObject('project-files', path)
  if (r) { try { const d = await r.json(); if (d && d.sources && typeof d.sources === 'object') doc = { v: 1, ...d } } catch { /* a fresh file */ } }
  doc.sources[String(stepId)] = { at: new Date().toISOString(), ...src }
  const up = await fetch(`${URL_BASE}/storage/v1/object/project-files/${encPath(path)}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!up.ok) throw new Error(`path.json -> ${up.status}`)
}
// Letterheads: Word files in the cabinet under Third Horizon/Templates/Letterheads, named
// for what they are ("Job Description"). Any other .docx can stand in as a one-off template.
const LETTERHEADS = 'Third Horizon/Templates/Letterheads'
async function letterheadNames() {
  const res = await fetch(`${URL_BASE}/storage/v1/object/list/files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: LETTERHEADS, limit: 200, sortBy: { column: 'name', order: 'asc' } }) })
  return ((res.ok ? await res.json() : []) || []).filter(r => r.id && /\.docx$/i.test(r.name)).map(r => r.name)
}
async function findLetterhead(ref, args) {
  const names = await letterheadNames()
  const want = norm(String(ref).replace(/\.docx$/i, ''))
  const hit = names.find(n => norm(n.replace(/\.docx$/i, '')) === want) || names.find(n => norm(n).includes(want))
  if (hit) { const r = await fetchObject('files', `${LETTERHEADS}/${hit}`); if (r) return { label: hit.replace(/\.docx$/i, ''), registered: true, bytes: Buffer.from(await r.arrayBuffer()) } }
  let f
  try { f = await resolveFile(/\//.test(ref) ? { path: ref } : { name: ref, side_mission: args.side_mission, project: args.project }) }
  catch (e) { throw new Error(`no letterhead "${ref}". Registered letterheads: ${names.map(n => n.replace(/\.docx$/i, '')).join(', ') || 'none yet'}. Any Word file can be the template instead: give its cabinet path or its name on the card. (${e.message})`) }
  if (!/\.docx$/i.test(f.name)) throw new Error(`${f.name} is not a Word file; a letterhead has to be a .docx`)
  return { label: f.name.replace(/\.docx$/i, ''), registered: false, bytes: f.bytes }
}

// ---- meetings: find a calendar event by words, and write its session row
const STOPW = new Set(['the', 'and', 'with', 'for', 'call', 'meeting', 'sync', 'weekly', 'monthly', 'david', 'smith', 'third', 'horizon'])
const wordsOf = (x) => new Set(String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOPW.has(w)))
function titleMatch(a, b) {
  const A = String(a || '').trim().toLowerCase(), B = String(b || '').trim().toLowerCase()
  if (A && A === B) return true
  const wa = wordsOf(a), wb = wordsOf(b)
  if (!wa.size) return false
  const shared = [...wa].filter(w => wb.has(w) || [...wb].some(x => (x.length >= 4 && w.startsWith(x)) || (w.length >= 4 && x.startsWith(w)))).length
  return shared >= Math.min(2, wa.size, wb.size)
}
async function findEvent(day, subject) {
  const evs = await sb(`calendar_events?select=id,subject,start_at,end_at,is_all_day&day=eq.${day}&is_cancelled=eq.false&order=start_at.asc`)
  const q = String(subject || '').toLowerCase().trim()
  return evs.find(e => String(e.subject || '').toLowerCase() === q)
    || evs.find(e => String(e.subject || '').toLowerCase().includes(q))
    || evs.find(e => titleMatch(subject, e.subject))
    || null
}
async function putSession(cur, patch) {
  const row = { ...patch, updated_at: new Date().toISOString() }
  if (cur) return sbWrite('PATCH', `meeting_sessions?event_id=eq.${encodeURIComponent(cur.event_id)}`, row, 'return=minimal')
  return sbWrite('POST', 'meeting_sessions', row)
}

export const TOOLS = [
  // ---- reads
  {
    name: 'get_context',
    description: "David's distilled operating context (who he is, how his architecture runs, how to work with him) plus the live state of today's game: miles, grade, badges, signal, must-dos. Call this at the start of any conversation that touches David's work, day, decisions, or wellbeing.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_today',
    description: "Today's live snapshot from the Ledger: the latest composed summary, deterministic scorecard, noteworthy threads, must-do list, follow-ups coming due, new items, and the rest of today's WORK calendar (Outlook/Microsoft 365). For any day after today use get_calendar. Never a device-local calendar.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_calendar',
    description: "David's WORK calendar (Outlook/Microsoft 365) for a date range, up to four weeks ahead. Use this for anything beyond today: 'what does Monday look like', 'am I free Thursday afternoon', 'what's next week'. Dates YYYY-MM-DD; defaults to today through 14 days out. Never a device-local calendar.",
    inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD, default today' }, to: { type: 'string', description: 'YYYY-MM-DD inclusive, default from+14' } } },
  },
  {
    name: 'get_objectives',
    description: "David's personal task board (Objectives), grouped by state: active (being worked), parked (queue), waiting (blocked on others), follow_up (parked against a future follow_up_date; the system nudges him from two days out), foreman (delegated), inbox (awaiting his triage), plus anything released today. His dispositions are law.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_projects',
    description: 'The projects layer: long-standing projects with their open tasks. Tasks with status "blocked" are decisions waiting on David. Project tasks are separate from personal Objectives.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_meetings',
    description: 'Search Granola meeting notes (title and summary text). Returns matching meetings with dates, attendees, and summaries. Use for "what did we decide with X," "when did I last talk to Y."',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'text to search for' }, limit: { type: 'integer', description: 'max results, default 5' } }, required: ['query'] },
  },
  {
    name: 'search_emails',
    description: "Search David's piped email (subject, sender, preview) over recent days. Previews only; full bodies stay in the mailbox.",
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, days: { type: 'integer', description: 'lookback window in days, default 14' } }, required: ['query'] },
  },
  {
    name: 'search_mailbox',
    description: "Search David's whole live mailbox (Inbox, Sent, every folder, any age) by words in subject, sender, or body. Use this when the piped email (search_emails) does not reach far enough, when he asks whether he replied to someone (Sent folder), or to find a message that carries an attachment. Returns message ids for read_email and send_attachment.",
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'words to search, e.g. a subject, a name, a topic' }, limit: { type: 'integer', description: 'max results, default 10' } }, required: ['query'] },
  },
  {
    name: 'read_email',
    description: 'Read one message in full from the live mailbox: body text and the list of attachments (id, name, type, size). message_id comes from search_mailbox.',
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' } }, required: ['message_id'] },
  },
  {
    name: 'send_attachment',
    description: "Pull an attachment off an email and post it into David's WhatsApp chat as a document he can open. message_id from search_mailbox or read_email; filename picks one attachment by (partial) name (spaces, underscores and case do not matter), otherwise the only or first file attachment is sent. Say what you sent in one line after.",
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' }, filename: { type: 'string' }, caption: { type: 'string', description: 'short caption shown under the file' } }, required: ['message_id'] },
  },
  {
    name: 'search_files',
    description: "Find documents by words in the name or folder, in both places David keeps them: the file cabinet (bucket 'files': packets, decks, contracts, templates) and the files on his cards. Returns cabinet paths, and on_cards with the card each file sits on. Any result can go to read_file, look_at_file, send_file, draft_email, or write_file as a letterhead. Empty query lists the cabinet.",
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', description: 'default 25' } }, required: [] },
  },
  {
    name: 'list_folder',
    description: "The File Cabinet (bucket 'files'): list one folder's subfolders and files. The structure: 'Personal/…', 'Third Horizon/…', and 'inbox/<day>/' where everything David sends you lands. Empty path = the top drawers.",
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: [] },
  },
  {
    name: 'move_file',
    description: "Move or rename a file in the File Cabinet: from (exact path, e.g. from list_folder or the filed-at note on a document) to the new full path (folder/name). Use when David says where something belongs ('file the Porsche documents under Personal/Vehicles'). Make the folder first if it does not exist.",
    inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
  },
  {
    name: 'make_folder',
    description: 'Make a folder in the File Cabinet (full path, e.g. Personal/Vehicles/GLS 450 trade).',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'delete_file',
    description: 'Remove a file from the File Cabinet. Only on David\'s explicit word, never on your own judgement.',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'send_file',
    description: "Post a document into David's WhatsApp chat so he can open it. A file is named by path (from search_files, list_folder, or a card file's path) or by name (part of the file name: the card first when side_mission or project is given, then Live Files, then the cabinet). Spaces, underscores and case do not matter. Say what you sent in one line after. On a card in the HUD the file is already in front of him; send it to WhatsApp only when he asks for it there.",
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, name: { type: 'string' }, side_mission: { type: 'string', description: 'the card to look on first' }, project: { type: 'string' }, caption: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_transcript',
    description: "The full Granola transcript of a meeting (what was actually said, as [mm:ss] David/Them turns), not the summary. A 90-minute meeting is ~60-90k characters: read it in windows (from_minute/to_minute, 20-30 minutes at a time) or use find to jump to a phrase. Use it when the summary does not carry what David needs: a candidate's answer to a specific question, exact wording, a number someone quoted. title matches the meeting like search_meetings; from/to (minutes) narrow the window; max_chars defaults to 30000. Say when the transcript is not available.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, day: { type: 'string', description: 'YYYY-MM-DD, optional' }, from_minute: { type: 'number' }, to_minute: { type: 'number' }, max_chars: { type: 'integer' }, find: { type: 'string', description: 'optional: return only turns containing this text, with a little context' } }, required: ['title'] },
  },
  {
    name: 'list_steps',
    description: "The steps of a Mythic Side Mission (what needs to happen to close this out), with done flags. Only a Mythic carries steps.",
    inputSchema: { type: 'object', properties: { title: { type: 'string', description: 'the Side Mission title' } }, required: ['title'] },
  },
  {
    name: 'add_step',
    description: "Only when David himself asks in this turn (David 11/9: nothing is created on his board, no objective, task, milestone, step, maintenance or project, unless he commissions that item himself; a suggestion is a message to him, never a row). Add a stop to a card's path: the thing that still has to happen between here and Polaris, shown on the card's End Of The Trail as a circle he clicks when it is done. Any Bounty or Contract holds five stops at most; on a Mythic this adds a milestone instead (five at most, 10 miles each, each a card of its own). text is the stop, short and observable: a decision marked, a conversation had, a thing produced. said is REQUIRED in practice: David's own words that asked for it, verbatim, so the card can show where the stop came from (David 11/11: the path is never guesswork; it comes out of the work with you, only from what he tells you). If you think something belongs on the path and he has not said so, ask him in one line and wait for his yes.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, text: { type: 'string' }, said: { type: 'string', description: "David's own words that asked for this stop, verbatim" } }, required: ['title', 'text'] },
  },
  {
    name: 'complete_step',
    description: "Mark a step of a Mythic done (or undone with done false). Matches the step by text (exact-then-contains).",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, step: { type: 'string' }, done: { type: 'boolean' } }, required: ['title', 'step'] },
  },
  {
    name: 'remove_step',
    description: 'Remove a step from a Mythic by text.',
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, step: { type: 'string' } }, required: ['title', 'step'] },
  },
  {
    name: 'close_out',
    description: "Close out a Side Mission the HUD's way. Before the final call, read the mission's North Star back to David and ask one question: 'Is it true? What's different now?' His answer is Achieved: pass it as `achieved`, in his words, never drafted. First call with just the title: it reports what the mission is carrying (artifacts, files, session boards, open steps). Carrying nothing: it releases at once (clock kept in the Ledger, linked task closed, miles on the next update) and files Achieved. Carrying something: it stops and asks; call again with file_away true (realm 'personal' | 'third-horizon') to file the content into the Archive and release, or discard true to release without filing. minutes and note as on move_objective.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, achieved: { type: 'string', description: "David's answer to 'Is it true? What's different now?', verbatim" }, file_away: { type: 'boolean' }, discard: { type: 'boolean' }, realm: { type: 'string' }, summary: { type: 'string', description: 'legacy; use achieved' }, minutes: { type: 'number' }, note: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'update_project_task',
    description: "Edit a Main Mission task matched by its text (exact-then-contains, refuses ambiguity): new_text to rewrite it as a milestone, due_date, notes (back story), status ('open' | 'blocked' | 'promoted'). Use when working through a mission's tasks with David.",
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, new_text: { type: 'string' }, due_date: { type: 'string' }, notes: { type: 'string' }, status: { type: 'string', enum: ['open', 'blocked', 'promoted'] } }, required: ['text'] },
  },
  {
    name: 'search_archive',
    description: "The Archive is David's master knowledge system: what Side Missions and Main Missions left behind when they closed (artifacts, decisions, session boards, files, summaries), plus things filed directly. Search it by text; optional realm ('personal' | 'third-horizon') and kind. Use it when David asks what was decided, what a past mission produced, or where something is.",
    inputSchema: { type: 'object', properties: { q: { type: 'string' }, realm: { type: 'string' }, kind: { type: 'string' }, limit: { type: 'number' } }, required: [] },
  },
  {
    name: 'file_to_archive',
    description: "File something into the Archive directly: a summary, a decision, a note. Give a title, the summary text, the realm ('personal' | 'third-horizon'), optional tags and an optional body (JSON). Use when David says to keep or file something, or at a close-out he asks you to write up.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, realm: { type: 'string' }, kind: { type: 'string', description: "summary | decision | note (default summary)" }, tags: { type: 'array', items: { type: 'string' } }, body: { type: 'object' }, source_title: { type: 'string' } }, required: ['title', 'summary'] },
  },
  {
    name: 'list_artifacts',
    description: "Artifacts a project carries in the HUD: structured work products (kind 'scorecard' today) that David reads and edits on the project page. Returns slugs; read_artifact for the content.",
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'project key or name' }, side_mission: { type: 'string', description: 'or a Side Mission title: its own artifacts' } }, required: [] },
  },
  {
    name: 'read_artifact',
    description: "Read a project artifact (JSON). A scorecard has candidate, interview_date, presentation {topic, notes, qa_notes, ratings, overall}, questions [{id, text, competency, panelist, mine, proposed, lumen_read, notes, rating}], competencies [{name, lumen_read, rating}], overall {recommendation, notes}. overall is { rating, strengths, concerns, probe, comments, recommendation (Strong Yes|Yes|No|Strong No), date_completed }. Yours to write: 'proposed' (his answer draft, mine questions only), 'lumen_read' on every question and competency (how the candidate's answer lines up with the competency being assessed, 3-6 sentences quoting what she said), presentation.lumen_read and presentation.notes. His language only, never yours: every 'notes', every 'rating', and 'overall'.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, side_mission: { type: 'string', description: 'or a Side Mission title' }, slug: { type: 'string', description: "e.g. 'scorecard-jeanne-alongi'" } }, required: ['slug'] },
  },
  {
    name: 'write_artifact',
    description: "Write an artifact (whole document) on a Main Mission (project) or a Side Mission (side_mission). Kinds the HUD renders: 'scorecard' (interview scorecards), 'decision' (a decision worked with David: question, options with numbers, an economics table, your read, his notes and verdict; lives on the standing mission 'Decisions'), and 'brief' (a design or work brief: { kind:'brief', title, summary, sections:[{heading, body (markdown)}], open_questions:[], for_claude:[] }; HUD design work goes on the mission 'Sovereign Architect HUD' as a brief David reviews and Claude builds from). To draft into an existing one, read_artifact first, change the fields you are filling (proposed answers, presentation notes, a competency rating you are suggesting), keep everything else, and write it back. To start a new scorecard for another candidate, copy the structure of an existing one with the new candidate and empty answers. The HUD shows the result on the project page under Artifacts.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, side_mission: { type: 'string', description: 'or a Side Mission title: the artifact lives on that Side Mission and files to the Archive with it' }, slug: { type: 'string' }, doc: { type: 'object', description: 'the full artifact JSON' } }, required: ['slug', 'doc'] },
  },
  {
    name: 'patch_artifact',
    description: "Update part of a project artifact without rewriting the whole document. patch is deep-merged into the stored JSON: top-level keys merge, questions and competencies are matched by id / name and merged item by item. Use it for one question at a time, e.g. { questions: [{ id: 'Q3', lumen_read: '...' }] } or { presentation: { lumen_read: '...' } }. Prefer this over write_artifact for drafting: several small patches in one turn beat one giant write.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, side_mission: { type: 'string' }, slug: { type: 'string' }, patch: { type: 'object' } }, required: ['slug', 'patch'] },
  },
  {
    name: 'fill_scorecard',
    description: "Port a finished scorecard artifact into Stephanie's actual Word template: boxes ticked, notes typed into the notes cells, competency grid marked, overall evaluation and recommendation filled, date completed. Saves next to the source (NACDD CEO Search/Round 2/Completed/) and sends it to David on WhatsApp when send is true. Returns the list of required fields still missing; if any are missing, tell David and do not call it final.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, slug: { type: 'string' }, send: { type: 'boolean' } }, required: ['project', 'slug'] },
  },
  {
    name: 'write_file',
    description: "Write a document. content is markdown-ish text: '# Title line', '## Section Heading', '### Sub-Heading', - bullets, 1. numbered lines, **bold**, 'Label: value' lines, and tables as consecutive '| Label | Value |' lines (<br> breaks a line inside a cell). path ends in .docx (a Word file, the default for anything he will forward), .md, or .txt. WHERE IT GOES: with side_mission or project it lands in that card's Files (path is then just the file name); without, it goes to the cabinet at path, next to its source, e.g. 'NACDD CEO Search/Round 2/Scorecard - Jeanne Alongi - David Smith.docx' (drafts under 'drafts/<day>/'). LETTERHEAD (.docx only): set letterhead to put the document on Third Horizon paper. It is either a registered letterhead by name (in the cabinet under Third Horizon/Templates/Letterheads, for example 'Job Description') or any existing Word file, by cabinet path or by its name on the card. The template's header, footer, logo, page setup and styles are kept exactly, and your content replaces its body in the template's own look (its title, section headings, sub-headings, body text, bullets and table), so follow the template's structure and section names; read_file it first. title fills the header where the template names the document; replace swaps other header or footer words ({ 'old words': 'new words' }). A wrong letterhead name returns the list of registered ones. Overwrites a file of the same name.",
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' }, side_mission: { type: 'string', description: 'put it in this card\'s Files' }, project: { type: 'string', description: 'put it in this Main Mission\'s Files' }, letterhead: { type: 'string', description: 'a registered letterhead name, or a Word file to use as the template' }, title: { type: 'string', description: 'the document title for the letterhead\'s header' }, replace: { type: 'object', description: 'header or footer words to swap, old: new' }, send: { type: 'boolean', description: 'true to also send it to David on WhatsApp now' }, caption: { type: 'string' } }, required: ['path', 'content'] },
  },
  {
    name: 'read_file',
    description: "Read a document as text (PDF, Word, Excel, PowerPoint, text): a file on a card, a Live File, or one in the cabinet. Use it to answer questions about what a document says. A file is named by path (from search_files, list_folder, or a card file's path) or by name (part of the file name: the card first when side_mission or project is given, then Live Files, then the cabinet). Spaces, underscores and case do not matter. For how a Word file looks (its letterhead, logo, header and footer), look_at_file.",
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, name: { type: 'string' }, side_mission: { type: 'string', description: 'the card to look on first' }, project: { type: 'string' }, max_chars: { type: 'integer', description: 'default 24000' } }, required: [] },
  },
  {
    name: 'read_attachment',
    description: 'Read an email attachment as text (PDF, Word, Excel, PowerPoint). message_id from search_mailbox; filename picks one attachment by (partial) name (spaces, underscores and case do not matter), otherwise the only or first file attachment.',
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' }, filename: { type: 'string' }, max_chars: { type: 'integer' } }, required: ['message_id'] },
  },
  {
    name: 'log_day',
    description: "Log something David did or is about to do today, for the River's badges. kind: 'discomfort' (he tells you he is about to do something consciously uncomfortable; three a day strike Discomforter), 'hygiene' (what: one of peptide-am, shower, brush-am, shave, brush-mid, whiten, peptide-pm, brush-pm; each is 0.25 miles, all eight strike Hygiene; put specifics like the peptide and dose in note; 'none today' for a peptide still counts), 'exercise' (value: minutes; 45 in a day strikes Exercise; each exercise of three sets in a Harvest-captured workout pays 1 mile on its own), 'sleep' (value: hours; 6 strikes Sleep), 'note' (a thought he wants kept in the day's record; what 'clip' for a clipping he shares, note = the quote or gist plus its source; what 'thought' for a passing thought, note = his words; both show on the Narrative page), 'devotional' (he opened the day with his morning devotional; note = anything he shared about it), 'activity' (something he did that no pipe sees: a call, a document, a decision; what 'slack-clean' when he says Slack is fully caught up, which strikes Clean Slack, 10 miles, at the close; what 'slack-unread' with value = the number when he tells you how many Slack messages are waiting, which sets the Slack light on the Board), 'medication' (what: the regimen key: vyvanse-am, vyvanse-pm, testosterone, nad, cjc-blend, selank, biweekly-5mg; 0.5 miles each; note = dose or anything he says), 'diet' (what he ate or a diet note). Log silently and confirm in a few words; never lecture.",
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['discomfort', 'hygiene', 'exercise', 'sleep', 'note', 'activity', 'medication', 'diet', 'devotional'] }, what: { type: 'string', description: 'short label of the thing' }, value: { type: 'number', description: 'minutes for exercise, hours for sleep' }, note: { type: 'string' }, day: { type: 'string', description: 'YYYY-MM-DD, default today (Chicago)' } }, required: ['kind'] },
  },
  {
    name: 'get_river',
    description: "The River: miles banked toward Calm Water (10,535), today's badges and miles, and what is still open to earn today (discomforts logged so far, hygiene items, exercise minutes, sleep).",
    inputSchema: { type: 'object', properties: { day: { type: 'string' } }, required: [] },
  },
  {
    name: 'add_maintenance',
    description: "Only when David himself asks in this turn (David 11/9: nothing is created on his board, no objective, task, milestone, step, maintenance or project, unless he commissions that item himself; a suggestion is a message to him, never a row). Add a maintenance item (the small recurring upkeep of a life: content, hygiene, exercise, other). Five done in a day strike a Maintenance Bundle.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, category: { type: 'string', enum: ['content', 'hygiene', 'exercise', 'other'] }, cadence: { type: 'string' } }, required: ['title', 'category'] },
  },
  {
    name: 'complete_maintenance',
    description: 'Mark an open maintenance item done today by matching its title (exact-then-contains).',
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'run_update',
    description: "Run the HUD's Update on David's word: reads every pipe, composes the day's narrative, strikes the River. Takes one to two minutes; call it and wait. Returns miles today, badges struck, and what was released. Use when he says 'run the update', 'update the board', 'refresh the day'.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'close_day',
    description: "Close a day on David's word: the final sweep, the Daily Report, the River struck with Clean Close eligible. Default target is yesterday if it is still open, otherwise today (only after 6 PM Chicago unless force is true). If the target is already closed, report that and do nothing. Takes a minute or two.",
    inputSchema: { type: 'object', properties: { day: { type: 'string', description: 'YYYY-MM-DD to close; default yesterday-if-open else today' }, force: { type: 'boolean', description: 'close today before 6 PM Chicago' } }, required: [] },
  },
  {
    name: 'meeting_attended',
    description: "Stamp a calendar meeting as attended (the green check on the Agenda). subject matches the calendar item by words; day defaults to today. Use when he says he was in a meeting, joined a call, or asks to mark one attended.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, day: { type: 'string' } }, required: ['subject'] },
  },
  {
    name: 'meeting_timer',
    description: "Start or stop the timer on a calendar meeting, or set its hours outright. Stop logs the span to Harvest as a completed entry; set writes the exact hours (default: the scheduled length) and fixes a forgotten or late toggle. Use when he says 'start the clock on X', 'call's over', 'I forgot the timer on CSOG, log it'.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, action: { type: 'string', enum: ['start', 'stop', 'set'] }, hours: { type: 'number', description: "for 'set': the exact hours the meeting should carry in Harvest (defaults to the scheduled length)" }, day: { type: 'string' } }, required: ['subject', 'action'] },
  },
  {
    name: 'close_meeting',
    description: "Follow-ups become Side Missions only when David dictated those lines himself at the close (David 11/9); never add ones you inferred from the notes. Close out a calendar meeting: stops a running timer, attaches the Granola notes, records follow-ups (each becomes a Side Mission in Follow Up, due a week out) and special notes. Use when he gives you follow-ups or notes from a meeting, or asks to close one out.",
    inputSchema: { type: 'object', properties: { cancelled_by: { type: 'string', description: "'them' or 'me' when the meeting was canceled: them credits the meeting, me does not" }, reason: { type: 'string', description: 'why it was canceled' }, subject: { type: 'string' }, follow_ups: { type: 'array', items: { type: 'string' } }, special_notes: { type: 'string' }, day: { type: 'string' } }, required: ['subject'] },
  },
  {
    name: 'set_due',
    description: "Change when a Side Mission is due or should be followed up: due_date and/or follow_up_date (YYYY-MM-DD). Matches the objective by title (exact-then-contains). Use when notes or David move a deadline.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, due_date: { type: 'string' }, follow_up_date: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'send_email',
    description: "Send an email from Lumen's own address (lumen@thirdhorizon.com). Recipients are limited to David's addresses for now. Use when he asks you to email him something: a draft, a summary, a document's text, a list too long for WhatsApp. For an email David will send to someone else, use draft_email: it lands in his own Outlook Drafts.",
    inputSchema: { type: 'object', properties: { to: { type: 'string', description: 'default david.smith@thirdhorizon.com' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['subject', 'body'] },
  },
  {
    name: 'draft_email',
    description: "Put an email in David's own Outlook Drafts, ready for him to read and send. It never sends: only David sends mail to other people. Use it whenever he asks for a draft, an email to someone, or to bring something into Outlook. to and cc take addresses ('Rich King <rich@example.com>, a@b.com'); find an address with search_mailbox when you only have a name, and leave to empty if you cannot find one. body is plain text exactly as it should read: no markdown, no asterisks, a blank line between paragraphs. Take the words from where David has been working on them (a Workbench tab, his own draft) and do not rewrite what he wrote. attachments is a list; each is { name } or { path } for a file on the card, in Live Files or in the cabinet, or { message_id, filename } for an attachment on an email. reply_to_message_id makes it a reply inside that thread, with body typed above the quoted message (reply_all for everyone on it). Returns a link that opens the draft: give it to him and say it is in Drafts, unsent.",
    inputSchema: { type: 'object', properties: { to: { type: 'string' }, cc: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, attachments: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string' }, message_id: { type: 'string' }, filename: { type: 'string' } } } }, reply_to_message_id: { type: 'string' }, reply_all: { type: 'boolean' }, side_mission: { type: 'string', description: 'the card whose files the attachment names are looked up on first' }, project: { type: 'string' } }, required: [] },
  },
  {
    name: 'update_meeting',
    description: "Change a calendar meeting on David's word: shorten or move it (new start and/or end, Chicago local time like '10:00' or '10:30'), or cancel it (David must be the organizer; otherwise decline). Use after he decides: 'keep it but cut to 30 minutes', 'push it to 2', 'cancel CSOG'. Confirm in one line with the new time.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, day: { type: 'string' }, start_time: { type: 'string', description: 'HH:MM Chicago' }, end_time: { type: 'string', description: 'HH:MM Chicago' }, cancel: { type: 'boolean' }, comment: { type: 'string' } }, required: ['subject'] },
  },
  {
    name: 'work_timer',
    description: "A timer for work that is not a calendar meeting: 'Personal Administration', 'APNC proposal', 'Hud Development'. start opens it, stop closes it and logs the span to Harvest, log writes hours directly. One running ad-hoc timer at a time. Use when he says 'throw up a timer for X' or 'log two hours on Y'.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, action: { type: 'string', enum: ['start', 'stop', 'log', 'status'] }, hours: { type: 'number', description: "for 'log'" } }, required: ['title', 'action'] },
  },
  {
    name: 'remember_rule',
    description: "Make something durable: a rule for how you behave, a preference of David's, or a fact worth keeping. It loads into every future turn under the constitution. Use when he says 'remember this', 'from now on', 'never again', or corrects you on something that will recur. Write it as one clear sentence in the imperative or as a plain fact.",
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, kind: { type: 'string', enum: ['rule', 'preference', 'fact'] } }, required: ['text'] },
  },
  {
    name: 'forget_rule',
    description: 'Retire a rule or fact by its id (from list_rules) or by matching text. Only on David\'s word.',
    inputSchema: { type: 'object', properties: { id: { type: 'integer' }, text: { type: 'string' } }, required: [] },
  },
  {
    name: 'list_rules',
    description: 'List the active rules, preferences, and facts David has given you, with ids.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'regimen',
    description: "The medication regimen for a day: what is due, what is taken, what is moved. Also moves a dose: action 'skip' (not due that day) or 'add' (due that day instead), with a note, when David and you reassign one (e.g. testosterone deferred from Friday to Monday).",
    inputSchema: { type: 'object', properties: { day: { type: 'string' }, action: { type: 'string', enum: ['status', 'skip', 'add', 'clear'] }, key: { type: 'string', enum: ['vyvanse-am', 'vyvanse-pm', 'testosterone', 'nad', 'cjc-blend', 'selank', 'zepbound'] }, note: { type: 'string' } }, required: [] },
  },
  {
    name: 'get_day',
    description: 'A finished day from the Day Library: the definitive Daily Report record plus its collection scorecard (miles, grade, badges, signal). Date format YYYY-MM-DD.',
    inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] },
  },
  {
    name: 'get_volume',
    description: "Full Sovereign Architect texts. volume='operating-manual' (Volume II, the functional frameworks) may be pulled whenever mechanics depth helps. volume='psyche-map' (Volume I) and volume='somatic' (Volume III) are deeply personal: retrieve ONLY when David explicitly asks for them by name in this conversation, never proactively. volume='psyche-codex' is the compact distillation of the psyche map (the rapids, the steel cable, the five requirements, the shadows) plus durable facts about David and his family; the fastest way to depth when a moment needs the exact framing.",
    inputSchema: { type: 'object', properties: { volume: { type: 'string', enum: ['operating-manual', 'psyche-map', 'somatic', 'psyche-codex'] } }, required: ['volume'] },
  },
  // ---- writes (the hands)
  {
    name: 'add_objective',
    description: "Only when David himself asks in this turn (David 11/9: nothing is created on his board, no objective, task, milestone, step, maintenance or project, unless he commissions that item himself; a suggestion is a message to him, never a row). Capture a new objective on David's board. Default state is 'inbox' (awaiting his triage); use 'active' only when he says to start it now, 'parked' for the queue, 'follow_up' with a follow_up_date when he wants to be nudged later, 'waiting' when the ball is in someone else's court. Never create duplicates of things already on the board: check get_objectives first when unsure.",
    inputSchema: { type: 'object', properties: {
      title: { type: 'string' },
      state: { type: 'string', enum: ['inbox', 'parked', 'active', 'follow_up', 'waiting'] },
      impromptu: { type: 'boolean', description: 'true when David posts something to the board on the fly to do now; pays 1 mile on release instead of 4. Default true when state is active and he did not plan it.' },
      size: { type: 'string', enum: ['light', 'medium', 'heavy'], description: 'light = Bounty (1 slot: a quick hit, an email, a call), medium = Contract (2 slots: a standard job, a couple of hours), heavy = Mythic (3 slots: several steps, up to five, the only type with steps). Bigger than that is a Main Mission, not a Side Mission. Default light. Ask David when it is not obvious.' },
      force: { type: 'boolean', description: 'Only when David explicitly overrides a full loadout. Otherwise the Loadout rules refuse and you ask him what to stash.' },
      due_date: { type: 'string', description: 'YYYY-MM-DD' },
      follow_up_date: { type: 'string', description: 'YYYY-MM-DD; required when state is follow_up' },
      description: { type: 'string' },
      north_star: { type: 'string', description: "The North Star: one sentence in David's own words answering 'What will be true, that wasn't true before?'. Ask him once at capture, write it from his words, read it back." },
      tags: { type: 'array', items: { type: 'string' }, description: "e.g. ['third-horizon','client'] or ['personal']" },
    }, required: ['title'] },
  },
  {
    name: 'move_objective',
    description: "Change an objective's state by title: 'released' marks it done (this is the completion action), 'active' plays it onto the board and starts its clock, 'parked' queues it, 'waiting' parks it on someone else, 'follow_up' parks it against a follow_up_date (default one week out), 'inbox' sends it back to triage. Title matching is exact-then-contains and refuses ambiguity.",
    inputSchema: { type: 'object', properties: {
      title: { type: 'string' },
      state: { type: 'string', enum: OBJ_STATES },
      follow_up_date: { type: 'string', description: 'YYYY-MM-DD, for follow_up' },
      due_date: { type: 'string', description: 'YYYY-MM-DD, to (re)set a due date' },
      minutes: { type: 'number', description: "On release only: the actual time of activity in minutes when David states it (\"took about an hour and a half\"). Otherwise the clocked minutes are used." },
      force: { type: 'boolean', description: 'Only when David explicitly overrides a full loadout on activation.' },
    }, required: ['title', 'state'] },
  },
  {
    name: 'add_project_task',
    description: 'Only when David himself asks in this turn (David 11/9: nothing is created on his board, no objective, task, milestone, step, maintenance or project, unless he commissions that item himself; a suggestion is a message to him, never a row). Add an open task to a project (by project key or name). Project tasks are the firm-level layer, distinct from personal Objectives.',
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'project key or name' }, text: { type: 'string' }, due_date: { type: 'string' } }, required: ['project', 'text'] },
  },
  {
    name: 'activate_project_task',
    description: "Play a project task onto David's Objectives board: creates the linked objective (the same bridge the Projects page uses, so releasing the objective closes the task) and, by default, makes it active with the board clock running. state 'parked' queues it instead. To de-activate, use move_objective on the objective (parked keeps the link; released closes the task).",
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'project key or name' }, text: { type: 'string', description: 'task text, exact-then-contains' }, state: { type: 'string', enum: ['active', 'parked'] }, size: { type: 'string', enum: ['light', 'medium', 'heavy'], description: 'Light (an hour or less), Medium (half day), Heavy (full day). Default light.' }, force: { type: 'boolean', description: 'Only when David explicitly overrides a full loadout.' } }, required: ['project', 'text'] },
  },
  {
    name: 'get_loadout',
    description: "The Loadout: what David carries right now. Slots used of 3 (a Bounty takes 1, a Contract 2, a Mythic 3), the equipped item (the one clock running) with minutes so far, every item on the board with its size and clocked minutes, and the day's hours (free before 6 PM Chicago after remaining meetings, and hours loaded; shown, not enforced). Read it before activating anything and whenever he asks what he is on or how much room he has.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'equip',
    description: "Run the clock on an item already on the board (by title) and holster every other clock. Exactly one clock runs at a time. Use it when David says he is starting on something, switching to something, or 'back on' something.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'holster',
    description: "Stop the clock on an item without releasing it (it stays loaded). Use it when David steps away, breaks, or says he is done for now but not finished.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'amend_day',
    description: "Amend a past day's time in one move: one block of hours under a title, logged to Harvest on THAT day and recorded as a session (no calendar event needed). Use when David says yesterday was really one long thing, or a meeting ran far longer than scheduled. Idempotent per day and title: calling again sets the hours, it does not add.",
    inputSchema: { type: 'object', properties: { day: { type: 'string', description: 'YYYY-MM-DD, Chicago' }, title: { type: 'string', description: "what the block was, e.g. 'DC / Internal Meetings · capital pathway'" }, hours: { type: 'number' }, note: { type: 'string' } }, required: ['day', 'title', 'hours'] },
  },
  {
    name: 'schedule_event',
    description: "Put a block on David's own calendar (no attendees): a trip, a meeting block, focus time. Only when he asks for it in so many words; read the subject, day and times back in the reply. Times are local to the place he will be (timezone, default America/Chicago).",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, start: { type: 'string', description: 'YYYY-MM-DDTHH:MM local' }, end: { type: 'string', description: 'YYYY-MM-DDTHH:MM local' }, timezone: { type: 'string', description: 'IANA, e.g. America/New_York; default America/Chicago' }, location: { type: 'string' }, body: { type: 'string', description: 'notes, plain text' }, all_day: { type: 'boolean' } }, required: ['subject', 'start', 'end'] },
  },
  {
    name: 'file_attachment',
    description: "File an email attachment onto a mission's page (its file cabinet) instead of, or as well as, sending it on WhatsApp. side_mission by title, or project by key or name. Returns the stored path.",
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' }, filename: { type: 'string', description: 'which attachment; omit when there is one' }, side_mission: { type: 'string' }, project: { type: 'string' } }, required: ['message_id'] },
  },
  {
    name: 'set_north_star',
    description: "Write or rewrite a mission's North Star: one sentence in David's own words answering 'What will be true, that wasn't true before?'. A Side Mission by title, or a Main Mission by project key or name (its description is its star). Ask him once, write it from his words, read it back, then save.",
    inputSchema: { type: 'object', properties: { title: { type: 'string', description: 'the Side Mission' }, project: { type: 'string', description: 'the Main Mission key or name, instead of title' }, text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'set_size',
    description: "Set a Side Mission's type by title: light = Bounty (1 slot, one discrete action under an hour, 4 miles), medium = Contract (2 slots, a standard piece of work with a deliverable, a couple of hours, 15 miles), heavy = Mythic (3 slots, several ordered steps done within days, the only type with steps, five at most, 50 miles plus 10 per step). Bigger than a Mythic is a Main Mission.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, size: { type: 'string', enum: ['light', 'medium', 'heavy'] } }, required: ['title', 'size'] },
  },
  {
    name: 'complete_project_task',
    description: 'Mark a project task done by matching its text (exact-then-contains, refuses ambiguity).',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'set_standing_order',
    description: "Record something David wants Lumen to watch for or do on a schedule (e.g. 'every Friday ask me about the pipeline', 'remind me the morning of Oct 5 about the TKF call'). cadence is free text; next_at is the first time it should fire (ISO timestamp, Chicago time if unspecified).",
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, cadence: { type: 'string' }, next_at: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'create_project',
    description: "Only when David himself asks in this turn (David 11/9: nothing is created on his board, no objective, task, milestone, step, maintenance or project, unless he commissions that item himself; a suggestion is a message to him, never a row). Create a project on the Projects layer (long-standing work with its own task list). Give it a key like 'Platform.Lumen' so the session board and Lumen can address it. category: client | third-horizon | personal | commercial-infra | q2-must | biz-dev | learning.",
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, key: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'delete_project',
    description: "Delete a Main Mission without miles, only on David's explicit word in this conversation (he must name it). The mission leaves every list; the River pays nothing; milestones already closed keep what they banked; its artifacts and cabinet stay in the Ledger. Open milestones' board items are removed from the Stash and the queue. Not for retiring finished work (that is the HUD's Mark mission complete).",
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'the exact mission name or key' } }, required: ['project'] },
  },
  {
    name: 'list_live_files',
    description: "Live Files (10/16): the files in play right now, newest first, each tied to a Loadout or Stash item, a Main Mission, or nothing yet. What a Claude session produced (livefile.py), what you filed (write_file, file_attachment), what David dropped on the Board. Use it for 'what files are live', 'where is the agenda', 'what do I have on X'. Optional side_mission or project narrows it.",
    inputSchema: { type: 'object', properties: { side_mission: { type: 'string' }, project: { type: 'string' } }, required: [] },
  },
  {
    name: 'look_at_file',
    description: "Look at a file with your own eyes: a sketch or markup David drew on the iPad Scratchpad (a PDF, one page per sheet), a photo, a PNG, a PDF deck or document, or a Word file. A file is named by path (from search_files, list_folder, or a card file's path) or by name (part of the file name: the card first when side_mission or project is given, then Live Files, then the cabinet). Spaces, underscores and case do not matter. 'sketch' or 'latest sketch' means the newest sketch. pages = which PDF pages to show, like '1-3' or '2' (default the first 5). A Word file comes back as what it carries: the words in its headers and footers, the shape of its body, and each embedded picture (a logo, a chart) placed in front of you with where it sits; use it before saying a document has no logo or letterhead. The file is placed in front of you in this same turn, after the tool result: then describe what you actually see (what is drawn, written, crossed out, the layout, the words) in David's plain language, the way you would describe a sketch handed across a table. Never answer from the file name alone.",
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, path: { type: 'string', description: 'a cabinet path or a card file path, instead of a name' }, side_mission: { type: 'string' }, project: { type: 'string' }, pages: { type: 'string' } }, required: [] },
  },
  {
    name: 'voice_candidates',
    description: "Make voices for David to hear, when he asks to try a new voice for you or for anything else. Two ways. A fresh design: description (20 to 1000 characters) says who is speaking (age, gender, accent, pitch, pace, character, recording quality) and ElevenLabs Voice Design makes up to three new candidate voices. A remix of a voice he already likes: give from_voice_id (a saved voice; keep_voice returns it) and make description the CHANGES he asked for, in plain words (older, more command, softer), and say what to keep; strength 0 to 1 is how far it may move from the original (default 0.35, a nudge). sample (100 to 1000 characters) is what the voice says: a few sentences you would really say to him, and the same sample across a comparison. Each candidate is kept in the cabinet under Lumen/Voice Candidates/<day>/ and sent to his WhatsApp as a voice note labeled with label and its number. Returns each candidate's generated_voice_id. Your own voice does not change.",
    inputSchema: { type: 'object', properties: { label: { type: 'string', description: 'a short name for this character, e.g. Old Master' }, description: { type: 'string' }, sample: { type: 'string' }, from_voice_id: { type: 'string', description: 'a saved voice to remix instead of designing a new one' }, strength: { type: 'number', description: 'remix only: 0 to 1, default 0.35' }, count: { type: 'integer', description: '1 to 3, default 3' }, send: { type: 'boolean', description: 'false to keep them in the cabinet without sending voice notes' } }, required: ['description', 'sample'] },
  },
  {
    name: 'keep_voice',
    description: "Save a voice David picked from voice_candidates to the ElevenLabs account by its generated_voice_id, with a name. Only when he says which one. Returns the voice_id. You do not speak in it until the voice setting is changed.",
    inputSchema: { type: 'object', properties: { generated_voice_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } }, required: ['generated_voice_id'] },
  },
  {
    name: 'fetch_url',
    description: "Read a web page (10/20): fetch a URL and return its text (title, headings, body, links kept as text), up to about 12k characters, with an optional find to jump to the part that matters. Use it for a conference agenda, a session description, a venue page, a news item, a document David points you at. Not for David's own mail or files (those have their own tools).",
    inputSchema: { type: 'object', properties: { url: { type: 'string' }, find: { type: 'string', description: 'a word or phrase; the excerpt centers on its first match' }, max_chars: { type: 'number' } }, required: ['url'] },
  },
  {
    name: 'web_search',
    description: "Search the web: up to 8 results (title, url, snippet), through treg since 11/13 (the result says via). Use it to find a conference site, an agenda, a person, a venue, a company, then fetch_url the best hit. Public questions only: never put David's private details, mail or file contents into a query. Say what you searched and read; never present a snippet as something David wrote.",
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'find_places',
    description: "Find businesses or places on Google Maps (11/13): give what and where in one query (\"convertible car rental Las Vegas NV\", \"coffee near Raleigh convention center\") and get up to 20 places with name, rating, review count, phone, address, website and a Maps link. Use it for any audit or shortlist of local businesses, a venue, a restaurant, a vendor. It is one source for a rating; when David asks for two sources, check the second with web_search and fetch_url and say which is which. A cell you could not fill stays blank and you say so. Each call costs a fraction of a cent from the treg balance.",
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, country: { type: 'string', description: 'two-letter country code, default us' }, limit: { type: 'number' } }, required: ['query'] },
  },
  {
    name: 'sent_proof',
    description: "Did the note go out? For a follow-up Bounty (\"Follow up with <Name> at <Org>\"), scan David's Sent Items since the item was captured for a message to that person (loose name match, or the org's initials in the recipient domain). Use it before closing such a Bounty, or when David says he sent it; close_out with the proof as achieved.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'list_standing_orders',
    description: 'The active standing orders Lumen is holding for David.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'workbench_tab',
    description: "Write a tab on a card's Workbench (a Main Mission by project, or a Side Mission or Milestone by side_mission). The Workbench is the card's working surface and it is made of tabs; this opens a tab David can type in and draw over, or rewrites one. Use it to put a plan, an outline, a draft, a table in words, or a working analysis onto the card where he can keep working it. title names the tab (the slug comes from it unless you pass slug); text is the tab's content (plain text, headings as lines). Writing an existing slug replaces its text and keeps David's drawing. The words to use with David (his canon, 11/10): it is a tab on the card's Workbench. Never say Workspace, and never say Workspace page.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, side_mission: { type: 'string' }, title: { type: 'string' }, slug: { type: 'string' }, text: { type: 'string' } }, required: ['title', 'text'] },
  },
  {
    name: 'read_workbench_tab',
    description: "Read a tab on a card's Workbench (by project or side_mission, and slug or title). Returns its text.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, side_mission: { type: 'string' }, slug: { type: 'string' } }, required: ['slug'] },
  },
  {
    name: 'build_page',
    description: "Build something David can use right away on a card: a prototype, a mock-up, a small tool, a calculator, a one-page view, a form, a chart. html is ONE complete self-contained HTML document (inline CSS and JS, no external files except Google Fonts; fetch nothing). Wear the HUD's canon: navy ground #0F2334, ink #F3F1EA, Lora for headings, Instrument Sans for labels and chrome, the accent oklch(0.82 0.109 248), gold #F8C761 only for small wayfinding. It shows as a tab on the card's Workbench and on the Lumen panel's Build tab, and a Claude session can port it into a real app later, so keep it clean and commented. slug names it (reuse a slug to revise). title is what David sees; note is one line on what it does. Say it is on the Build tab when it lands.",
    inputSchema: { type: 'object', properties: { project: { type: 'string' }, side_mission: { type: 'string' }, slug: { type: 'string' }, title: { type: 'string' }, html: { type: 'string' }, note: { type: 'string' } }, required: ['slug', 'title', 'html'] },
  },
]

// Web hands (10/20): a page reader and a keyless search, so "find it on their
// website" is something Lumen can do instead of decline.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36 Lumen/1.0'
const htmlToText = (html) => {
  let s = String(html)
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|section|article|header|footer|br|blockquote|dd|dt)>/gi, '\n').replace(/<(br|hr)\s*\/?>/gi, '\n')
  s = s.replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, txt) => `${txt.replace(/<[^>]+>/g, '')} (${href})`)
  s = s.replace(/<[^>]+>/g, ' ')
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&#(\d+);/g, (m, n) => String.fromCharCode(Number(n)))
  return s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}
async function fetchUrlText(url, { find = null, max = 12000 } = {}) {
  if (!/^https?:\/\//i.test(url)) throw new Error('url must start with http:// or https://')
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000)
  let res
  try { res = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5' }, redirect: 'follow', signal: ctrl.signal }) } finally { clearTimeout(timer) }
  const type = res.headers.get('content-type') || ''
  const raw = await res.text()
  const title = (raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.replace(/\s+/g, ' ').trim() || null
  let text = /html|xml/i.test(type) || /^\s*</.test(raw) ? htmlToText(raw) : raw
  const total = text.length
  if (find) { const at = text.toLowerCase().indexOf(String(find).toLowerCase()); if (at >= 0) text = text.slice(Math.max(0, at - Math.floor(max / 4))) }
  return { ok: res.ok, status: res.status, url: res.url || url, title, chars: total, truncated: text.length > max, text: text.slice(0, max) }
}
// treg (David 11/13: "set up treg"; the tool came from Topher): one prepaid token in front of a catalog of
// search and data providers, billed per call. Lumen uses it for public lookups only: the open web and places.
// Nothing of David's (mail, files, the Ledger) is ever sent through it. Each call carries a hard cost ceiling.
// The token is TREG_TOKEN in Vercel; without it these fall back or say so.
async function tregCall(id, { method = 'POST', body, query, maxCost = 0.02 } = {}) {
  const token = process.env.TREG_TOKEN
  if (!token) return { ok: false, status: 0, error: 'no TREG_TOKEN on this deployment' }
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const qs = query ? '?' + new URLSearchParams(query).toString() : ''
    const res = await fetch(`https://treg.to/call/${id}${qs}`, {
      method, signal: ctrl.signal,
      headers: { 'X-Treg-Token': token, 'X-Treg-Route-Max-Cost': String(maxCost), ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    const j = await res.json().catch(() => null)
    const cost_usd = Number(res.headers.get('x-treg-cost-micro') || 0) / 1e6
    if (!res.ok) return { ok: false, status: res.status, cost_usd, error: res.status === 402 ? 'the treg balance is empty, or the call would cost more than its ceiling; David tops up at treg.to' : String(j?.error || j?.detail || `treg -> ${res.status}`).slice(0, 200) }
    return { ok: true, status: res.status, data: j, cost_usd, served_by: res.headers.get('x-treg-served-by') || null }
  } finally { clearTimeout(timer) }
}

async function duckSearch(query) {
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000)
  let res
  try { res = await fetch('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), { headers: { 'user-agent': UA, accept: 'text/html' }, signal: ctrl.signal }) } finally { clearTimeout(timer) }
  const html = await res.text()
  const out = []
  const re = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>)?/gi
  let m
  while ((m = re.exec(html)) && out.length < 8) {
    let href = m[1]
    const uddg = href.match(/[?&]uddg=([^&]+)/); if (uddg) href = decodeURIComponent(uddg[1])
    if (href.startsWith('//')) href = 'https:' + href
    out.push({ title: htmlToText(m[2]), url: href, snippet: htmlToText(m[3] || '') })
  }
  return { ok: res.ok, status: res.status, query, results: out, via: 'duckduckgo' }
}
// The web search Lumen uses. treg first (11/13: the keyless DuckDuckGo scrape had been refused with a 403 from
// Vercel, so his research tabs came back empty); the old scrape only when treg is not set up or misses.
async function webSearch(query) {
  if (process.env.TREG_TOKEN) {
    try {
      const t = await tregCall('treg.web.search', { body: { q: query, limit: 8 } })
      const rows = t.ok ? (t.data?.output?.results || []) : []
      if (rows.length) return { ok: true, status: 200, query, via: `treg (${t.served_by || 'routed'})`, cost_usd: t.cost_usd, results: rows.slice(0, 8).map(r => ({ title: String(r.title || '').slice(0, 200), url: r.url || r.link || '', snippet: String(r.snippet || r.description || '').replace(/\s+/g, ' ').slice(0, 400) })) }
      if (!t.ok && t.status === 402) return { ok: false, status: 402, query, error: t.error, results: [] }
    } catch { /* fall through to the old search */ }
  }
  return duckSearch(query)
}
// Places (11/13, the car rental audit: "put the business name, rating (check two sources), contact info"):
// Google Maps businesses for what-and-where, with rating, review count, phone, address and website.
async function findPlaces(query, { country = 'us', limit = 12 } = {}) {
  const t = await tregCall('treg.google.serp.maps', { body: { q: query, country } })
  if (!t.ok) return { ok: false, query, error: t.error }
  const rows = t.data?.output?.places || []
  return {
    ok: true, query, source: 'Google Maps', via: `treg (${t.served_by || 'routed'})`, cost_usd: t.cost_usd, count: rows.length,
    // The routed tool answers from whichever provider is up, each in its own row shape, so read every known spelling.
    places: rows.slice(0, Math.min(Math.max(Number(limit) || 12, 1), 20)).map(r => {
      const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) ? null : Number(v)
      const isMaps = (u) => /google\.[a-z.]+\/maps|maps\.google\./i.test(String(u || ''))
      const site = r.website || (r.url && !isMaps(r.url) ? r.url : null) || (r.domain ? `https://${r.domain}` : null)
      const maps = (isMaps(r.url) ? r.url : null) || r.check_url || (r.place_id ? `https://www.google.com/maps/place/?q=place_id:${r.place_id}` : r.cid ? `https://maps.google.com/?cid=${r.cid}` : null)
      return {
        name: r.name || r.title || null,
        rating: num(typeof r.rating === 'object' && r.rating ? r.rating.value : r.rating),
        reviews: num(r.review_count ?? r.reviews_count ?? r.ratingCount ?? r.reviews ?? (typeof r.rating === 'object' && r.rating ? r.rating.votes_count : null)),
        phone: r.phone || r.phoneNumber || null, address: r.address || null, website: site, category: r.category || r.type || null, maps_url: maps,
      }
    }).filter(pl => pl.name),
  }
}

// Sent-mail proof (David 10/21, the Stacie case): a follow-up Bounty closes on the
// evidence that the note went out. Scan Sent Items since the item was captured and
// match the person loosely (first name with -ie/-ey/-y tolerance, last name, or the
// org's initials against the recipient's domain: "Advocates for Human Potential"
// -> ahp -> sgolonka@ahpnet.com).
const nameKey = (w) => String(w || '').toLowerCase().replace(/[^a-z]/g, '').replace(/(ie|ey|y|i|e)$/, '')
export async function sentProof(o) {
  const title = String(o.title || '')
  const m = title.match(/follow[- ]?up (?:with|to|on) ([^,.;:]+?)(?: at | from | of | @ )([^,.;:]+)?$/i) || title.match(/(?:email|note|write|reply|respond) (?:to )?([^,.;:]+?)(?: at | from | of )([^,.;:]+)?$/i)
  if (!m) return null
  const person = m[1].trim(), org = (m[2] || '').trim()
  const parts = person.split(/\s+/).filter(Boolean)
  const first = nameKey(parts[0]), last = parts.length > 1 ? nameKey(parts[parts.length - 1]) : null
  const orgInitials = org ? org.split(/\s+/).filter(w => !['of', 'for', 'the', 'and', '&', 'at'].includes(w.toLowerCase())).map(w => w[0]).join('').toLowerCase() : null
  const since = (o.captured_at || o.created_at || new Date(Date.now() - 7 * 864e5).toISOString()).slice(0, 19) + 'Z'
  const token = await graphToken()
  const qs = `$filter=sentDateTime ge ${since}&$select=id,subject,toRecipients,sentDateTime,bodyPreview&$orderby=sentDateTime desc&$top=50`
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/mailFolders/sentitems/messages?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`sent items -> ${res.status}`)
  for (const msg of (await res.json()).value || []) {
    const tos = (msg.toRecipients || []).map(r => ({ name: String(r.emailAddress?.name || ''), addr: String(r.emailAddress?.address || '').toLowerCase() }))
    const hay = `${msg.subject || ''} ${msg.bodyPreview || ''} ${tos.map(x => x.name).join(' ')}`.toLowerCase()
    const hayKeys = new Set(hay.replace(/[^a-z\s]/g, ' ').split(/\s+/).map(nameKey).filter(Boolean))
    const firstHit = first && hayKeys.has(first)
    const lastHit = last && (hayKeys.has(last) || tos.some(x => x.addr.includes(last)))
    const domainHit = orgInitials && orgInitials.length >= 2 && tos.some(x => x.addr.split('@')[1]?.startsWith(orgInitials))
    if ((firstHit && (lastHit || domainHit || !last)) || (lastHit && domainHit)) {
      return { subject: msg.subject, to: tos.map(x => x.addr).join(', '), at: msg.sentDateTime, message_id: msg.id, person, org }
    }
  }
  return null
}

export async function callTool(name, args = {}) {
  const TODAY = chiToday()
  switch (name) {
    case 'get_context': {
      const [doc, rows, reports] = await Promise.all([
        identityDoc('operating-context.md'),
        sb(`daily_performance?select=scorecard,summary,must_do&day=eq.${TODAY}&order=generated_at.desc&limit=1`),
        sb(`daily_performance?select=day,scorecard&model=eq.Daily%20Report&order=generated_at.desc&limit=30`),
      ])
      const sc = rows[0]?.scorecard || null
      const seen = new Set()
      let totalMiles = 0
      for (const r of reports) {
        if (r.scorecard?.miles != null && !seen.has(r.day)) { totalMiles += r.scorecard.miles; seen.add(r.day) }
      }
      const live = {
        today: TODAY,
        miles_today: sc?.miles ?? null,
        signal_today: sc?.signal?.score ?? null,
        badges_today: sc?.badges ?? [],
        follow_ups: sc?.follow_ups ?? [],
        must_do: rows[0]?.must_do ?? [],
        total_miles_downriver: Math.round(totalMiles * 10) / 10,
        days_collected: seen.size,
      }
      return `${doc}\n\n## Live game state (as of the last update)\n${JSON.stringify(live, null, 2)}`
    }
    case 'get_today': {
      const [rows, cal] = await Promise.all([
        sb(`daily_performance?select=generated_at,summary,scorecard,noteworthy,must_do,new_items,notes,source_counts&day=eq.${TODAY}&order=generated_at.desc&limit=1`),
        sb(`calendar_events?select=subject,start_at,end_at,organizer,attendees&day=eq.${TODAY}&is_cancelled=eq.false&order=start_at.asc`),
      ])
      const r = rows[0]
      if (!r) return JSON.stringify({ today: TODAY, note: 'No update composed yet today. Calendar below.', calendar: cal }, null, 2)
      const remaining = cal.filter(e => new Date(e.end_at).getTime() > Date.now())
      return JSON.stringify({ today: TODAY, as_of: r.generated_at, summary: r.summary, scorecard: r.scorecard, noteworthy: r.noteworthy, must_do: r.must_do, new_items: r.new_items, composer_notes: r.notes, calendar_remaining: remaining }, null, 2)
    }
    case 'get_calendar': {
      const from = String(args.from || TODAY).slice(0, 10)
      const d = new Date(from + 'T12:00:00'); d.setDate(d.getDate() + 14)
      const to = String(args.to || d.toISOString().slice(0, 10)).slice(0, 10)
      const rows = await sb(`calendar_events?select=day,subject,start_at,end_at,organizer,attendees,is_all_day&day=gte.${from}&day=lte.${to}&is_cancelled=eq.false&order=start_at.asc&limit=300`)
      const byDay = {}
      for (const e of rows) (byDay[e.day] ||= []).push({ subject: e.subject, start: e.start_at, end: e.end_at, all_day: e.is_all_day, organizer: e.organizer, attendees: (e.attendees || []).slice(0, 8) })
      return JSON.stringify({ from, to, timezone_note: 'times are UTC; Chicago is UTC-5 in September', days: byDay }, null, 2)
    }
    case 'get_objectives': {
      const os = (await sb(`objectives?select=*&deleted_at=is.null&parent_id=is.null&order=captured_at.desc`)).map(o => ({ id: o.id, title: o.title, state: o.state, due_date: o.due_date, follow_up_date: o.follow_up_date, is_anchor: o.is_anchor, is_emergency: o.is_emergency, released_at: o.released_at, released_kind: o.released_kind, who: o.who, tags: o.tags, ...(o.north_star ? { north_star: o.north_star } : {}) }))
      const grouped = { active: [], parked: [], waiting: [], follow_up: [], foreman: [], inbox: [], released_today: [] }
      for (const o of os) {
        if (o.state === 'released') {
          if (o.released_at && TODAY === chiDayOf(o.released_at)) grouped.released_today.push(o)
          continue
        }
        if (grouped[o.state]) grouped[o.state].push(o)
      }
      grouped.follow_up.sort((a, b) => String(a.follow_up_date || '9999').localeCompare(String(b.follow_up_date || '9999')))
      return JSON.stringify(grouped, null, 2)
    }
    case 'get_projects': {
      const [projects, tasks] = await Promise.all([
        sb(`projects?select=id,name,key,category,status,description&status=neq.deleted&order=name.asc`),
        sb(`project_tasks?select=project_id,text,status,source,due_date&status=neq.done`),
      ])
      const byId = new Map(projects.filter(p => p.status !== 'archived').map(p => [p.id, { ...p, open_tasks: [] }]))
      for (const t of tasks) byId.get(t.project_id)?.open_tasks.push({ text: t.text, status: t.status, source: t.source, due: t.due_date })
      return JSON.stringify([...byId.values()].filter(p => p.open_tasks.length || p.key), null, 2)
    }
    case 'search_meetings': {
      const q = esc(args.query || '')
      const limit = Math.min(args.limit || 5, 20)
      const ms = await sb(`granola_meetings?select=title,meeting_date,attendees,summary&or=(title.ilike.*${encodeURIComponent(q)}*,summary.ilike.*${encodeURIComponent(q)}*)&order=meeting_date.desc&limit=${limit}`)
      return JSON.stringify(ms.map(m => ({ ...m, summary: (m.summary || '').slice(0, 3000) })), null, 2)
    }
    case 'search_emails': {
      const q = esc(args.query || '')
      const days = Math.min(args.days || 14, 60)
      const since = new Date(Date.now() - days * 86400e3).toISOString()
      const es = await sb(`emails?select=folder,subject,from_name,to_names,received_at,preview,is_read&received_at=gte.${since}&or=(subject.ilike.*${encodeURIComponent(q)}*,from_name.ilike.*${encodeURIComponent(q)}*,preview.ilike.*${encodeURIComponent(q)}*)&order=received_at.desc&limit=25`)
      return JSON.stringify(es, null, 2)
    }
    case 'search_mailbox': {
      const token = await graphToken()
      const q = String(args.query || '').replace(/"/g, '').trim()
      const limit = Math.min(Number(args.limit) || 10, 25)
      const qs = `$search="${encodeURIComponent(q)}"&$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,hasAttachments,bodyPreview,parentFolderId&$top=${limit}`
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`mailbox search -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const folders = await graphFolders(token)
      const out = ((await res.json()).value || []).map(m => ({
        message_id: m.id, folder: folders[m.parentFolderId] || 'other', subject: m.subject || '(no subject)',
        from: (m.from || {}).emailAddress ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>` : null,
        to: (m.toRecipients || []).map(r => (r.emailAddress || {}).name || (r.emailAddress || {}).address).filter(Boolean),
        at: m.receivedDateTime || m.sentDateTime, has_attachments: !!m.hasAttachments, preview: (m.bodyPreview || '').slice(0, 300),
      }))
      return JSON.stringify(out, null, 2)
    }
    case 'read_email': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const h = { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' }
      const m = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,hasAttachments`, { headers: h })
      if (!m.ok) throw new Error(`read_email -> ${m.status}: ${(await m.text()).slice(0, 200)}`)
      const msg = await m.json()
      const atts = await mailAttachments(token, id)
      return JSON.stringify({
        message_id: msg.id, subject: msg.subject, from: (msg.from || {}).emailAddress || null,
        to: (msg.toRecipients || []).map(r => r.emailAddress), cc: (msg.ccRecipients || []).map(r => r.emailAddress),
        at: msg.receivedDateTime || msg.sentDateTime, body: String((msg.body || {}).content || '').slice(0, 12000),
        attachments: atts.map(a => ({ id: a.id, name: a.name, type: a.contentType, size: a.size })),
      }, null, 2)
    }
    case 'send_attachment': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const atts = await mailAttachments(token, id)
      if (!atts.length) return JSON.stringify({ ok: false, error: 'that message has no file attachments' })
      const want = String(args.filename || '').toLowerCase()
      const pick = pickAttachment(atts, want)
      if (!pick) return JSON.stringify({ ok: false, error: 'which one?', attachments: atts.map(a => a.name) })
      if (pick.size > 95 * 1024 * 1024) return JSON.stringify({ ok: false, error: `${pick.name} is too large for WhatsApp (${Math.round(pick.size / 1048576)} MB)` })
      const bin = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}/attachments/${encodeURIComponent(pick.id)}/$value`, { headers: { Authorization: `Bearer ${token}` } })
      if (!bin.ok) throw new Error(`attachment download -> ${bin.status}: ${(await bin.text()).slice(0, 200)}`)
      const bytes = new Uint8Array(await bin.arrayBuffer())
      const sent = await waSendDocument(davidNumber(), bytes, { filename: pick.name, mime: pick.contentType || 'application/octet-stream', caption: args.caption || '' })
      return JSON.stringify({ ok: true, sent: pick.name, size: pick.size, wa_message_id: sent || null })
    }
    case 'search_files': {
      // The cabinet and the cards together (11/10): "Chief Analytics" came back empty while the
      // file sat on two cards, because only the cabinet was searched.
      const q = String(args.query || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
      const max = Math.min(Number(args.limit) || 25, 100)
      const [all, live] = await Promise.all([
        listFiles(''),
        q.length ? sb(`live_files?select=name,bucket,path,size,note,objective_id,project_id,created_at&superseded_by=is.null&bucket=neq.link&bucket=neq.request&bucket=neq.files&name=ilike.${encodeURIComponent(nameLike(q.join(' ')))}&order=created_at.desc&limit=${max}`).catch(() => []) : [],
      ])
      const hay = (p) => p.toLowerCase().replace(/[^a-z0-9/]+/g, ' ')
      const hits = all.filter(f => q.every(w => hay(f.path).includes(w))).slice(0, max)
      const oids = [...new Set(live.map(r => r.objective_id).filter(Boolean))], pids = [...new Set(live.map(r => r.project_id).filter(Boolean))]
      const [os, ps] = await Promise.all([oids.length ? sb(`objectives?select=id,title&id=in.(${oids.join(',')})`).catch(() => []) : [], pids.length ? sb(`projects?select=id,name&id=in.(${pids.join(',')})`).catch(() => []) : []])
      const O = new Map(os.map(o => [o.id, o.title])), Pm = new Map(ps.map(x => [x.id, x.name]))
      const onCards = live.map(r => ({ name: r.name, on_card: r.objective_id ? O.get(r.objective_id) || null : Pm.get(r.project_id) || null, path: r.path, size: r.size, note: r.note, added: r.created_at }))
      if (!onCards.length) return JSON.stringify(hits, null, 2)
      return JSON.stringify({ cabinet: hits, on_cards: onCards, note: 'read_file, look_at_file, send_file, draft_email and write_file (as a letterhead) all take either a path from here or a name.' }, null, 2)
    }
    case 'list_folder': {
      const pre = String(args.path || '').replace(/^\/+|\/+$/g, '')
      const res = await fetch(`${URL_BASE}/storage/v1/object/list/files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: pre, limit: 500, sortBy: { column: 'name', order: 'asc' } }) })
      const rows = res.ok ? await res.json() : []
      return JSON.stringify({ path: pre || '(top)', folders: rows.filter(r => r.id === null).map(r => `${pre ? pre + '/' : ''}${r.name}`), files: rows.filter(r => r.id !== null && r.name !== '.keep').map(r => ({ path: `${pre ? pre + '/' : ''}${r.name}`, size: r.metadata?.size || 0, updated_at: r.updated_at })) })
    }
    case 'move_file': {
      const from = String(args.from || '').replace(/^\/+/, ''), to = String(args.to || '').replace(/^\/+/, '')
      if (!from || !to) throw new Error('from and to required')
      const res = await fetch(`${URL_BASE}/storage/v1/object/move`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ bucketId: 'files', sourceKey: from, destinationKey: to }) })
      if (!res.ok) throw new Error(`move -> ${res.status}: ${(await res.text()).slice(0, 160)}`)
      return JSON.stringify({ ok: true, from, to })
    }
    case 'make_folder': {
      const p = String(args.path || '').replace(/^\/+|\/+$/g, '')
      if (!p) throw new Error('path required')
      await putFile(`${p}/.keep`, new TextEncoder().encode(''), 'text/plain')
      return JSON.stringify({ ok: true, folder: p })
    }
    case 'delete_file': {
      const p = String(args.path || '').replace(/^\/+/, '')
      const res = await fetch(`${URL_BASE}/storage/v1/object/files/${p.split('/').map(encodeURIComponent).join('/')}`, { method: 'DELETE', headers: sbHeaders() })
      if (!res.ok) throw new Error(`delete -> ${res.status}`)
      return JSON.stringify({ ok: true, removed: p })
    }
    case 'send_file': {
      let f
      try { f = await resolveFile(args) } catch (e) { return JSON.stringify({ ok: false, error: e.message }) }
      const mime = f.mime || 'application/octet-stream'
      const bytes = new Uint8Array(f.bytes)
      if (bytes.length > 95 * 1024 * 1024) return JSON.stringify({ ok: false, error: 'too large for WhatsApp' })
      const filename = f.name
      const id = await waSendDocument(davidNumber(), bytes, { filename, mime, caption: args.caption || '' })
      return JSON.stringify({ ok: true, sent: filename, size: bytes.length, wa_message_id: id || null })
    }
    case 'get_transcript': {
      const q = esc(args.title || '')
      let ms = await sb(`granola_meetings?select=id,title,meeting_date&title=ilike.*${encodeURIComponent(q)}*${args.day ? `&meeting_date=eq.${args.day}` : ''}&order=meeting_date.desc&limit=5`)
      if (!ms.length) return JSON.stringify({ ok: false, error: `no meeting matches "${args.title}"` })
      const m = ms[0]
      const t = await granolaTranscript(m.id, { fromMin: args.from_minute != null ? Number(args.from_minute) : null, toMin: args.to_minute != null ? Number(args.to_minute) : null })
      if (!t.ok) return JSON.stringify({ ok: false, meeting: m.title, day: m.meeting_date, error: t.error })
      let text = t.text
      if (args.find) {
        const needle = String(args.find).toLowerCase()
        const turns = text.split('\n').filter(Boolean)
        const hits = []
        turns.forEach((line, i) => { if (line.toLowerCase().includes(needle)) hits.push(turns.slice(Math.max(0, i - 2), i + 4).join('\n')) })
        text = hits.length ? hits.join('\n...\n') : `(no turn contains "${args.find}")`
      }
      const max = Number(args.max_chars) || 30000
      return JSON.stringify({ ok: true, meeting: m.title, day: m.meeting_date, minutes: t.minutes, turns: t.turns, chars: t.text.length, truncated: text.length > max, note: text.length > max ? 'Truncated: narrow with from_minute/to_minute or find.' : undefined, transcript: text.slice(0, max) })
    }
    case 'list_steps': {
      const o = await findObjective(args.title)
      if (sizeOf(o) === 'heavy') {
        // A Mythic's milestones are objectives of their own (parent_id), each a card (David 10/29).
        const kids = await sb(`objectives?select=id,title,state,description,released_at,captured_at&parent_id=eq.${o.id}&deleted_at=is.null&order=captured_at.asc`).catch(() => [])
        return JSON.stringify({ ok: true, title: o.title, type: 'Mythic', milestones: kids.map((k, i) => ({ n: i + 1, title: k.title, done: k.state === 'released', done_when: k.description, closed_at: k.released_at })), max: 5, note: 'Mythic milestones, 10 miles each on close, five at most; each opens as a card in the HUD.' })
      }
      const steps = await sb(`objective_steps?select=id,text,done,done_at,position&objective_id=eq.${o.id}&order=position.asc,id.asc`).catch(() => [])
      return JSON.stringify({ ok: true, title: o.title, type: sizeOf(o) === 'heavy' ? 'Mythic' : sizeOf(o) === 'medium' ? 'Contract' : 'Bounty', steps, max: 5 })
    }
    case 'add_step': {
      const o = await findObjective(args.title)
      // Stops on the path (David 11/11): any card can carry them, five at most, and each keeps where it came from.
      // A Mythic's stops are its milestones, cards of their own, as before.
      const maxSteps = 5
      if (sizeOf(o) === 'heavy') {
        // Mythic milestone (David 10/29): an objective of its own under the Mythic, a card in the HUD.
        const kids = await sb(`objectives?select=id&parent_id=eq.${o.id}&deleted_at=is.null`).catch(() => [])
        if (kids.length >= 5) return JSON.stringify({ ok: false, error: 'five milestones is the limit for a Mythic; a sixth means this is a Main Mission (create_project and add_project_task).' })
        const tags = (o.tags || []).filter(t => t === 'personal' || t === 'third-horizon')
        const out = await sbWrite('POST', 'objectives', { user_id: DAVID, parent_id: o.id, title: String(args.text || '').trim().slice(0, 200), state: 'parked', kind: 'execution', effort: 2, importance: 2, needs_sizing: false, tags, captured_at: new Date().toISOString() })
        return JSON.stringify({ ok: true, title: o.title, milestone: out?.[0]?.title, n: kids.length + 1, max: 5, pays: '10 miles when closed; it opens as its own card on the Mythic in the HUD' })
      }
      const steps = await sb(`objective_steps?select=id&objective_id=eq.${o.id}`).catch(() => [])
      if (steps.length >= maxSteps) return JSON.stringify({ ok: false, error: 'five stops is the most a card holds. If this needs more, it is a Mythic with milestones; ask David whether to make it one (set_size heavy).' })
      const out = await sbWrite('POST', 'objective_steps', { objective_id: o.id, text: String(args.text || '').trim().slice(0, 300), position: steps.length })
      const said = String(args.said || '').trim().slice(0, 400)
      if (out?.[0]?.id != null) await notePathSource(o.id, out[0].id, said ? { by: 'david', where: 'lumen', quote: said } : { by: 'lumen', where: 'lumen' }).catch(e => console.warn('path source', e.message))
      return JSON.stringify({ ok: true, title: o.title, step: out?.[0], count: steps.length + 1, max: maxSteps, shows: 'on the card\'s End Of The Trail, with where it came from', pays: 'unpaid; the card pays on release' })
    }
    case 'complete_step':
    case 'remove_step': {
      const o = await findObjective(args.title)
      const q = esc(args.step || '')
      if (sizeOf(o) === 'heavy') {
        // Mythic milestones live on objectives (parent_id), David 10/29.
        let ks = await sb(`objectives?select=id,title,state&parent_id=eq.${o.id}&deleted_at=is.null&title=ilike.${encodeURIComponent(q)}`).catch(() => [])
        if (ks.length !== 1) ks = await sb(`objectives?select=id,title,state&parent_id=eq.${o.id}&deleted_at=is.null&title=ilike.*${encodeURIComponent(q)}*`).catch(() => [])
        if (ks.length !== 1) throw new Error(ks.length ? `milestone ambiguous: ${ks.map(k => k.title).join(' | ')}` : `no milestone matches "${args.step}" on ${o.title}`)
        if (name === 'remove_step') { await sbWrite('PATCH', `objectives?id=eq.${ks[0].id}`, { deleted_at: new Date().toISOString() }, 'return=minimal'); return JSON.stringify({ ok: true, removed: ks[0].title }) }
        const done = args.done !== false
        await sbWrite('PATCH', `objectives?id=eq.${ks[0].id}`, done ? { state: 'released', released_kind: 'done', released_at: new Date().toISOString(), activated_at: null } : { state: 'parked', released_kind: null, released_at: null }, 'return=minimal')
        return JSON.stringify({ ok: true, milestone: ks[0].title, done, note: done ? 'Mythic milestone closed: 10 miles on the next update (first five).' : 'reopened' })
      }
      let ms = await sb(`objective_steps?select=id,text,done&objective_id=eq.${o.id}&text=ilike.${encodeURIComponent(q)}`).catch(() => [])
      if (ms.length !== 1) ms = await sb(`objective_steps?select=id,text,done&objective_id=eq.${o.id}&text=ilike.*${encodeURIComponent(q)}*`).catch(() => [])
      if (ms.length !== 1) throw new Error(ms.length ? `step ambiguous: ${ms.map(m => m.text).join(' | ')}` : `no step matches "${args.step}" on ${o.title}`)
      if (name === 'remove_step') { await sbWrite('DELETE', `objective_steps?id=eq.${ms[0].id}`, null, 'return=minimal'); return JSON.stringify({ ok: true, removed: ms[0].text }) }
      const done = args.done !== false
      await sbWrite('PATCH', `objective_steps?id=eq.${ms[0].id}`, { done, done_at: done ? new Date().toISOString() : null }, 'return=minimal')
      return JSON.stringify({ ok: true, step: ms[0].text, done, note: done ? 'Mythic Task: 10 miles on the next update (first five steps).' : 'reopened' })
    }
    case 'close_out': {
      const o = await findObjective(args.title)
      const root = `objectives/${o.id}`
      const listDir = async (prefix) => { const r = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix, limit: 200 }) }); return r.ok ? (await r.json()).filter(f => f.id) : [] }
      const [arts, files, boards, steps] = await Promise.all([
        listDir(`${root}/artifacts`), listDir(`${root}/files`),
        sb(`session_boards?select=id,title,project,phases,board&order=updated_at.desc&limit=60`).catch(() => []),
        sb(`objective_steps?select=id,text,done&objective_id=eq.${o.id}`).catch(() => []),
      ])
      const myBoards = boards.filter(b => (b.board && b.board.objective_id === o.id) || (b.phases || []).some(ph => (ph.tasks || []).some(t => t.objective_id === o.id)))
      const inventory = { artifacts: arts.map(f => f.name.replace(/\.json$/, '')), files: files.map(f => f.name), boards: myBoards.map(b => b.title), open_steps: steps.filter(st => !st.done).map(st => st.text) }
      const carrying = arts.length + files.length + myBoards.length > 0
      if (carrying && !args.file_away && !args.discard) return JSON.stringify({ ok: false, carrying: true, inventory, note: 'This Side Mission is carrying content. Ask David: file it to the Archive (call again with file_away true, realm, and a two-sentence summary) or close without filing (discard true).' })
      const filed = []
      const realm = args.realm === 'personal' ? 'personal' : ((o.tags || []).includes('personal') ? 'personal' : 'third-horizon')
      const base = { realm, source_kind: 'objective', source_id: o.id, source_title: o.title, tags: (o.tags || []).filter(t => !['personal', 'third-horizon'].includes(t)), filed_by: 'lumen' }
      // Achieved (David, 10/16): his answer to "Is it true? What's different now?", filed on every close, carrying or not; the yay page reads it under the star.
      const achievedText = String(args.achieved || args.summary || '').trim()
      if (achievedText) filed.push(await sbWrite('POST', 'archive_entries', { ...base, kind: 'summary', title: o.title, summary: achievedText.slice(0, 4000), body: { achieved: achievedText.slice(0, 4000), north_star: o.north_star || null, steps: steps.map(st => ({ text: st.text, done: st.done })) } }))
      if (carrying && args.file_away) {
        for (const f of arts) { const d = await readArtifact(root, f.name.replace(/\.json$/, '')).catch(() => null); filed.push(await sbWrite('POST', 'archive_entries', { ...base, kind: d?.kind === 'decision' ? 'decision' : 'artifact', title: d?.title || f.name, summary: d?.question || d?.summary || null, body: d, bucket: 'project-files', path: `${root}/artifacts/${f.name}` })) }
        for (const f of files) filed.push(await sbWrite('POST', 'archive_entries', { ...base, kind: 'file', title: f.name, bucket: 'project-files', path: `${root}/files/${f.name}` }))
        for (const b of myBoards) { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); filed.push(await sbWrite('POST', 'archive_entries', { ...base, kind: 'board', title: b.title, summary: `${ts.filter(t => t.status === 'done').length}/${ts.length} done · ${b.project}`, body: { phases: b.phases } })) }
      }
      const released = JSON.parse(await callTool('move_objective', { title: o.title, state: 'released', minutes: args.minutes, note: [args.note, filed.length ? `filed ${filed.length} to the Archive` : null].filter(Boolean).join(' · ') || undefined }))
      return JSON.stringify({ ok: true, released, filed: filed.length, inventory, type: sizeOf(o) === 'heavy' ? 'Mythic (50 miles)' : sizeOf(o) === 'medium' ? 'Contract (15 miles)' : (o.tags || []).includes('impromptu') ? 'Ad Hoc (1 mile)' : 'Bounty (4 miles)' })
    }
    case 'update_project_task': {
      const q = esc(args.text || '')
      let ts = await sb(`project_tasks?select=id,text,status,project_id&status=neq.done&text=ilike.${encodeURIComponent(q)}&limit=5`)
      if (ts.length !== 1) ts = await sb(`project_tasks?select=id,text,status,project_id&status=neq.done&text=ilike.*${encodeURIComponent(q)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `task ambiguous: ${ts.map(t => t.text).join(' | ')}` : `no open task matches "${args.text}"`)
      const patch = {}
      if (args.new_text) patch.text = String(args.new_text).slice(0, 400)
      if (args.due_date !== undefined) patch.due_date = args.due_date || null
      if (args.notes !== undefined) patch.notes = args.notes
      if (args.status) patch.status = args.status
      if (!Object.keys(patch).length) throw new Error('nothing to change')
      await sbWrite('PATCH', `project_tasks?id=eq.${ts[0].id}`, patch, 'return=minimal')
      return JSON.stringify({ ok: true, was: ts[0].text, now: { ...ts[0], ...patch } })
    }
    case 'search_archive': {
      const q = String(args.q || '').trim()
      let path = `archive_entries?select=id,kind,title,summary,realm,tags,source_kind,source_title,filed_at,path&order=filed_at.desc&limit=${Math.min(50, Number(args.limit) || 20)}`
      if (args.realm) path += `&realm=eq.${encodeURIComponent(args.realm)}`
      if (args.kind) path += `&kind=eq.${encodeURIComponent(args.kind)}`
      // Every word must land somewhere (title, summary or source), so
      // "Danbury Greg" finds what "Greg" finds.
      const words = q.split(/\s+/).filter(Boolean).slice(0, 6)
      if (words.length) path += `&and=(${words.map(w => { const e = encodeURIComponent(w.replace(/[(),.*]/g, '')); return `or(title.ilike.*${e}*,summary.ilike.*${e}*,source_title.ilike.*${e}*)` }).join(',')})`
      try { return JSON.stringify({ ok: true, entries: await sb(path) }) } catch (e) { return JSON.stringify({ ok: false, error: `the Archive is not set up yet (${String(e.message).slice(0, 80)})` }) }
    }
    case 'file_to_archive': {
      const row = { kind: ['summary', 'decision', 'note'].includes(args.kind) ? args.kind : 'summary', title: String(args.title).slice(0, 200), summary: String(args.summary).slice(0, 4000), realm: args.realm === 'personal' ? 'personal' : 'third-horizon', tags: Array.isArray(args.tags) ? args.tags.slice(0, 12) : [], source_kind: 'lumen', source_title: args.source_title || null, body: args.body || null, filed_by: 'lumen' }
      try { const out = await sbWrite('POST', 'archive_entries', row); return JSON.stringify({ ok: true, entry: out?.[0] || row }) } catch (e) { return JSON.stringify({ ok: false, error: `the Archive is not set up yet (${String(e.message).slice(0, 80)})` }) }
    }
    case 'list_artifacts': {
      const pr = await resolveRoot(args)
      return JSON.stringify({ project: pr.name, artifacts: await listArtifacts(pr.id) })
    }
    case 'read_artifact': {
      const pr = await resolveRoot(args)
      const doc = await readArtifact(pr.id, args.slug)
      if (!doc) return JSON.stringify({ ok: false, error: `no artifact ${args.slug} on ${pr.name}`, artifacts: await listArtifacts(pr.id) })
      return JSON.stringify({ ok: true, project: pr.name, slug: args.slug, doc })
    }
    case 'workbench_tab':
    case 'workspace_page': {   // the old name still answers (renamed 11/10: Workbench tabs, David's canon)
      const pr = await resolveRoot(args)
      const slug = slugOf(args.slug || args.title)
      const path = `${pr.id}/workspace/${slug}.json`
      const cur = await getStorageJson(path)
      const now = new Date().toISOString()
      const doc = { v: 1, kind: 'workspace-page', title: String(args.title || cur?.title || slug).trim(), text: String(args.text || ''), strokes: Array.isArray(cur?.strokes) ? cur.strokes : [], height: cur?.height || 720, created_at: cur?.created_at || now, updated_at: now, updated_by: 'lumen' }
      await putStorage(path, JSON.stringify(doc), 'application/json')
      return JSON.stringify({ ok: true, on: pr.name, slug, title: doc.title, replaced: !!cur, note: `On the card's Workbench, as the tab named "${doc.title}". Call it a tab on the Workbench.` })
    }
    case 'read_workbench_tab':
    case 'read_workspace_page': {
      const pr = await resolveRoot(args)
      const doc = await getStorageJson(`${pr.id}/workspace/${slugOf(args.slug)}.json`)
      if (!doc) return JSON.stringify({ ok: false, error: `no Workbench tab ${args.slug} on ${pr.name}` })
      return JSON.stringify({ ok: true, title: doc.title, updated_at: doc.updated_at, updated_by: doc.updated_by, text: String(doc.text || '').slice(0, 20000) })
    }
    case 'build_page': {
      const pr = await resolveRoot(args)
      const slug = slugOf(args.slug || args.title)
      const html = String(args.html || '')
      if (!/<html|<!doctype/i.test(html)) throw new Error('html must be a complete document (doctype and <html>)')
      const prior = await getStorageJson(`${pr.id}/build/${slug}.json`)
      const now = new Date().toISOString()
      await putStorage(`${pr.id}/build/${slug}.html`, html, 'text/html; charset=utf-8')
      const meta = { v: 1, kind: 'build', slug, title: String(args.title || slug), note: String(args.note || prior?.note || ''), bytes: html.length, version: (prior?.version || 0) + 1, created_at: prior?.created_at || now, updated_at: now, updated_by: 'lumen' }
      await putStorage(`${pr.id}/build/${slug}.json`, JSON.stringify(meta), 'application/json')
      return JSON.stringify({ ok: true, on: pr.name, slug, title: meta.title, version: meta.version, note: `On the card's Workbench, as the tab named "${meta.title}", and on the Lumen panel's Build tab.` })
    }
    case 'write_artifact': {
      const pr = await resolveRoot(args)
      if (!args.doc || typeof args.doc !== 'object') throw new Error('doc (object) required')
      const path = await writeArtifact(pr.id, args.slug, { ...args.doc, updated_by: 'lumen' })
      return JSON.stringify({ ok: true, project: pr.name, slug: args.slug, path, note: 'David sees it on the project page under Artifacts.' })
    }
    case 'patch_artifact': {
      const pr = await resolveRoot(args)
      const cur = await readArtifact(pr.id, args.slug)
      if (!cur) return JSON.stringify({ ok: false, error: `no artifact ${args.slug} on ${pr.name}` })
      if (!args.patch || typeof args.patch !== 'object') throw new Error('patch (object) required')
      const merged = mergeArtifact(cur, args.patch)
      const path = await writeArtifact(pr.id, args.slug, { ...merged, updated_by: 'lumen' })
      const touched = Object.keys(args.patch).map(k => Array.isArray(args.patch[k]) ? `${k}[${args.patch[k].map(x => x.id || x.name).join(',')}]` : k)
      return JSON.stringify({ ok: true, project: pr.name, slug: args.slug, path, touched })
    }
    case 'fill_scorecard': {
      const pr = await findProject(args.project)
      const doc = await readArtifact(pr.id, args.slug)
      if (!doc) return JSON.stringify({ ok: false, error: `no artifact ${args.slug} on ${pr.name}` })
      const tplPath = String(doc.template_path || 'NACDD CEO Search/Round 2/NACDD_CEO_Round2_Scorecard_Template_09.15.26.docx')
      const tres = await fetch(`${URL_BASE}/storage/v1/object/files/${tplPath.split('/').map(encodeURIComponent).join('/')}`, { headers: sbHeaders() })
      if (!tres.ok) return JSON.stringify({ ok: false, error: `template not found in the file store: ${tplPath}` })
      const { bytes, missing } = await fillScorecard(new Uint8Array(await tres.arrayBuffer()), doc)
      const who = String(doc.candidate || args.slug).replace(/^Dr\.?\s*/i, '').replace(/[^A-Za-z0-9 .-]+/g, '').trim()
      const outPath = `${tplPath.split('/').slice(0, -1).join('/')}/Completed/Scorecard - ${who} - ${doc.interviewer || 'David Smith'}${missing.length ? ' (DRAFT)' : ''}.docx`
      await putFile(outPath, bytes, DOCX_MIME)
      let wa = null
      if (args.send) { try { wa = await waSendDocument(davidNumber(), bytes, { filename: outPath.split('/').pop(), mime: DOCX_MIME, caption: missing.length ? `Draft: ${missing.length} required field${missing.length === 1 ? '' : 's'} still empty` : 'Final scorecard, ready to forward' }) } catch (e) { wa = `send failed: ${e.message}` } }
      return JSON.stringify({ ok: true, path: outPath, bytes: bytes.length, missing, final: missing.length === 0, ...(args.send ? { sent: wa } : {}) })
    }
    case 'write_file': {
      const raw = String(args.path || '').replace(/^\/+/, '').trim()
      if (!raw || !args.content) throw new Error('path and content required')
      const ext = (raw.split('.').pop() || '').toLowerCase()
      let bytes, mime, letterhead = null
      if (ext === 'docx') {
        if (args.letterhead) {
          // On a letterhead (David 11/10): the template's header, footer, logo and styles stay; the body is typed in its look.
          const tpl = await findLetterhead(String(args.letterhead), args)
          const made = await letterheadDocx(tpl.bytes, args.content, { title: args.title || '', date: chiToday(), replace: args.replace && typeof args.replace === 'object' ? args.replace : {} })
          bytes = made.bytes
          const missing = Object.entries(made.look).filter(([, v]) => !v).map(([k]) => k)
          letterhead = { name: tpl.label, registered: tpl.registered, ...(missing.length ? { plain_fallback_for: missing } : {}) }
        } else bytes = await markdownToDocx(args.content)
        mime = DOCX_MIME
      } else if (ext === 'md' || ext === 'txt') { bytes = new TextEncoder().encode(String(args.content)); mime = ext === 'md' ? 'text/markdown' : 'text/plain' }
      else throw new Error('path must end in .docx, .md, or .txt')
      const fname = raw.split('/').pop()
      const note = args.caption || (letterhead ? `On the ${letterhead.name} letterhead` : null)
      // On a card when a card is named (11/10: the cleaned job description went to the cabinet and
      // WhatsApp while David sat on the card); in the cabinet otherwise.
      const card = await cardScope(args)
      let path = raw, where
      if (card) {
        path = `${card.files}/${fname.replace(/[^A-Za-z0-9._ -]/g, '_')}`
        const up = await fetch(`${URL_BASE}/storage/v1/object/project-files/${encPath(path)}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': mime, 'x-upsert': 'true' }, body: Buffer.from(bytes) })
        if (!up.ok) throw new Error(`file upload -> ${up.status}: ${(await up.text()).slice(0, 160)}`)
        await indexLiveFile({ name: path.split('/').pop(), bucket: 'project-files', path, size: bytes.length, mime, objective_id: card.objective_id, project_id: card.project_id, note })
        where = `in the Files of "${card.title}"`
      } else {
        await putFile(path, bytes, mime)
        await indexLiveFile({ name: fname, bucket: 'files', path, size: bytes.length, mime, note })
        where = 'in the file cabinet'
      }
      let wa = null
      if (args.send) { try { wa = await waSendDocument(davidNumber(), bytes, { filename: fname, mime, caption: args.caption || '' }) } catch (e) { wa = `send failed: ${e.message}` } }
      return JSON.stringify({ ok: true, name: path.split('/').pop(), path, where, bytes: bytes.length, format: ext, ...(letterhead ? { letterhead } : {}), ...(args.send ? { sent: wa } : {}), note: 'David forwards finished documents himself. To put it in front of him in Outlook, draft_email with this name or path as an attachment.' })
    }
    case 'read_file': {
      let f
      try { f = await resolveFile(args) } catch (e) { return JSON.stringify({ ok: false, error: e.message }) }
      const path = f.path
      const doc = await extractText(new Uint8Array(f.bytes), f.name, f.mime || '')
      return JSON.stringify({ ok: true, name: f.name, path, kind: doc.kind, pages: doc.pages, sheets: doc.sheets, slides: doc.slides, note: doc.note, text: clip(doc.text, Number(args.max_chars) || 24000) })
    }
    case 'read_attachment': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const atts = await mailAttachments(token, id)
      if (!atts.length) return JSON.stringify({ ok: false, error: 'that message has no file attachments' })
      const want = String(args.filename || '').toLowerCase()
      const pick = pickAttachment(atts, want)
      if (!pick) return JSON.stringify({ ok: false, error: 'which one?', attachments: atts.map(a => a.name) })
      const bin = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}/attachments/${encodeURIComponent(pick.id)}/$value`, { headers: { Authorization: `Bearer ${token}` } })
      if (!bin.ok) throw new Error(`attachment download -> ${bin.status}`)
      const doc = await extractText(new Uint8Array(await bin.arrayBuffer()), pick.name, pick.contentType || '')
      return JSON.stringify({ ok: true, name: pick.name, kind: doc.kind, pages: doc.pages, note: doc.note, text: clip(doc.text, Number(args.max_chars) || 24000) })
    }
    case 'log_day': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const row = { day, kind: args.kind, what: args.what ? String(args.what).slice(0, 200) : null, value: args.value != null ? Number(args.value) : null, note: args.note ? String(args.note).slice(0, 2000) : null, source: 'lumen' }
      const out = await sbWrite('POST', 'daily_logs', row)
      const counts = await sb(`daily_logs?select=kind&day=eq.${day}`)
      const n = counts.filter(c => c.kind === args.kind).length
      return JSON.stringify({ ok: true, logged: out?.[0] || row, count_today_for_kind: n })
    }
    case 'get_river': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const [all, today, logs, harvest, workouts] = await Promise.all([
        sb(`miles_ledger?select=miles`), sb(`miles_ledger?select=badge,miles,evidence&day=eq.${day}&order=id.asc`), sb(`daily_logs?select=kind,what,value,at,note,source&day=eq.${day}&order=at.asc`),
        sb(`time_entries?select=hours&spent_date=eq.${day}&person=ilike.David*`).catch(() => []), sb(`workouts?select=minutes&day=eq.${day}`).catch(() => []),
      ])
      // Time on pursuits: Third Horizon hours (Harvest) + personal Side Mission clocks + exercise.
      const h2 = (x) => Math.round(x * 100) / 100
      const thsH = harvest.reduce((s, r) => s + (Number(r.hours) || 0), 0)
      const clocks = logs.filter(l => l.kind === 'activity' && (String(l.source || '').startsWith('objective:') || String(l.source || '').startsWith('timer:')))
      const personalH = clocks.filter(l => /^personal/.test(l.note || '')).reduce((s, l) => s + (Number(l.value) || 0), 0) / 60
      const workClockH = clocks.filter(l => !/^personal/.test(l.note || '')).reduce((s, l) => s + (Number(l.value) || 0), 0) / 60
      const exerciseH = workouts.reduce((s, r) => s + (Number(r.minutes) || 0), 0) / 60
      const pursuitsH = thsH + personalH + workClockH + exerciseH
      const time_today = { pursuits_hours: h2(pursuitsH), third_horizon_hours: h2(thsH), third_horizon_share: pursuitsH ? Math.round(thsH / pursuitsH * 100) : 0, personal_hours: h2(personalH), side_mission_work_hours: h2(workClockH), exercise_hours: h2(exerciseH), rule: 'Harvest = Third Horizon work only. Personal Side Missions keep their clock in the Ledger (activity log), never Harvest.' }
      const total = Math.round(all.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100
      const byKind = (k) => logs.filter(l => l.kind === k)
      return JSON.stringify({
        day, miles_total: total, miles_remaining: Math.round((10535 - total) * 100) / 100, miles_today: Math.round(today.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100,
        time_today, badges_today: today, open_today: {
          discomforts_logged: byKind('discomfort').length, discomforts_needed: 3,
          hygiene_logged: byKind('hygiene').map(l => l.what), hygiene_needed: ['brush x3', 'shower', 'whiten'],
          exercise_minutes: byKind('exercise').reduce((s, l) => s + (Number(l.value) || 0), 0), exercise_needed: 45,
          sleep_hours: Math.max(0, ...byKind('sleep').map(l => Number(l.value) || 0)), sleep_needed: 6,
        },
      }, null, 2)
    }
    case 'add_maintenance': {
      const out = await sbWrite('POST', 'maintenance_items', { title: String(args.title || '').trim(), category: args.category || 'other', cadence: args.cadence || null, status: 'open' })
      return JSON.stringify({ ok: true, item: out?.[0] })
    }
    case 'complete_maintenance': {
      const q = esc(args.title || '')
      let ts = await sb(`maintenance_items?select=id,title&status=eq.open&title=ilike.${encodeURIComponent(q)}&limit=5`)
      if (ts.length !== 1) ts = await sb(`maintenance_items?select=id,title&status=eq.open&title=ilike.*${encodeURIComponent(q)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `ambiguous: ${ts.map(t => t.title).join(' | ')}` : `no open maintenance item matches "${args.title}"`)
      await sbWrite('PATCH', `maintenance_items?id=eq.${ts[0].id}`, { status: 'done', day: chiToday(), done_at: new Date().toISOString() }, 'return=minimal')
      return JSON.stringify({ ok: true, completed: ts[0].title })
    }
    case 'run_update':
    case 'close_day': {
      const base = process.env.HUD_BASE || 'https://sa-hud.vercel.app'
      const path = name === 'close_day' ? '/api/close' : '/api/refresh'
      let body
      if (name === 'close_day') {
        const today = chiToday()
        const yday = new Date(new Date(`${today}T12:00:00`).getTime() - 86400e3).toISOString().slice(0, 10)
        const hourChi = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date()))
        const closed = async (d) => (await sb(`daily_performance?select=id&day=eq.${d}&model=eq.Daily%20Report&limit=1`)).length > 0
        let target = String(args.day || '').match(/^\d{4}-\d{2}-\d{2}$/) ? args.day : (await closed(yday) ? today : yday)
        if (await closed(target)) return JSON.stringify({ ok: true, day: target, already_closed: true, note: `${target} is already closed and canon; nothing to do` })
        if (target === today && hourChi < 18 && !args.force) return JSON.stringify({ ok: false, day: today, error: 'today is still open; closing before 6 PM Chicago needs force=true. Say so to David and let him decide.' })
        body = JSON.stringify({ day: target })
      }
      const r = await fetch(`${base}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CRON_SECRET}`, 'Content-Type': 'application/json' }, body })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) return JSON.stringify({ ok: false, error: j.error || `HTTP ${r.status}` })
      return JSON.stringify({ ok: true, day: j.day, miles_today: j.miles, badges: j.badges || [], badge_evidence: j.badge_evidence || {}, river_total: j.river_total ?? j.total, released_today: j.released_today || [], closed: name === 'close_day' }, null, 2)
    }
    case 'meeting_attended':
    case 'meeting_timer':
    case 'close_meeting': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const ev = await findEvent(day, args.subject)
      if (!ev) return JSON.stringify({ ok: false, error: `no calendar meeting on ${day} matches "${args.subject}"` })
      const cur = (await sb(`meeting_sessions?select=*&event_id=eq.${encodeURIComponent(ev.id)}&limit=1`))[0] || null
      const now = new Date().toISOString()
      const base = { event_id: ev.id, day, subject: ev.subject, attended_at: cur?.attended_at || now }
      if (name === 'meeting_attended') {
        await putSession(cur, base)
        return JSON.stringify({ ok: true, attended: ev.subject, day })
      }
      if (name === 'meeting_timer') {
        if (args.action === 'start') {
          if (cur?.started_at && !cur?.stopped_at) return JSON.stringify({ ok: true, already_running: true, since: cur.started_at, subject: ev.subject })
          await putSession(cur, { ...base, started_at: now, stopped_at: null, hours: null, harvest_logged: false })
          return JSON.stringify({ ok: true, started: ev.subject, at: now })
        }
        if (args.action === 'set') {
          const sched = ev.start_at && ev.end_at ? Math.round(((new Date(ev.end_at) - new Date(ev.start_at)) / 3600e3) * 100) / 100 : null
          const hours = args.hours != null ? Math.round(Number(args.hours) * 100) / 100 : sched
          if (!hours) return JSON.stringify({ ok: false, error: 'hours required' })
          let harvest = null
          try { harvest = await setHours(ev.subject, hours, day) } catch (e) { harvest = { error: String(e.message || e) } }
          await putSession(cur, { ...base, started_at: cur?.started_at || ev.start_at, stopped_at: cur?.stopped_at || ev.end_at, hours, harvest_logged: !!harvest?.ok })
          return JSON.stringify({ ok: true, set: ev.subject, hours, harvest })
        }
        if (!cur?.started_at || cur?.stopped_at) return JSON.stringify({ ok: false, error: `no timer running on "${ev.subject}"` })
        const hours = Math.round(((Date.now() - new Date(cur.started_at).getTime()) / 3600e3) * 100) / 100
        let harvest = null, logged = false
        try { harvest = await logHours(ev.subject, hours, day); logged = !!harvest?.ok && !harvest?.note } catch (e) { harvest = { error: String(e.message || e) } }
        await putSession(cur, { ...base, stopped_at: now, hours, harvest_logged: logged })
        return JSON.stringify({ ok: true, stopped: ev.subject, hours, harvest })
      }
      // close_meeting. Cancel rule (David 10/21): cancelled_by 'them' credits the
      // meeting (attended + closed); cancelled_by 'me' closes it with no credit.
      if (args.cancelled_by) {
        const mine = String(args.cancelled_by).toLowerCase().startsWith('me') || String(args.cancelled_by).toLowerCase().startsWith('david')
        const line = `Canceled by ${mine ? 'me' : 'them'}: ${String(args.reason || args.special_notes || '').trim() || '(no reason given)'}`
        await putSession(cur, { ...base, attended_at: mine ? null : (cur?.attended_at || now), closed_at: now, special_notes: [line, cur?.special_notes].filter(Boolean).join('\n\n') })
        return JSON.stringify({ ok: true, cancelled: ev.subject, by: mine ? 'me' : 'them', credit: !mine, day })
      }
      let hours = cur?.hours ?? null, harvest = null
      if (cur?.started_at && !cur?.stopped_at) {
        hours = Math.round(((Date.now() - new Date(cur.started_at).getTime()) / 3600e3) * 100) / 100
        try { harvest = await logHours(ev.subject, hours) } catch (e) { harvest = { error: String(e.message || e) } }
      }
      const notes = (await sb(`granola_meetings?select=id,title,summary&meeting_date=eq.${day}`)).find(m => titleMatch(ev.subject, m.title)) || null
      const lines = (args.follow_ups || []).map(x => String(x || '').trim()).filter(Boolean)
      const patch = { ...base, closed_at: now, follow_ups: [...((cur?.follow_ups) || []), ...lines], special_notes: [cur?.special_notes, args.special_notes].filter(Boolean).join('\n\n') || null, notes_meeting_id: notes?.id || cur?.notes_meeting_id || null, notes_summary: notes?.summary || cur?.notes_summary || null }
      if (hours != null) { patch.hours = hours; if (cur?.started_at && !cur?.stopped_at) { patch.stopped_at = now; patch.harvest_logged = !!harvest?.ok && !harvest?.note } }
      await putSession(cur, patch)
      const due = new Date(new Date(`${day}T12:00:00`).getTime() + 7 * 86400e3).toISOString().slice(0, 10)
      const created = []
      for (const text of lines) {
        const o = await sbWrite('POST', 'objectives', { user_id: DAVID, title: text.slice(0, 160), state: 'follow_up', kind: 'execution', effort: 1, importance: 2, needs_sizing: false, follow_up_date: due, description: `Follow-up from ${ev.subject} on ${day}`, captured_at: now })
        created.push(o?.[0]?.title || text)
      }
      return JSON.stringify({ ok: true, closed: ev.subject, day, hours, notes_attached: !!notes, follow_ups_on_board: created, follow_up_date: due })
    }
    case 'set_due': {
      const o = await findObjective(args.title)
      const patch = {}
      if (args.due_date) patch.due_date = String(args.due_date).slice(0, 10)
      if (args.follow_up_date) patch.follow_up_date = String(args.follow_up_date).slice(0, 10)
      if (!Object.keys(patch).length) return JSON.stringify({ ok: false, error: 'nothing to change' })
      await sbWrite('PATCH', `objectives?id=eq.${o.id}`, patch, 'return=minimal')
      return JSON.stringify({ ok: true, title: o.title, ...patch })
    }
    case 'send_email': {
      const out = await sendMail({ to: args.to || 'david.smith@thirdhorizon.com', subject: String(args.subject || '').slice(0, 200), text: String(args.body || '') })
      return JSON.stringify({ ok: true, ...out, to: args.to || 'david.smith@thirdhorizon.com' })
    }
    case 'draft_email': {
      // A draft in David's own Outlook (11/10). Never sends: he reads it and presses Send.
      const files = []
      for (const a of Array.isArray(args.attachments) ? args.attachments : []) {
        const ref = typeof a === 'string' ? (/\//.test(a) ? { path: a } : { name: a }) : (a || {})
        if (ref.message_id) {
          const token = await graphToken()
          const id = encodeURIComponent(String(ref.message_id))
          const atts = await mailAttachments(token, id)
          const pick = pickAttachment(atts, ref.filename || ref.name || '')
          if (!pick) return JSON.stringify({ ok: false, error: atts.length ? 'which attachment on that email?' : 'that email has no file attachments', attachments: atts.map(x => x.name) })
          const bin = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}/attachments/${encodeURIComponent(pick.id)}/$value`, { headers: { Authorization: `Bearer ${token}` } })
          if (!bin.ok) throw new Error(`attachment download -> ${bin.status}`)
          files.push({ name: pick.name, mime: pick.contentType || 'application/octet-stream', bytes: Buffer.from(await bin.arrayBuffer()) })
        } else {
          let f
          try { f = await resolveFile({ path: ref.path, name: ref.name, side_mission: ref.side_mission || args.side_mission, project: ref.project || args.project }) } catch (e) { return JSON.stringify({ ok: false, error: `attachment: ${e.message}` }) }
          files.push({ name: f.name, mime: f.mime || 'application/octet-stream', bytes: f.bytes })
        }
      }
      const total = files.reduce((n, f) => n + f.bytes.length, 0)
      if (total > 24 * 1024 * 1024) return JSON.stringify({ ok: false, error: `the attachments come to ${(total / 1048576).toFixed(1)} MB; Outlook takes about 24 MB on one message` })
      const subject = String(args.subject || '').slice(0, 250)
      if (!args.reply_to_message_id && !subject.trim()) throw new Error('subject required')
      const out = await createDraft({ to: args.to || [], cc: args.cc || [], subject, body: String(args.body || ''), files, replyTo: args.reply_to_message_id || null, replyAll: !!args.reply_all })
      return JSON.stringify({ ok: true, drafted: out.subject, to: out.to, cc: out.cc, attachments: out.attachments, link: out.webLink, sent: false, note: 'It is in his Outlook Drafts, unsent. Say it is in Drafts for him to read and send, and give him the link. Never say it was sent.' })
    }
    case 'update_meeting': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const ev = await findEvent(day, args.subject)
      if (!ev) return JSON.stringify({ ok: false, error: `no calendar meeting on ${day} matches "${args.subject}"` })
      const token = await graphToken()
      const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const base = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/events/${encodeURIComponent(ev.id)}`
      if (args.cancel) {
        const me = await fetch(`${base}?$select=isOrganizer`, { headers: H }).then(r => r.json()).catch(() => ({}))
        const r = me.isOrganizer
          ? await fetch(`${base}/cancel`, { method: 'POST', headers: H, body: JSON.stringify({ comment: args.comment || 'Cancelled by David.' }) })
          : await fetch(`${base}/decline`, { method: 'POST', headers: H, body: JSON.stringify({ comment: args.comment || 'David cannot make this one.', sendResponse: true }) })
        if (!r.ok && r.status !== 202) throw new Error(`calendar ${me.isOrganizer ? 'cancel' : 'decline'} -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
        await sbWrite('PATCH', `calendar_events?id=eq.${encodeURIComponent(ev.id)}`, { is_cancelled: true }, 'return=minimal').catch(() => null)
        return JSON.stringify({ ok: true, subject: ev.subject, day, [me.isOrganizer ? 'cancelled' : 'declined']: true })
      }
      const patch = {}
      const local = (hhmm) => `${day}T${String(hhmm).trim().padStart(5, '0')}:00`
      if (args.start_time) patch.start = { dateTime: local(args.start_time), timeZone: 'America/Chicago' }
      if (args.end_time) patch.end = { dateTime: local(args.end_time), timeZone: 'America/Chicago' }
      if (!Object.keys(patch).length) return JSON.stringify({ ok: false, error: 'nothing to change: give start_time, end_time, or cancel' })
      const r = await fetch(base, { method: 'PATCH', headers: H, body: JSON.stringify(patch) })
      if (!r.ok) throw new Error(`calendar update -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const j = await r.json()
      const toIso = (dt) => dt?.dateTime ? new Date(dt.dateTime + (dt.timeZone === 'UTC' ? 'Z' : '')).toISOString() : null
      await sbWrite('PATCH', `calendar_events?id=eq.${encodeURIComponent(ev.id)}`, { ...(j.start ? { start_at: zonedToIso(j.start) } : {}), ...(j.end ? { end_at: zonedToIso(j.end) } : {}) }, 'return=minimal').catch(() => null)
      return JSON.stringify({ ok: true, subject: ev.subject, day, start: j.start?.dateTime, end: j.end?.dateTime, timeZone: j.start?.timeZone })
    }
    case 'work_timer': {
      const day = chiToday()
      const title = String(args.title || '').trim()
      if (!title) throw new Error('title required')
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const eid = `adhoc:${day}:${slug}`
      const cur = (await sb(`meeting_sessions?select=*&event_id=eq.${encodeURIComponent(eid)}&limit=1`))[0] || null
      const now = new Date().toISOString()
      if (args.action === 'status') {
        const running = await sb(`meeting_sessions?select=subject,started_at&day=eq.${day}&started_at=not.is.null&stopped_at=is.null`)
        return JSON.stringify({ running: running.map(r => ({ subject: r.subject, since: r.started_at })) })
      }
      if (args.action === 'log') {
        const h = Math.round(Number(args.hours) * 100) / 100
        if (!h) return JSON.stringify({ ok: false, error: 'hours required' })
        let harvest = null
        try { harvest = await logHours(title, h) } catch (e) { harvest = { error: String(e.message || e) } }
        await putSession(cur, { event_id: eid, day, subject: title, hours: (cur?.hours || 0) + h, harvest_logged: !!harvest?.ok, attended_at: cur?.attended_at || now })
        return JSON.stringify({ ok: true, logged: title, hours: h, harvest })
      }
      if (args.action === 'start') {
        const running = await sb(`meeting_sessions?select=subject,started_at&day=eq.${day}&started_at=not.is.null&stopped_at=is.null&event_id=like.adhoc:*`)
        if (running.length) return JSON.stringify({ ok: false, error: `"${running[0].subject}" is already running since ${running[0].started_at}; stop it first` })
        await putSession(cur, { event_id: eid, day, subject: title, started_at: now, stopped_at: null, attended_at: now })
        return JSON.stringify({ ok: true, started: title, at: now })
      }
      if (!cur?.started_at || cur?.stopped_at) return JSON.stringify({ ok: false, error: `no timer running on "${title}"` })
      const hours = Math.round(((Date.now() - new Date(cur.started_at).getTime()) / 3600e3) * 100) / 100
      let harvest = null
      try { harvest = await logHours(title, hours) } catch (e) { harvest = { error: String(e.message || e) } }
      await putSession(cur, { event_id: eid, day, subject: title, stopped_at: now, hours: (cur?.hours || 0) + hours, harvest_logged: !!harvest?.ok })
      return JSON.stringify({ ok: true, stopped: title, hours, harvest })
    }
    case 'remember_rule': {
      const text = String(args.text || '').trim()
      if (!text) throw new Error('text required')
      const dupes = await sb(`lumen_rules?select=id,text&active=eq.true&text=ilike.${encodeURIComponent(esc(text))}&limit=1`)
      if (dupes.length) return JSON.stringify({ ok: true, already: dupes[0] })
      const out = await sbWrite('POST', 'lumen_rules', { text, kind: ['rule', 'preference', 'fact'].includes(args.kind) ? args.kind : 'rule', source: 'david' })
      return JSON.stringify({ ok: true, rule: out?.[0] })
    }
    case 'forget_rule': {
      let rows = []
      if (args.id) rows = await sb(`lumen_rules?select=id,text&active=eq.true&id=eq.${Number(args.id)}`)
      else if (args.text) rows = await sb(`lumen_rules?select=id,text&active=eq.true&text=ilike.*${encodeURIComponent(esc(args.text))}*&limit=5`)
      if (rows.length !== 1) return JSON.stringify({ ok: false, error: rows.length ? 'ambiguous' : 'no such rule', matches: rows })
      await sbWrite('PATCH', `lumen_rules?id=eq.${rows[0].id}`, { active: false, retired_at: new Date().toISOString() }, 'return=minimal')
      return JSON.stringify({ ok: true, retired: rows[0] })
    }
    case 'list_rules': {
      return JSON.stringify(await sb('lumen_rules?select=id,text,kind,created_at&active=eq.true&order=id.asc'), null, 2)
    }
    case 'regimen': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const action = args.action || 'status'
      if (action !== 'status') {
        if (!args.key) throw new Error('key required')
        if (action === 'clear') { await sbWrite('DELETE', `medication_overrides?day=eq.${day}&key=eq.${args.key}`, undefined, 'return=minimal'); return JSON.stringify({ ok: true, cleared: args.key, day }) }
        await sbWrite('POST', 'medication_overrides?on_conflict=day,key', { day, key: args.key, due: action === 'add', note: args.note || null }, 'resolution=merge-duplicates,return=minimal')
      }
      const { computeRegimen } = await import('./_river.mjs')
      return JSON.stringify(await computeRegimen(day), null, 2)
    }
    case 'get_day': {
      const date = String(args.date || '').slice(0, 10)
      const rows = await sb(`daily_performance?select=day,summary,scorecard,accomplishments,learned,interactions,team_allocation,must_do,new_items,notes,model,generated_at&day=eq.${date}&order=generated_at.desc&limit=5`)
      if (!rows.length) return JSON.stringify({ date, note: 'No record for this day.' })
      const report = rows.find(r => r.model === 'Daily Report') || rows[0]
      const scored = rows.find(r => r.scorecard)
      return JSON.stringify({ ...report, scorecard: scored?.scorecard || report.scorecard }, null, 2)
    }
    case 'get_volume': {
      const map = { 'operating-manual': 'operating-manual.txt', 'psyche-map': 'psyche-map-and-manual.txt', 'somatic': 'somatic-manual.txt', 'psyche-codex': 'psyche-codex.md' }
      const file = map[args.volume]
      if (!file) throw new Error('unknown volume')
      return identityDoc(file)
    }

    // ---- writes
    case 'add_objective': {
      const title = String(args.title || '').trim()
      if (!title) throw new Error('title required')
      const state = OBJ_STATES.includes(args.state) && args.state !== 'released' && args.state !== 'foreman' ? args.state : 'inbox'
      const dupes = await sb(`objectives?select=title,state&deleted_at=is.null&title=ilike.${encodeURIComponent(esc(title))}&limit=3`)
      if (dupes.length) return JSON.stringify({ ok: false, note: 'already on the board', existing: dupes })
      const size = String(args.size || 'light').toLowerCase()
      const tags = [...new Set([...(Array.isArray(args.tags) ? args.tags : []), ...(args.impromptu ? ['impromptu'] : [])])]
      let fit = null
      if (state === 'active') {
        fit = await checkFit({ size, tags }, { force: !!args.force })
        if (!fit.ok) return JSON.stringify({ ok: false, refused: 'loadout', reasons: fit.reasons, loadout: fit.loadout, note: 'Ask David what to stash (park), or whether to force it.' })
      }
      const row = {
        user_id: DAVID, title, state, captured_at: new Date().toISOString(),
        kind: 'execution', effort: effortOf(size), importance: 2, needs_sizing: false,
        due_date: args.due_date || null,
        follow_up_date: state === 'follow_up' ? (args.follow_up_date || plusDays(7)) : (args.follow_up_date || null),
        description: args.description || null,
        tags,
        activated_at: state === 'active' ? new Date().toISOString() : null,
        ...(String(args.north_star || '').trim() ? { north_star: String(args.north_star).trim() } : {}),
      }
      let out
      try { out = await sbWrite('POST', 'objectives', row) }
      catch (e) { if (row.north_star && /north_star/.test(String(e.message))) { delete row.north_star; out = await sbWrite('POST', 'objectives', row); row.star_dropped = 'the north_star column is not there yet; David runs sql/2026-10-13-north-star.sql' } else throw e }
      let clock = null
      if (state === 'active' && out?.[0]?.id) clock = await equip(out[0].id, 'equipped on add').catch(e => ({ error: String(e.message || e) }))
      return JSON.stringify({ ok: true, objective: { title, state, size, due_date: row.due_date, follow_up_date: row.follow_up_date, id: out?.[0]?.id, tags, north_star: row.north_star || null }, ...(row.star_dropped ? { note: row.star_dropped } : {}), ...(clock ? { equipped: clock } : {}), ...(fit?.forced ? { forced_over: fit.reasons } : {}) })
    }
    case 'move_objective': {
      const o = await findObjective(args.title)
      const state = args.state
      if (!OBJ_STATES.includes(state)) throw new Error('bad state')
      if (o.state === state) return JSON.stringify({ ok: true, note: `already ${state}`, title: o.title })
      let fit = null
      if (state === 'active') {
        fit = await checkFit({ id: o.id, effort: o.effort }, { force: !!args.force })
        if (!fit.ok) return JSON.stringify({ ok: false, refused: 'loadout', reasons: fit.reasons, loadout: fit.loadout, note: 'Ask David what to stash (park), or whether to force it.' })
      }
      const patch = { state }
      // Off the board into the Stash (10/14): a parked item that was active wears the 'stashed' tag and sits in the stack beside the Loadout; loading strips it.
      if (state === 'parked' && o.state === 'active') patch.tags = [...new Set([...(o.tags || []), 'stashed'])]
      if (state === 'active') patch.tags = (o.tags || []).filter(t => t !== 'stashed')
      if (state === 'released' || state === 'foreman') { patch.released_kind = state === 'foreman' ? 'foreman' : 'done'; patch.released_at = new Date().toISOString() }
      else { patch.released_kind = null; patch.released_at = null }
      patch.activated_at = state === 'active' ? new Date().toISOString() : null
      if (state === 'follow_up') patch.follow_up_date = args.follow_up_date || o.follow_up_date || plusDays(7)
      if (args.due_date) patch.due_date = args.due_date
      await sbWrite('PATCH', `objectives?id=eq.${o.id}`, patch, 'return=minimal')
      boardLog(`${state === 'active' ? 'Loaded' : state === 'parked' && o.state === 'active' ? 'Stashed' : state === 'released' ? 'Extracted' : `Moved to ${state.replace('_', ' ')}`}: ${o.title}`)
      let clock = null, equipped = null
      if (state === 'active') equipped = await equip(o.id, 'equipped on activate').catch(e => ({ error: String(e.message || e) }))
      else if (state !== 'released') await holster(o.id).catch(() => null)
      if (state === 'released') {
        await sbWrite('PATCH', `project_tasks?objective_id=eq.${o.id}&status=neq.done`, { status: 'done', done: true, released_at: new Date().toISOString() }, 'return=minimal').catch(() => {})
        // Time rule (9/27): the item's clock (activated -> released) is kept in the
        // Ledger as an activity log, never in Harvest. Harvest is Third Horizon work
        // only; a Side Mission tagged personal is personal time. Both count as time
        // on pursuits.
        if (o.state === 'active') {
          const clocked = await extract(o.id).catch(() => ({ minutes: 0, segments: 0 }))
          const fallback = o.activated_at ? Math.max(1, Math.round((Date.now() - new Date(o.activated_at).getTime()) / 60000)) : 0
          const minutes = Number(args.minutes) > 0 ? Math.round(Number(args.minutes)) : (clocked.minutes || fallback)
          const personal = (o.tags || []).includes('personal')
          clock = { minutes, clocked_minutes: clocked.minutes, segments: clocked.segments, stated_by_david: Number(args.minutes) > 0, started_at: o.activated_at, personal, harvest: personal ? 'not logged: personal time stays out of Harvest' : 'not logged: the clock is kept in the Ledger' }
          await sbWrite('POST', 'daily_logs', { day: chiToday(), kind: 'activity', what: o.title, value: minutes, note: `${personal ? 'personal' : 'work'} · Side Mission clock ${o.activated_at ? o.activated_at.slice(11, 16) + 'Z' : 'earlier'} to ${new Date().toISOString().slice(11, 16)}Z`, source: `objective:${o.id}` }, 'return=minimal').catch(() => {})
        }
      }
      return JSON.stringify({ ok: true, title: o.title, from: o.state, to: state, follow_up_date: patch.follow_up_date || null, ...(equipped ? { equipped } : {}), ...(fit?.forced ? { forced_over: fit.reasons } : {}), ...(clock ? { clock, close_out: 'Tell David the time of activity. Ask once whether there is anything to file against it: a receipt, a photo, a conversation, a note. A photo he sends is filed automatically; a note goes in log_day activity with the same what.' } : {}) })
    }
    case 'add_project_task': {
      const q = esc(args.project || '')
      const ps = await sb(`projects?select=id,key,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(q)},name.ilike.*${encodeURIComponent(q)}*)&limit=5`)
      if (ps.length !== 1) throw new Error(ps.length ? `project ambiguous: ${ps.map(p => p.name).join(' | ')}` : `no project matches "${args.project}"`)
      const out = await sbWrite('POST', 'project_tasks', { project_id: ps[0].id, text: String(args.text || '').trim(), status: 'open', source: 'lumen', due_date: args.due_date || null })
      return JSON.stringify({ ok: true, project: ps[0].name, task: out?.[0]?.text || args.text })
    }
    case 'activate_project_task': {
      const pq = esc(args.project || '')
      const ps = await sb(`projects?select=id,key,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(pq)},name.ilike.*${encodeURIComponent(pq)}*)&limit=5`)
      if (ps.length !== 1) throw new Error(ps.length ? `project ambiguous: ${ps.map(p => p.name).join(' | ')}` : `no project matches "${args.project}"`)
      const tq = esc(args.text || '')
      let ts = await sb(`project_tasks?select=id,text,status,objective_id&project_id=eq.${ps[0].id}&status=neq.done&text=ilike.${encodeURIComponent(tq)}&limit=5`)
      if (ts.length !== 1) ts = await sb(`project_tasks?select=id,text,status,objective_id&project_id=eq.${ps[0].id}&status=neq.done&text=ilike.*${encodeURIComponent(tq)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `task ambiguous: ${ts.map(t => t.text).join(' | ')}` : `no open task matches "${args.text}"`)
      const task = ts[0]
      const state = args.state === 'parked' ? 'parked' : 'active'
      const size = String(args.size || 'light').toLowerCase()
      const now = new Date().toISOString()
      let fit = null
      if (state === 'active') {
        fit = await checkFit({ id: task.objective_id, size }, { force: !!args.force })
        if (!fit.ok) return JSON.stringify({ ok: false, refused: 'loadout', reasons: fit.reasons, loadout: fit.loadout, note: 'Ask David what to stash (park), or whether to force it.' })
      }
      if (task.objective_id) {
        await sbWrite('PATCH', `objectives?id=eq.${task.objective_id}`, { state, effort: effortOf(size), activated_at: state === 'active' ? now : null, released_at: null, released_kind: null }, 'return=minimal')
        const equipped = state === 'active' ? await equip(task.objective_id, 'equipped on activate').catch(e => ({ error: String(e.message || e) })) : null
        return JSON.stringify({ ok: true, task: task.text, objective: 'existing', state, size, ...(equipped ? { equipped } : {}), ...(fit?.forced ? { forced_over: fit.reasons } : {}) })
      }
      const obj = await sbWrite('POST', 'objectives', {
        user_id: DAVID, title: task.text.slice(0, 120), state, kind: 'execution', effort: effortOf(size), importance: 2, needs_sizing: false, tags: ['mission-task'],
        description: `Promoted from project: ${ps[0].name}`, captured_at: now, activated_at: state === 'active' ? now : null,
      })
      await sbWrite('PATCH', `project_tasks?id=eq.${task.id}`, { objective_id: obj[0].id, status: task.status === 'blocked' ? 'blocked' : 'promoted' }, 'return=minimal')
      const equipped = state === 'active' ? await equip(obj[0].id, 'equipped on activate').catch(e => ({ error: String(e.message || e) })) : null
      return JSON.stringify({ ok: true, task: task.text, objective: obj[0].title, state, size, project: ps[0].name, ...(equipped ? { equipped } : {}), ...(fit?.forced ? { forced_over: fit.reasons } : {}) })
    }
    case 'get_loadout': return JSON.stringify(await loadout())
    case 'equip': {
      const o = await findObjective(args.title)
      if (o.state !== 'active') {
        const fit = await checkFit({ id: o.id, effort: o.effort })
        if (!fit.ok) return JSON.stringify({ ok: false, refused: 'loadout', reasons: fit.reasons, note: `${o.title} is ${o.state}; the loadout has no room to activate it. Ask David what to stash.` })
        await sbWrite('PATCH', `objectives?id=eq.${o.id}`, { state: 'active', activated_at: new Date().toISOString(), released_at: null, released_kind: null }, 'return=minimal')
      }
      const r = await equip(o.id, 'equipped')
      return JSON.stringify({ ok: true, equipped: o.title, size: sizeOf(o), ...r })
    }
    case 'holster': {
      const o = await findObjective(args.title)
      const r = await holster(o.id)
      return JSON.stringify({ ok: true, holstered: o.title, ...r })
    }
    case 'amend_day': {
      const day = String(args.day || '').slice(0, 10); const title = String(args.title || '').trim(); const hours = Math.round(Number(args.hours) * 100) / 100
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !title || !(hours > 0)) throw new Error('day, title and positive hours required')
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
      const eid = `adhoc:${day}:${slug}`
      const start = `${day}T13:00:00.000Z`, end = new Date(new Date(start).getTime() + hours * 3600e3).toISOString()
      let harvest = null
      // A whole day can be one block (David, 10/16: 8 AM to 11 PM); the usual 12-hour ceiling does not apply here, 20 does.
      try { harvest = await setHours(title, hours, day, 20) } catch (e) { harvest = { error: String(e.message || e) } }
      const cur = (await sb(`meeting_sessions?select=event_id&event_id=eq.${encodeURIComponent(eid)}&limit=1`))[0] || null
      await putSession(cur, { event_id: eid, day, subject: title, started_at: start, stopped_at: end, hours, harvest_logged: !!harvest?.ok, special_notes: args.note ? String(args.note).slice(0, 300) : null })
      boardLog(`Amended ${day}: ${title} · ${hours}h`)
      return JSON.stringify({ ok: true, day, title, hours, harvest, note: 'logged on that day in Harvest and recorded as a session; the River re-reads the day at the next update' })
    }
    case 'schedule_event': {
      const subject = String(args.subject || '').trim(); if (!subject) throw new Error('subject required')
      const tz = String(args.timezone || 'America/Chicago')
      const ev = { subject, start: { dateTime: String(args.start), timeZone: tz }, end: { dateTime: String(args.end), timeZone: tz }, isAllDay: !!args.all_day, ...(args.location ? { location: { displayName: String(args.location) } } : {}), ...(args.body ? { body: { contentType: 'text', content: String(args.body) } } : {}), isReminderOn: true, reminderMinutesBeforeStart: 15 }
      const token = await graphToken()
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/events`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })
      if (r.status === 403 || r.status === 401) return JSON.stringify({ ok: false, error: `the calendar hand is not granted yet (Graph ${r.status}): the M365 app needs Calendars.ReadWrite on David's mailbox. Tell David plainly; do not retry.` })
      if (!r.ok) throw new Error(`calendar -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const j = await r.json()
      // The Ledger sees it now, not at the next sync (10/16: Lumen created a block and could not find it).
      try {
        const sIso = zonedToIso(j.start), eIso = zonedToIso(j.end)
        if (sIso && eIso) await sbWrite('POST', 'calendar_events', { id: j.id, subject, start_at: sIso, end_at: eIso, day: sIso.slice(0, 10), organizer: 'David Smith', attendees: [], is_all_day: !!args.all_day, is_cancelled: false, synced_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal')
      } catch (e) { /* the sync will carry it */ }
      return JSON.stringify({ ok: true, id: j.id, subject, start: args.start, end: args.end, timezone: tz, location: args.location || null, web_link: j.webLink || null, in_ledger: true })
    }
    case 'file_attachment': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const atts = await mailAttachments(token, id)
      if (!atts.length) return JSON.stringify({ ok: false, error: 'that message has no file attachments' })
      const want = String(args.filename || '').toLowerCase()
      const pick = pickAttachment(atts, want)
      if (!pick) return JSON.stringify({ ok: false, error: 'which one?', attachments: atts.map(a => a.name) })
      let root
      if (args.side_mission) { const o = await findObjective(args.side_mission); root = `objectives/${o.id}/files` }
      else if (args.project) { const q = esc(args.project); const ps = await sb(`projects?select=id,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(q)},name.ilike.${encodeURIComponent(q)})&limit=2`); if (ps.length !== 1) throw new Error(ps.length ? 'ambiguous project' : 'no such project'); root = `${ps[0].id}` }
      else throw new Error('side_mission or project required')
      const bin = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}/attachments/${encodeURIComponent(pick.id)}/$value`, { headers: { Authorization: `Bearer ${token}` } })
      if (!bin.ok) throw new Error(`attachment download -> ${bin.status}`)
      const name = pick.name.replace(/[^A-Za-z0-9._ -]/g, '_')
      const path = `${root}/${name}`
      const up = await fetch(`${URL_BASE}/storage/v1/object/project-files/${path.split('/').map(encodeURIComponent).join('/')}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': pick.contentType || 'application/octet-stream', 'x-upsert': 'true' }, body: Buffer.from(await bin.arrayBuffer()) })
      if (!up.ok) throw new Error(`file upload -> ${up.status}: ${(await up.text()).slice(0, 160)}`)
      // Where it came from (David 11/10: "have 'source' so it can say email and date"): the row's
      // source is 'email' and its note names the sender, when the email arrived and its subject,
      // in a form the Files list reads back ("Email · sender · date · subject").
      let note = 'from email'
      try {
        const mr = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}?$select=subject,from,receivedDateTime`, { headers: { Authorization: `Bearer ${token}` } })
        if (mr.ok) {
          const m = await mr.json()
          const flat = (v) => String(v || '').replace(/\s*·\s*/g, ' ').replace(/\s+/g, ' ').trim()
          const when = new Date(m.receivedDateTime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
          note = ['Email', flat(m.from?.emailAddress?.name || m.from?.emailAddress?.address) || 'Unknown Sender', when, flat(m.subject) || 'No Subject'].join(' · ')
        }
      } catch (e) { console.warn('email source', e.message) }
      await indexLiveFile({ name, bucket: 'project-files', path, size: pick.size, mime: pick.contentType, objective_id: root.startsWith('objectives/') ? root.split('/')[1] : null, project_id: root.startsWith('objectives/') ? null : root, note, source: 'email' })
      return JSON.stringify({ ok: true, filed: name, path, size: pick.size, live: true })
    }
    case 'set_north_star': {
      const text = String(args.text || '').trim()
      if (!text) throw new Error('text required')
      if (args.project) {
        const q = esc(args.project)
        const ps = await sb(`projects?select=id,key,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(q)},name.ilike.${encodeURIComponent(q)})&limit=2`)
        if (ps.length !== 1) throw new Error(ps.length ? 'ambiguous project' : 'no such project')
        await sbWrite('PATCH', `projects?id=eq.${ps[0].id}`, { description: text }, 'return=minimal')
        return JSON.stringify({ ok: true, project: ps[0].name, north_star: text })
      }
      const o = await findObjective(args.title)
      try { await sbWrite('PATCH', `objectives?id=eq.${o.id}`, { north_star: text }, 'return=minimal') }
      catch (e) { if (/north_star/.test(String(e.message))) return JSON.stringify({ ok: false, error: 'the north_star column is not there yet; David runs sql/2026-10-13-north-star.sql' }); throw e }
      return JSON.stringify({ ok: true, title: o.title, north_star: text })
    }
    case 'set_size': {
      const o = await findObjective(args.title)
      const size = String(args.size || '').toLowerCase()
      if (!SIZES[size]) throw new Error('size must be light, medium, or heavy')
      await sbWrite('PATCH', `objectives?id=eq.${o.id}`, { effort: effortOf(size), needs_sizing: false }, 'return=minimal')
      return JSON.stringify({ ok: true, title: o.title, size, hours: SIZES[size].hours })
    }
    case 'complete_project_task': {
      const q = esc(args.text || '')
      const ts = await sb(`project_tasks?select=id,text,status,objective_id&status=neq.done&text=ilike.*${encodeURIComponent(q)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `task ambiguous: ${ts.map(t => t.text).join(' | ')}` : `no open task matches "${args.text}"`)
      const doneAt = new Date().toISOString()
      await sbWrite('PATCH', `project_tasks?id=eq.${ts[0].id}`, { status: 'done', done: true, released_at: doneAt }, 'return=minimal')
      // The promoted objective follows its milestone (10/29): no ghost left in the Stash.
      if (ts[0].objective_id) await sbWrite('PATCH', `objectives?id=eq.${ts[0].objective_id}&state=neq.released`, { state: 'released', released_kind: 'done', released_at: doneAt, activated_at: null }, 'return=minimal')
      return JSON.stringify({ ok: true, completed: ts[0].text })
    }
    case 'set_standing_order': {
      const out = await sbWrite('POST', 'standing_orders', { text: String(args.text || '').trim(), cadence: args.cadence || null, next_at: args.next_at || null })
      return JSON.stringify({ ok: true, order: out?.[0] })
    }
    case 'create_project': {
      const name = String(args.name || '').trim()
      if (!name) throw new Error('name required')
      const dupes = await sb(`projects?select=id,name,key,user_id&status=neq.deleted&or=(name.ilike.${encodeURIComponent(esc(name))},key.eq.${encodeURIComponent(args.key || '__none__')})&limit=3`)
      if (dupes.length) {
        // The HUD lists only David's rows; claim any ownerless project (and its tasks) rather than duplicating.
        let claimed = 0
        for (const d of dupes.filter(d => !d.user_id)) {
          await sbWrite('PATCH', `projects?id=eq.${d.id}`, { user_id: DAVID }, 'return=minimal')
          claimed += 1  // tasks carry no owner; they are visible through their project
        }
        return JSON.stringify({ ok: false, note: claimed ? `project exists; claimed ${claimed} ownerless rows for David` : 'project exists', existing: dupes.map(({ user_id, ...d }) => d) })
      }
      const out = await sbWrite('POST', 'projects', { user_id: DAVID, name, key: args.key || null, category: args.category || 'third-horizon', status: 'active', description: args.description || null, last_activity_at: new Date().toISOString() })
      return JSON.stringify({ ok: true, project: out?.[0] })
    }
    case 'delete_project': {
      const q = esc(String(args.project || '').trim()); if (!q) throw new Error('project required')
      const ps = await sb(`projects?select=id,name,key,status&status=neq.deleted&or=(key.ilike.${encodeURIComponent(q)},name.ilike.${encodeURIComponent(q)})&limit=2`)
      if (!ps.length) return JSON.stringify({ ok: false, error: 'no mission by that exact name or key' })
      if (ps.length > 1) return JSON.stringify({ ok: false, error: 'more than one match; give the exact name', matches: ps.map(p => p.name) })
      const p = ps[0]; const now = new Date().toISOString()
      const tasks = await sb(`project_tasks?select=id,objective_id,status&project_id=eq.${p.id}`)
      const openObjs = tasks.filter(t => t.objective_id && t.status !== 'done').map(t => t.objective_id)
      if (openObjs.length) await sbWrite('PATCH', `objectives?id=in.(${openObjs.join(',')})`, { deleted_at: now, state: 'parked', activated_at: null }, 'return=minimal')
      await sbWrite('PATCH', `projects?id=eq.${p.id}`, { status: 'deleted', archived_at: now, last_activity_at: now }, 'return=minimal')
      boardLog(`Deleted Main Mission (no miles): ${p.name}`)
      return JSON.stringify({ ok: true, deleted: p.name, closed_milestones_kept: tasks.filter(t => t.status === 'done').length, open_milestones_removed: tasks.length - tasks.filter(t => t.status === 'done').length, miles: 0 })
    }
    case 'list_live_files': {
      let f = 'filed_at=is.null&superseded_by=is.null'
      if (args.side_mission) { const o = await findObjective(args.side_mission); f += `&objective_id=eq.${o.id}` }
      else if (args.project) { const q = esc(args.project); const ps = await sb(`projects?select=id,name&status=neq.deleted&or=(key.ilike.${encodeURIComponent(q)},name.ilike.${encodeURIComponent(q)})&limit=2`); if (ps.length !== 1) throw new Error(ps.length ? 'ambiguous project' : 'no such project'); f += `&project_id=eq.${ps[0].id}` }
      let rows
      try { rows = await sb(`live_files?select=id,name,bucket,path,size,source,session,version,note,objective_id,project_id,created_at&${f}&order=created_at.desc&limit=100`) } catch (e) { return JSON.stringify({ ok: false, error: /live_files/.test(e.message) ? 'the live_files table is not in the Ledger yet (David runs sql/2026-10-16-live-files.sql)' : e.message }) }
      const oids = [...new Set(rows.map(r => r.objective_id).filter(Boolean))]; const pids = [...new Set(rows.map(r => r.project_id).filter(Boolean))]
      const [os, ps] = await Promise.all([oids.length ? sb(`objectives?select=id,title,state&id=in.(${oids.join(',')})`) : [], pids.length ? sb(`projects?select=id,name&id=in.(${pids.join(',')})`) : []])
      const O = new Map(os.map(o => [o.id, o])), P = new Map(ps.map(p => [p.id, p.name]))
      return JSON.stringify(rows.map(r => ({ name: r.name, version: r.version, size: r.size, when: r.created_at, by: r.source, session: r.session, note: r.note, tied_to: r.objective_id ? { item: O.get(r.objective_id)?.title, state: O.get(r.objective_id)?.state } : r.project_id ? { mission: P.get(r.project_id) } : null, bucket: r.bucket, path: r.path })), null, 2)
    }
    case 'sent_proof': {
      const o = await findObjective(args.title)
      const proof = await sentProof(o)
      return JSON.stringify(proof ? { ok: true, found: true, ...proof, suggested_achieved: `Sent "${proof.subject}" to ${proof.to} at ${proof.at}` } : { ok: true, found: false, note: 'no sent message matching the person or org since the item was captured' })
    }
    case 'list_standing_orders': {
      return JSON.stringify(await sb('standing_orders?select=id,text,cadence,next_at,last_fired_at&active=eq.true&order=next_at.asc.nullslast'), null, 2)
    }
    case 'look_at_file': {
      // Milestone 16.4: the file itself goes in front of the model. The
      // tool returns { __attach, text }: the brain appends the blocks to the
      // same user message as the tool_result (image or document blocks).
      const wantSketch = !args.path && (!args.name || /sketch/i.test(args.name) || /latest/i.test(args.name))
      let row = null, bytes = null
      if (wantSketch) {
        let f = 'superseded_by=is.null&bucket=neq.link&bucket=neq.request'
        const card = await cardScope(args)
        if (card) f += card.objective_id ? `&objective_id=eq.${card.objective_id}` : `&project_id=eq.${card.project_id}`
        const rows = await sb(`live_files?select=id,name,bucket,path,mime,size,created_at,objective_id,project_id,note&${f}&name=ilike.*sketch*&order=created_at.desc&limit=1`)
        if (!rows.length) return JSON.stringify({ ok: false, error: `no sketch in Live Files${card ? ` on ${card.title}` : ''}; list_live_files shows what is there` })
        row = rows[0]
        const r = await fetchObject(row.bucket, row.path)
        if (!r) return JSON.stringify({ ok: false, error: `could not read ${row.name} from storage` })
        bytes = Buffer.from(await r.arrayBuffer())
        row.mime = row.mime || r.headers.get('content-type')
      } else {
        // Any file, named any way (11/10): a card's file, a Live File, a cabinet path.
        let f
        try { f = await resolveFile(args) } catch (e) { return JSON.stringify({ ok: false, error: e.message }) }
        row = { ...(f.row || {}), name: f.name, bucket: f.bucket, path: f.path, mime: f.mime }
        bytes = f.bytes
      }
      const ext = (row.name.split('.').pop() || '').toLowerCase()
      const known = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', pdf: 'application/pdf' }[ext]
      const mime = known || row.mime || 'application/octet-stream'
      const LIMIT = 4.5 * 1024 * 1024
      let shown = ''
      if (ext === 'docx') {
        // A Word file (11/10: "I can't see images inside a .docx"): what it carries, and its pictures in front of you.
        const info = await inspectDocx(bytes)
        const show = info.images.filter(i => i.mime && i.bytes.length <= LIMIT).slice(0, 4)
        const skipped = info.images.filter(i => !show.includes(i)).map(i => `${i.name} (${i.mime ? 'too large to show' : 'a format that cannot be shown'})`)
        return { __attach: show.map(i => ({ type: 'image', source: { type: 'base64', media_type: i.mime, data: i.bytes.toString('base64') } })), text: `${row.name} is a Word file. What it carries:\n${info.text}${skipped.length ? `\nNot shown: ${skipped.join(', ')}` : ''}\n${show.length ? `Its picture${show.length > 1 ? 's follow' : ' follows'} this result, in the order listed. Say what you see. This is what the file holds, not a rendering of the page; read_file gives its words.` : 'No picture to show. read_file gives its words.'}${/header/.test(info.text) ? ' To write a new document on this same letterhead: write_file with letterhead set to this file.' : ''}` }
      }
      if (mime === 'application/pdf') {
        const { PDFDocument } = await import('pdf-lib')
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
        const n = src.getPageCount()
        let want = []
        const m = String(args.pages || '').match(/^\s*(\d+)\s*(?:-\s*(\d+))?\s*$/)
        if (m) { const a = Math.max(1, +m[1]), b = Math.min(n, +(m[2] || m[1])); for (let i = a; i <= b; i++) want.push(i) }
        else want = Array.from({ length: Math.min(n, 5) }, (_, i) => i + 1)
        if (want.length && want.length < n) {
          const out = await PDFDocument.create()
          const copied = await out.copyPages(src, want.map(i => i - 1))
          copied.forEach(pg => out.addPage(pg))
          bytes = Buffer.from(await out.save())
        }
        shown = `pages ${want[0]}${want.length > 1 ? `-${want[want.length - 1]}` : ''} of ${n}`
        if (bytes.length > LIMIT) return JSON.stringify({ ok: false, error: `${row.name} is ${(bytes.length / 1048576).toFixed(1)} MB for those pages; ask for fewer pages (it has ${n})` })
        var attach = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: bytes.toString('base64') }, title: row.name }]
      } else if (/^image\//.test(mime)) {
        if (bytes.length > LIMIT) return JSON.stringify({ ok: false, error: `${row.name} is ${(bytes.length / 1048576).toFixed(1)} MB, too large to show` })
        shown = 'the image'
        var attach = [{ type: 'image', source: { type: 'base64', media_type: mime, data: bytes.toString('base64') } }]
      } else {
        return JSON.stringify({ ok: false, error: `${row.name} is ${mime}; look_at_file shows images, PDFs and Word files. read_file reads other documents as text.` })
      }
      let tied = ''
      if (row.objective_id) { const o = await sb(`objectives?select=title,state&id=eq.${row.objective_id}`).catch(() => []); if (o[0]) tied = `, tied to "${o[0].title}" (${o[0].state})` }
      return { __attach: attach, text: `Showing you ${row.name} (${shown}, ${(bytes.length / 1024).toFixed(0)} KB, saved ${row.created_at ? row.created_at.slice(0, 16).replace('T', ' ') + 'Z' : 'in the file store'}${tied}${row.note ? `; note: ${row.note}` : ''}). It follows this result. Describe what you see.` }
    }
    case 'voice_candidates': {
      // Voices to hear (David 11/11: "give me some wise japanese sensei voice options to listen to"). ElevenLabs
      // Voice Design makes up to three candidates from a description; each is kept in the cabinet as an mp3
      // and sent to David as a WhatsApp voice note. Nothing about Lumen's own voice changes here.
      const desc = String(args.description || '').trim(), sample = String(args.sample || '').trim()
      const label = String(args.label || 'Voice').replace(/[^A-Za-z0-9 ·'-]/g, '').trim().slice(0, 40) || 'Voice'
      if (desc.length < 20 || desc.length > 1000) return JSON.stringify({ ok: false, error: 'description: 20 to 1000 characters saying who is speaking (age, accent, pitch, pace, character)' })
      if (sample.length < 100 || sample.length > 1000) return JSON.stringify({ ok: false, error: 'sample: 100 to 1000 characters for the voice to say' })
      if (!process.env.ELEVENLABS_API_KEY) return JSON.stringify({ ok: false, error: 'no ElevenLabs key on this deployment' })
      // From a voice he already likes (David 11/11, on Tea Master 1: "maybe add a few years and a slight elevation to
      // the command in the voice"): a remix keeps that voice and applies the changes described, where a fresh
      // design would roll new voices. from_voice_id is a saved voice (keep_voice returns it); strength is how far
      // the changes may pull it from the original, 0 to 1.
      const from = String(args.from_voice_id || '').trim()
      const H = { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' }
      const strength = Math.min(Math.max(Number(args.strength ?? 0.35), 0), 1)
      const ask = (body) => fetch(from ? `https://api.elevenlabs.io/v1/text-to-voice/${encodeURIComponent(from)}/remix?output_format=mp3_44100_128` : 'https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_128', { method: 'POST', headers: H, body: JSON.stringify(body) })
      let r = await ask(from ? { voice_description: desc, text: sample, prompt_strength: strength } : { voice_description: desc, text: sample, model_id: 'eleven_ttv_v3' })
      // The strength setting is only taken by the newest voice model; without it the remix still runs.
      if (from && r.status === 422) r = await ask({ voice_description: desc, text: sample })
      const j = await r.json().catch(() => null)
      if (!r.ok) return JSON.stringify({ ok: false, error: `ElevenLabs voice ${from ? 'remix' : 'design'} -> ${r.status}: ${JSON.stringify(j).slice(0, 300)}` })
      const previews = (j?.previews || []).slice(0, Math.min(Math.max(Number(args.count) || 3, 1), 3))
      const day = chiToday(), to = davidNumber(), out = []
      for (const [i, pv] of previews.entries()) {
        const bytes = Uint8Array.from(Buffer.from(pv.audio_base_64, 'base64'))
        const path = `Lumen/Voice Candidates/${day}/${label} ${i + 1}.mp3`
        const row = { n: i + 1, generated_voice_id: pv.generated_voice_id, path, bytes: bytes.length }
        try { await putFile(path, bytes, 'audio/mpeg') } catch (e) { row.kept = `not kept: ${e.message}` }
        if (args.send !== false) {
          try { await waSendText(to, `${label} · ${i + 1} of ${previews.length}`); row.sent = await waSendAudio(to, bytes) || true } catch (e) { row.sent = `not sent: ${String(e.message || e).slice(0, 160)}` }
        }
        out.push(row)
      }
      // The record of what was made, so a chosen one can be kept later by its id.
      try {
        const rec = 'lumen/voice-candidates.json'
        const got = await fetchObject('project-files', rec)
        const list = got ? await got.json().catch(() => []) : []
        const next = [...(Array.isArray(list) ? list : []), { at: new Date().toISOString(), label, description: desc, ...(from ? { from_voice_id: from, strength } : {}), candidates: out.map(c => ({ n: c.n, generated_voice_id: c.generated_voice_id, path: c.path })) }].slice(-60)
        await fetch(`${URL_BASE}/storage/v1/object/project-files/${rec}`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(next) })
      } catch (e) { console.warn('voice record', e.message) }
      return JSON.stringify({ ok: true, label, candidates: out, note: 'Each candidate is in the cabinet as an mp3 and, unless send was false, in David\'s WhatsApp as a voice note. keep_voice with a generated_voice_id saves the one he picks; a candidate that is not kept may not stay available.' })
    }
    case 'keep_voice': {
      if (!process.env.ELEVENLABS_API_KEY) return JSON.stringify({ ok: false, error: 'no ElevenLabs key on this deployment' })
      const gid = String(args.generated_voice_id || '').trim()
      if (!gid) throw new Error('generated_voice_id required')
      const r = await fetch('https://api.elevenlabs.io/v1/text-to-voice', {
        method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_name: String(args.name || 'Lumen Candidate').slice(0, 60), voice_description: String(args.description || 'A voice David chose for Lumen').slice(0, 500), generated_voice_id: gid }),
      })
      const j = await r.json().catch(() => null)
      if (!r.ok) return JSON.stringify({ ok: false, error: `ElevenLabs save voice -> ${r.status}: ${JSON.stringify(j).slice(0, 300)}` })
      return JSON.stringify({ ok: true, voice_id: j?.voice_id || null, name: j?.name || args.name || null, note: 'Saved to the ElevenLabs account. Lumen does not speak in it yet: his voice is the record at project-files/lumen/voice.json, which a Claude Code session changes when David says so.' })
    }
    case 'fetch_url': {
      try { return JSON.stringify(await fetchUrlText(args.url, { find: args.find || null, max: Math.min(Math.max(Number(args.max_chars) || 12000, 2000), 40000) }), null, 1) }
      catch (e) { return JSON.stringify({ ok: false, error: e.name === 'AbortError' ? 'timed out after 15s' : e.message }) }
    }
    case 'web_search': {
      try { return JSON.stringify(await webSearch(String(args.query || '')), null, 1) }
      catch (e) { return JSON.stringify({ ok: false, error: e.name === 'AbortError' ? 'timed out after 15s' : e.message }) }
    }
    case 'find_places': {
      if (!String(args.query || '').trim()) return JSON.stringify({ ok: false, error: 'query required: what and where' })
      try { return JSON.stringify(await findPlaces(String(args.query), { country: String(args.country || 'us').toLowerCase().slice(0, 2), limit: args.limit }), null, 1) }
      catch (e) { return JSON.stringify({ ok: false, error: e.name === 'AbortError' ? 'timed out after 30s' : e.message }) }
    }
    // A voice cloned from a recording, a sample spoken in any saved voice, and taking a clone back out (David
    // 11/12, on a friend's voice: "i'm getting her permission now ... let's go ahead and wire and before actually
    // pushing to production i should have her permission"). These three are NOT in TOOLS: Lumen cannot reach
    // them from a chat. They run from a Claude Code session through the Lumen door. A clone is only made with the
    // speaker's permission written down (consent: who said yes, when, how), and that line is kept with the voice.
    case 'clone_voice': {
      if (!process.env.ELEVENLABS_API_KEY) return JSON.stringify({ ok: false, error: 'no ElevenLabs key on this deployment' })
      const vname = String(args.name || '').trim().slice(0, 60)
      const consent = String(args.consent || '').trim()
      const paths = [].concat(args.sample_paths || args.sample_path || []).map(x => String(x).trim()).filter(Boolean).slice(0, 5)
      if (!vname) return JSON.stringify({ ok: false, error: 'name required' })
      if (consent.length < 20) return JSON.stringify({ ok: false, error: 'consent required: who gave permission for this voice to be cloned, when, and how. No clone without it.' })
      if (!paths.length) return JSON.stringify({ ok: false, error: 'sample_path required: an audio file in the cabinet (files bucket)' })
      const form = new FormData()
      form.append('name', vname)
      form.append('description', String(args.description || `Cloned with permission: ${consent}`).slice(0, 500))
      if (args.remove_background_noise) form.append('remove_background_noise', 'true')
      let total = 0
      for (const sp of paths) {
        const got = await fetchObject('files', sp)
        if (!got) return JSON.stringify({ ok: false, error: `no such sample in the cabinet: ${sp}` })
        const buf = await got.arrayBuffer(); total += buf.byteLength
        form.append('files', new Blob([buf], { type: /\.wav$/i.test(sp) ? 'audio/wav' : /\.m4a$/i.test(sp) ? 'audio/mp4' : 'audio/mpeg' }), sp.split('/').pop())
      }
      const r = await fetch('https://api.elevenlabs.io/v1/voices/add', { method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, body: form })
      const j = await r.json().catch(() => null)
      if (!r.ok || !j?.voice_id) return JSON.stringify({ ok: false, error: `ElevenLabs clone -> ${r.status}: ${JSON.stringify(j).slice(0, 300)}` })
      try {
        const list = await voiceClones()
        await saveVoiceClones([...list, { at: new Date().toISOString(), name: vname, voice_id: j.voice_id, samples: paths, bytes: total, consent }])
      } catch (e) { console.warn('clone record', e.message) }
      return JSON.stringify({ ok: true, voice_id: j.voice_id, name: vname, requires_verification: !!j.requires_verification, sample_bytes: total, note: 'Cloned and saved to the ElevenLabs account. Nothing speaks in it until voice_sample is asked for, and Lumen\'s own voice has not changed.' })
    }
    case 'voice_sample': {
      if (!process.env.ELEVENLABS_API_KEY) return JSON.stringify({ ok: false, error: 'no ElevenLabs key on this deployment' })
      const vid = String(args.voice_id || '').trim(), text = String(args.text || '').trim()
      const label = String(args.label || 'Voice Sample').replace(/[^A-Za-z0-9 ·'-]/g, '').trim().slice(0, 50) || 'Voice Sample'
      if (!vid) return JSON.stringify({ ok: false, error: 'voice_id required' })
      if (text.length < 20 || text.length > 2500) return JSON.stringify({ ok: false, error: 'text: 20 to 2500 characters for the voice to say' })
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(vid)}?output_format=mp3_44100_128`, {
        method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
        // The delivery can move while the voice stays (David 11/12, on the Tanya clone: "a tad slower and tad more warmth"):
        // speed 0.7 to 1.2, stability (lower is more expressive), similarity, style (how far it leans into feeling).
        body: JSON.stringify({ text, model_id: String(args.model || 'eleven_multilingual_v2'), voice_settings: { stability: num01(args.stability, 0.5), similarity_boost: num01(args.similarity, 0.8), style: num01(args.style, 0.15), speed: Math.min(Math.max(Number(args.speed) || 1.0, 0.7), 1.2) } }),
      })
      if (!r.ok) return JSON.stringify({ ok: false, error: `ElevenLabs speech -> ${r.status}: ${(await r.text()).slice(0, 300)}` })
      const bytes = new Uint8Array(await r.arrayBuffer())
      const path = String(args.path || '').startsWith('Lumen/') ? String(args.path) : `Lumen/Voice Candidates/${chiToday()}/${label.replace(/[^A-Za-z0-9 '-]/g, '').replace(/\s+/g, ' ').trim()}.mp3`  // storage refuses a middle dot in a file name
      const row = { voice_id: vid, label, path, bytes: bytes.length, settings: { speed: args.speed ?? 1.0, stability: args.stability ?? 0.5, similarity: args.similarity ?? 0.8, style: args.style ?? 0.15, model: args.model || 'eleven_multilingual_v2' } }
      try { await putFile(path, bytes, 'audio/mpeg') } catch (e) { row.kept = `not kept: ${e.message}` }
      if (args.send === true) {
        const to = davidNumber()
        try { await waSendText(to, label); row.sent = await waSendAudio(to, bytes) || true } catch (e) { row.sent = `not sent: ${String(e.message || e).slice(0, 160)}` }
      }
      return JSON.stringify({ ok: true, ...row })
    }
    case 'remove_voice': {
      if (!process.env.ELEVENLABS_API_KEY) return JSON.stringify({ ok: false, error: 'no ElevenLabs key on this deployment' })
      const vid = String(args.voice_id || '').trim()
      const list = await voiceClones()
      // Only a voice this door cloned can be taken out here; the designed voices and anything else are not touched.
      if (!vid || !list.some(c => c.voice_id === vid && !c.removed_at)) return JSON.stringify({ ok: false, error: 'not a clone on record; only a voice made by clone_voice can be removed here' })
      const r = await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(vid)}`, { method: 'DELETE', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY } })
      if (!r.ok) return JSON.stringify({ ok: false, error: `ElevenLabs remove -> ${r.status}: ${(await r.text()).slice(0, 300)}` })
      await saveVoiceClones(list.map(c => c.voice_id === vid ? { ...c, removed_at: new Date().toISOString(), removed_why: String(args.why || '').slice(0, 200) || null } : c))
      return JSON.stringify({ ok: true, voice_id: vid, note: 'Removed from the ElevenLabs account. The sample file in the cabinet is still there.' })
    }
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}
