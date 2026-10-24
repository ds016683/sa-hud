// One detail view for every discrete thing on the Board: a Main Mission task,
// a Side Mission, an impromptu, a Claude session, a calendar event. Laid out
// like the mission page: title, a line under it, four pills across the right
// (David 10/23: Briefing · Live Protocols · Files · Notes). Every item of every
// kind carries the same four. Briefing holds Polaris and the evidence pinned
// under it, Where It Stands, Sessions, the facts and the marks. Live Protocols
// shows whatever checklist is running on the item. Files is the one place its
// files live. Notes is the meetings and the item's own notes.
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Play, Pause, Archive, ExternalLink, Mic, Map as MapIcon, Check, Plus, Trash2, Terminal, Star, CornerLeftUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listArtifacts, readArtifact, writeArtifact } from '../../lib/artifacts'
import { fetchLoadout, equip, holster, stash, equipObjective, equipTask, fmtClock, SIZES } from '../../lib/loadout'
import DocView from './DocView'
import { stepsMaxFor } from '../../lib/objectives'
import { fetchSteps, addStep, toggleStep, removeStep, listObjectiveArtifacts, listObjectiveFiles, listObjectiveBoards, provenance, realmOf, setSize, updateObjective } from '../../lib/objectives'
import { renderMarkdown } from './MeetingCloseout'
import SessionBoard from './SessionBoard'
import { recall } from '../../lib/recall'
import { fmtStamp, listLiveFiles, listEvidence, openLiveFile, isRequest, isLink } from '../../lib/livefiles'
import ProtocolsTab from './Protocols'
import { isOpenRow } from '../../lib/protocols'
import FilesTab from './Files'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, RED, MONO, SERIF, S, Label, KIND_COLOR, KindIcon, NORTH_STAR_LABEL, NORTH_STAR_ASK, LABEL, PURPLE } from './canon'

const NAVY_DEEP = '#0A1B2B'
const TABS = ['overview', 'protocols', 'files', 'notes']
const TAB_LABEL = { overview: 'Briefing', protocols: 'Live Protocols', files: 'Files', notes: 'Notes' }
// Deep links and callers from before 10/23 still name the old pills.
const LEGACY_TAB = { punchlist: 'protocols', workbench: 'files', artifacts: 'files', production: 'files', sessions: 'overview' }
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'about', 'notes', 'upload', 'interview', 'call', 'meeting', 'review', 'investigate', 'weekly', 'monthly', 'david', 'smith'])
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
const chiTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

function Pill({ active, children, onClick, count }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
      background: active ? BLUE : 'transparent', color: active ? NAVY_DEEP : 'rgba(234,241,248,0.66)', border: active ? `1px solid ${BLUE}` : `1px solid ${PANEL_BORDER}`,
      display: 'inline-flex', alignItems: 'center', gap: 6,
    }}>{children}{count > 0 && <span style={{ fontSize: 9, opacity: 0.8 }}>· {count}</span>}</button>
  )
}
const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '6px 11px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent', color: filled ? NAVY_DEEP : color, cursor: 'pointer',
})
const rowStyle = { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: `1px solid ${PANEL_BORDER}` }
const None = ({ what }) => <div style={{ fontSize: 13, color: GRAY, padding: '14px 0' }}>This {what.item} doesn't call for {what.thing}.</div>

// Everything the item connects to, loaded once.
async function loadRelated(item) {
  const out = { project: null, task: null, artifacts: [], boards: [], projectFiles: [], storeFiles: [], meetings: [], loadout: null, objective: null, steps: [], objArtifacts: [], objFiles: [], objBoards: [], punchlist: [] }
  let task = null
  // A Side Mission is an object of its own: the row, its steps, and its pockets.
  if (item.objective_id) {
    const [{ data: orow }, steps, oa, of, ob] = await Promise.all([
      supabase.from('objectives').select('*').eq('id', item.objective_id).limit(1),
      fetchSteps(item.objective_id), listObjectiveArtifacts(item.objective_id), listObjectiveFiles(item.objective_id), listObjectiveBoards(item.objective_id),
    ])
    out.objective = orow?.[0] || null; out.steps = steps; out.objArtifacts = oa; out.objFiles = of; out.objBoards = ob
    // The Editing Protocol punchlist (10/22): count only; the pill loads the rows.
    try { const { data: pl } = await supabase.from('edit_punchlist').select('*').eq('objective_id', item.objective_id); out.punchlist = pl || [] } catch { out.punchlist = [] }
    // Evidence (10/23): the files pinned under Polaris as the proof the objective was met.
    try { out.evidence = await listEvidence({ objectiveId: item.objective_id }) } catch { out.evidence = [] }
  }
  if (item.task_id) { const { data } = await supabase.from('project_tasks').select('id,text,notes,status,due_date,project_id,session_ref,objective_id').eq('id', item.task_id).limit(1); task = data?.[0] || null }
  else if (item.objective_id) { const { data } = await supabase.from('project_tasks').select('id,text,notes,status,due_date,project_id,session_ref,objective_id').eq('objective_id', item.objective_id).limit(1); task = data?.[0] || null }
  out.task = task
  let pid = item.project_id || task?.project_id || null
  if (!pid && item.kind === 'Session') {
    const key = String(item.title || '').split('·').pop().trim()
    if (key) { const { data } = await supabase.from('projects').select('id').or(`key.eq.${key},name.eq.${key}`).limit(1); pid = data?.[0]?.id || null }
  }
  if (pid) {
    const { data: p } = await supabase.from('projects').select('id,name,key,description').eq('id', pid).single()
    out.project = p || null
    try {
      const list = await listArtifacts(pid)
      out.artifacts = await Promise.all(list.map(async a => { try { const d = await readArtifact(pid, a.slug); return { slug: a.slug, title: d.title || a.slug, task_id: d.task_id || null, updated_at: d.updated_at } } catch { return { slug: a.slug, title: a.slug, task_id: null } } }))
    } catch { out.artifacts = [] }
    if (p) {
      const { data: sb } = await supabase.from('session_boards').select('id,project,title,updated_at,phases').or(`project.eq.${p.key || p.name},project.eq.${p.name}`).order('updated_at', { ascending: false }).limit(8)
      out.boards = (sb || []).map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, project: b.project, title: b.title, updated_at: b.updated_at, phases: b.phases || [], linked: !!task && (ts.some(t => t.task_id === task.id) || task.session_ref === b.id || task.session_ref === b.title), done: ts.filter(t => t.status === 'done').length, total: ts.length } })
      const { data: pf } = await supabase.storage.from('project-files').list(pid, { limit: 100 })
      out.projectFiles = (pf || []).filter(f => f.id !== null && !f.name.endsWith('.json')).map(f => ({ name: f.name, path: `${pid}/${f.name}`, bucket: 'project-files' }))
      const { data: sf } = await supabase.storage.from('files').list(p.name, { limit: 100 })
      out.storeFiles = (sf || []).map(f => ({ name: f.name, folder: f.id === null, path: `${p.name}/${f.name}`, bucket: 'files' }))
    }
  }
  // Decisions live on the standing mission "Decisions" and point at the board item they serve.
  try {
    const { data: dp } = await supabase.from('projects').select('id,name').eq('key', 'Decisions').limit(1)
    const dproj = dp?.[0]
    if (dproj && dproj.id !== pid) {
      const list = await listArtifacts(dproj.id)
      const docs = await Promise.all(list.map(async a => { try { const d = await readArtifact(dproj.id, a.slug); return { slug: a.slug, title: d.title || a.slug, task_id: d.task_id || null, objective_id: d.objective_id || null, project_id: dproj.id, decision: true } } catch { return null } }))
      const mine = docs.filter(d => d && ((item.objective_id && d.objective_id === item.objective_id) || (item.task_id && d.task_id === item.task_id) || d.objective_id === item.id))
      out.artifacts = [...out.artifacts, ...mine]
      out.decisionsProject = dproj
    }
  } catch { /* no decisions */ }
  const ws = [...new Set([...words(item.title), ...words(out.project?.name)])].slice(0, 6)
  if (ws.length) {
    const since = new Date(Date.now() - 60 * 86400e3).toISOString().slice(0, 10)
    const { data: gm } = await supabase.from('granola_meetings').select('id,title,meeting_date,summary').gte('meeting_date', since).or(ws.map(w => `title.ilike.%${w}%`).join(',')).order('meeting_date', { ascending: false }).limit(8)
    out.meetings = gm || []
  }
  if (item.event?.notes) out.meetings = [item.event.notes, ...out.meetings.filter(m => m.id !== item.event.notes.id)]
  try { out.loadout = await fetchLoadout() } catch { out.loadout = null }
  return out
}

// Where It Stands (David, 10/17): above the facts, two lists. Done: the gates
// or marks ticked, the board items closed, what was produced. Still needed:
// the open gates, the open board items, and Lumen's two or three next steps
// toward the star (the same brain as the Loadout card, loaded after).

// Sessions (David 10/22): reopen the Claude Code session that worked this item, or
// copy a terminal command that starts one briefed. The reopen links are launch links
// in Live Files (claude://claude.ai/epitaxy/local_<session id>) that focus.py leaves on
// the item; the note carries the resume command. The briefed command is built here.
const isSessionLink = (r) => isLink(r) && /^claude:\/\//.test(String(r.path || ''))
function SessionsStrip({ item, links }) {
  const [copied, setCopied] = useState(null)
  const copy = async (key, text) => { try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1600) } catch { /* no clipboard */ } }
  const sessions = (links || []).filter(isSessionLink).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
  const cwdOf = (r) => (String(r?.note || '').match(/^cd "([^"]+)"/) || [])[1] || null
  const cwd = cwdOf(sessions[0]) || '~/builds/sa-hud'
  const oid = item.objective_id || item.id
  const brief = `cd "${cwd}" && claude "Pick up the ${item.kind || 'Side Mission'} '${String(item.title || '').replace(/"/g, "'")}' (${oid}): read its briefing with get_objectives and list_steps, its files with list_live_files, then continue from Still Needed. Set the focus on it first."`
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: LABEL }}>Sessions</span>
        <button onClick={() => copy('brief', brief)} title={brief} style={{ ...btn(BLUE), padding: '5px 10px' }}><Terminal size={11} /> {copied === 'brief' ? 'Copied' : 'Copy a Briefed Start'}</button>
      </div>
      {sessions.length === 0 && <div style={{ fontSize: 12.5, color: GRAY, marginTop: 6 }}>No Claude session has worked this item yet. The command above starts one briefed; paste it in a terminal.</div>}
      {sessions.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          <span style={{ fontSize: 13, color: INK, flex: 1, minWidth: 200 }}>{String(r.name || '').replace(/^Claude session · /, '')}<span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, marginLeft: 8 }}>{fmtStamp(r.created_at)}</span></span>
          <a href={r.path} title="Open this session in the Claude desktop app" style={{ ...btn(PURPLE, true), padding: '5px 10px', textDecoration: 'none' }}><ExternalLink size={11} /> Reopen in Claude</a>
          {r.note && <button onClick={() => copy(r.id, r.note)} title={r.note} style={{ ...btn(INK2), padding: '5px 10px' }}><Terminal size={11} /> {copied === r.id ? 'Copied' : 'Copy Resume Command'}</button>}
        </div>
      ))}
    </div>
  )
}

// Evidence (David 10/23): the files pinned under Polaris as the proof the
// objective was met. They lead the close-out record. Pinning happens in Files.
function Evidence({ rows, onFiles, say }) {
  const openRow = async (r) => { try { if (isLink(r)) { window.open(r.path, '_blank', 'noopener'); return } window.open(await openLiveFile(r), '_blank', 'noopener') } catch (e) { say(`Could not open: ${e.message}`) } }
  return (
    <div style={{ marginTop: 10, paddingLeft: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: rows.length ? 4 : 0 }}>
        <Star size={11} color={GOLD_BRIGHT} fill={rows.length ? GOLD_BRIGHT : 'none'} />
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: rows.length ? GOLD_BRIGHT : LABEL }}>Evidence{rows.length ? ` · ${rows.length}` : ''}</span>
        {!rows.length && <span style={{ fontSize: 12.5, color: GRAY }}>nothing pinned yet; when the thing that proves the star exists, pin it under <button onClick={onFiles} style={{ background: 'transparent', border: 'none', color: BLUE, cursor: 'pointer', padding: 0, fontSize: 12.5, fontFamily: 'inherit' }}>Files</button></span>}
      </div>
      {rows.map(r => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: GOLD_BRIGHT, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13.5, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.version > 1 && <span style={{ fontFamily: MONO, fontSize: 9, color: GOLD, marginLeft: 8 }}>v{r.version}</span>}</span>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{fmtStamp(r.created_at)}</span>
          <button onClick={() => openRow(r)} style={btn(GOLD_BRIGHT)}><ExternalLink size={11} /> Open</button>
        </div>
      ))}
    </div>
  )
}

function WhereItStands({ item, rel, task, taskId, linkedBoards }) {
  const [next, setNext] = useState(null)
  const [thinking, setThinking] = useState(false)
  const oid = item.objective_id || (item.kind !== 'Main Mission' && item.kind !== 'Event' && item.kind !== 'Session' ? item.id : null)
  useEffect(() => {
    let on = true
    if (!oid && !taskId) { Promise.resolve().then(() => { if (on) setNext([]) }); return () => { on = false } }
    Promise.resolve().then(() => { if (on) setThinking(true) })
    recall({ objective_id: oid, task_id: taskId }).then(r => { if (on) setNext(Array.isArray(r?.next) ? r.next : []) }).catch(() => { if (on) setNext([]) }).finally(() => { if (on) setThinking(false) })
    return () => { on = false }
  }, [oid, taskId])
  const steps = Array.isArray(rel.steps) ? rel.steps : []
  const boardItems = []
  for (const b of linkedBoards) for (const ph of (b.phases || [])) {
    const phTied = !taskId || ph.task_id === taskId || (ph.tasks || []).some(t => t.task_id === taskId)
    if (!phTied) continue
    for (const t of (ph.tasks || [])) boardItems.push({ ...t, board: b.title })
  }
  const done = [
    ...steps.filter(st => st.done).map(st => ({ text: st.text, meta: st.done_at ? chiTime(st.done_at) : null, kind: 'gate' })),
    ...boardItems.filter(t => t.status === 'done').map(t => ({ text: t.label, meta: t.id, kind: 'board' })),
    ...(rel.objArtifacts || []).map(a => ({ text: a.title || a.slug, meta: 'artifact', kind: 'made' })),
    ...(rel.artifacts || []).filter(a => taskId && a.task_id === taskId).map(a => ({ text: a.title || a.slug, meta: 'artifact', kind: 'made' })),
    ...(rel.objFiles || []).map(f => ({ text: f.name, meta: 'file', kind: 'made' })),
  ]
  const needed = [
    ...steps.filter(st => !st.done).map(st => ({ text: st.text, meta: null, kind: 'gate' })),
    ...boardItems.filter(t => t.status !== 'done').map(t => ({ text: t.label, meta: t.status === 'blocked' ? (t.note || 'blocked') : t.status === 'inmotion' ? 'in motion' : t.id, kind: t.status === 'blocked' ? 'blocked' : 'board' })),
  ]
  if (task && task.status === 'done') done.unshift({ text: 'Milestone closed', meta: task.released_at ? new Date(task.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null, kind: 'board' })
  const Row = ({ r, color }) => (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '4px 0' }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: color, marginTop: 7, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, flex: 1 }}>{r.text}{r.meta && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: r.kind === 'blocked' ? RED : GRAY, marginLeft: 8 }}>{r.meta}</span>}</span>
    </div>
  )
  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
      <Label>Where It Stands</Label>
      <div style={{ display: 'grid', gridTemplateColumns: done.length ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr', gap: 22 }}>
        {done.length > 0 && (
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: GREEN, marginBottom: 5 }}>Done</div>
            {done.map((r, i) => <Row key={i} r={r} color={GREEN} />)}
          </div>
        )}
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: GOLD, marginBottom: 5 }}>Still Needed</div>
          {needed.map((r, i) => <Row key={i} r={r} color={r.kind === 'blocked' ? RED : GOLD} />)}
          {thinking && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, padding: '4px 0' }}>Lumen is reading the trail</div>}
          {!thinking && (next || []).map((t, i) => <div key={`n${i}`} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '4px 0' }}><span style={{ width: 6, height: 6, borderRadius: 99, border: `1px solid ${BLUE}`, marginTop: 7, flexShrink: 0 }} /><span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK2, fontStyle: 'italic', flex: 1 }}>{t}<span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: BLUE, marginLeft: 8, fontStyle: 'normal' }}>Lumen</span></span></div>)}
          {!thinking && !needed.length && !(next || []).length && <div style={{ fontSize: 13, color: GRAY, padding: '4px 0' }}>Nothing open. If the star is true, extract it.</div>}
        </div>
      </div>
    </div>
  )
}

export default function ItemDetail({ item, onClose, onNavigate, onChange, initialTab = 'overview' }) {
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : (LEGACY_TAB[initialTab] || 'overview'))
  const [rel, setRel] = useState(null)
  const [msg, setMsg] = useState(null)
  const [openNote, setOpenNote] = useState(null)
  const [recentBoards, setRecentBoards] = useState([])
  const [requests, setRequests] = useState([])
  const objKey = item.objective_id || null
  useEffect(() => { let on = true; if (!objKey) { Promise.resolve().then(() => { if (on) setRequests([]) }); return () => { on = false } } listLiveFiles({ objectiveId: objKey }).then(r => { if (on) setRequests((r.rows || []).filter(x => isRequest(x) || isLink(x))) }).catch(() => {}); return () => { on = false } }, [objKey, rel])
  useEffect(() => { let on = true; supabase.from('session_boards').select('id,project,title,updated_at,board').order('updated_at', { ascending: false }).limit(24).then(({ data }) => { if (on) setRecentBoards(Array.isArray(data) ? data : []) }); return () => { on = false } }, [])
  const tieBoard = async (b) => { if (!obj) return; const { error } = await supabase.from('session_boards').update({ board: { ...(b.board || {}), objective_id: obj.id } }).eq('id', b.id); if (error) { setMsg(`Could not tie: ${error.message}`); return } setMsg(`Tied ${b.title}`); load() }
  const load = useCallback(() => loadRelated(item).then(setRel).catch(e => { console.warn('item detail', e.message); setRel({ project: null, task: null, artifacts: [], boards: [], projectFiles: [], storeFiles: [], meetings: [], loadout: null }) }), [item])
  useEffect(() => { load() }, [load])
  // hash deep link (David, 10/17): the open briefing rides the URL, so a refresh
  // lands back on it. #/<page>/.../item/<objective id>
  useEffect(() => {
    const key = item.objective_id || (item.kind !== 'Event' && item.kind !== 'Session' ? item.id : null)
    if (!key) return
    const base = (window.location.hash || '#/river').replace(/\/item\/[^/]+$/, '')
    try { window.history.replaceState(window.history.state, '', `${base}/item/${encodeURIComponent(key)}`) } catch { /* no-op */ }
    return () => { try { if (/\/item\//.test(window.location.hash)) window.history.replaceState(window.history.state, '', (window.location.hash || '').replace(/\/item\/[^/]+$/, '') || '#/river') } catch { /* no-op */ } }
  }, [item.objective_id, item.id, item.kind])
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const task = rel?.task
  const taskId = item.task_id || task?.id || null
  const linkedBoards = [...(rel?.objBoards || []), ...(rel?.boards || []).filter(b => b.linked)]
  const loaded = rel?.loadout?.items.find(i => i.id === (item.objective_id || item.id)) || null
  const what = { item: item.kind === 'Event' ? 'meeting' : item.kind === 'Main Mission' ? 'task' : item.kind === 'Session' ? 'session' : 'mission' }

  const act = async (fn, after) => { try { await fn(); setMsg(after); await load(); onChange && onChange() } catch (e) { setMsg(`Could not do that: ${e.message}`) } }
  const open = async (bucket, path) => { const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 600); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener') }
  const go = (segs) => { onClose(); onNavigate && onNavigate('main-missions', segs) }
  const attachArtifact = async (slug) => { if (!rel?.project || !taskId) return; const doc = await readArtifact(rel.project.id, slug); await writeArtifact(rel.project.id, slug, { ...doc, task_id: taskId }); setMsg(`Attached ${doc.title || slug}`); load() }
  const startTimer = () => act(async () => {
    if (loaded) return equip(loaded.id)
    if (item.objective_id) { const r = await equipObjective(item.objective_id); if (!r.ok) throw new Error(r.reasons.join('; ')) ; return }
    if (task) { const r = await equipTask(task, rel?.project?.name); if (!r.ok) throw new Error(r.reasons.join('; ')); return }
    throw new Error('nothing to load')
  }, 'Timer on')

  const counts = { protocols: (rel?.punchlist || []).filter(isOpenRow).length, files: (rel?.objFiles?.length || 0) + (rel?.projectFiles.length || 0) + (rel?.storeFiles.filter(f => !f.folder).length || 0), notes: rel?.meetings.length || 0 }
  const obj = rel?.objective || null
  const [stepText, setStepText] = useState('')
  const [objBusy, setObjBusy] = useState(false)
  const [editStar, setEditStar] = useState(false)
  const [reading, setReading] = useState(null)
  const [briefs, setBriefs] = useState({})
  const readObjArtifact = useCallback(async (root, slug) => { const { data, error } = await supabase.storage.from('project-files').download(`${root}/artifacts/${slug}.json`); if (error) throw new Error(error.message); return JSON.parse(await data.text()) }, [])
  useEffect(() => { let on = true; const objArts = (rel?.objArtifacts || []); Promise.all(objArts.map(a => readObjArtifact(a.root || `objectives/${obj?.id}`, a.slug).then(d => [a.slug, d]).catch(() => [a.slug, null]))).then(ps => { if (on) setBriefs(Object.fromEntries(ps)) }); return () => { on = false } }, [rel, obj, readObjArtifact])
  const patchObj = async (patch) => { try { await updateObjective(obj.id, patch); await load(); onChange && onChange() } catch (e) { setMsg(`Could not save: ${e.message}`) } }
  const addStepNow = async () => { const t = stepText.trim(); if (!t || !obj) return; setObjBusy(true); try { const r = await addStep(obj.id, t, (rel.steps || []).length); if (r === null) setMsg('Steps are not set up yet: run sql/2026-10-07-side-missions-archive.sql'); setStepText(''); await load() } catch (e) { setMsg(`Could not add: ${e.message}`) } finally { setObjBusy(false) } }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 240, overflowY: 'auto', background: 'linear-gradient(180deg, #0F2A40 0%, #0A1B2B 100%)' }}>
      {reading && (
        <div onClick={() => setReading(null)} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(5,16,28,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: '#10273B', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px', display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <h3 style={{ flex: 1, fontFamily: SERIF, fontWeight: 500, fontSize: 22, color: '#fff', margin: 0, lineHeight: 1.25 }}>{reading.doc?.title || reading.title}</h3>
              <button onClick={() => setReading(null)} style={btn(INK2)}>Close</button>
            </div>
            <DocView doc={reading.doc} />
          </div>
        </div>
      )}
      <div style={{ ...S.page, maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={onClose} style={btn(INK2)}><ArrowLeft size={13} /> Back</button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {item.kind !== 'Event' && item.kind !== 'Session' && (loaded
              ? (loaded.equipped
                ? <button onClick={() => act(() => holster(loaded.id), 'Timer off')} style={btn(GREEN, true)}><Pause size={12} /> Timer on · {fmtClock(loaded.minutes_today)}</button>
                : <button onClick={() => act(() => equip(loaded.id), 'Timer on')} style={btn(GREEN)}><Play size={12} /> Timer off · {fmtClock(loaded.minutes_today)}</button>)
              : <button onClick={startTimer} style={btn(GREEN)}><Play size={12} /> Load and start timer</button>)}
            {loaded && <button onClick={() => act(() => stash(loaded.id), 'Stashed')} style={btn(INK2)}><Archive size={12} /> Stash</button>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 22 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: KIND_COLOR[item.kind] || INK2, display: 'inline-flex', alignItems: 'center', gap: 7 }}><KindIcon kind={item.kind} size={14} />{item.kind}</span>
              {(rel?.project || item.project) && (rel?.project
                ? <button onClick={() => go([rel.project.id])} title="Up to the mission card" style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 15, fontWeight: 600, color: INK, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6, borderBottom: `1px dashed ${LABEL}66` }}>· {rel.project.name} <CornerLeftUp size={12} color={LABEL} /></button>
                : <span style={{ fontSize: 15, fontWeight: 600, color: INK }}>· {item.project}</span>)}
              {task && <span style={{ fontSize: 15, fontWeight: 600, color: INK2 }}>· Milestone{String(task.text || '').match(/^\s*(\d+)\s*[·.:)-]/) ? ` ${String(task.text).match(/^\s*(\d+)\s*[·.:)-]/)[1]}` : ''}</span>}
              {item.size && !task && <span style={{ fontSize: 15, fontWeight: 600, color: INK2 }}>· {SIZES[item.size]?.label || item.size}</span>}
              {item.event && <span style={{ fontSize: 15, fontWeight: 600, color: INK2 }}>· {chiTime(item.event.start_at)}</span>}
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, marginLeft: 4 }}>Mission Briefing</span>
            </div>
            <h1 style={{ ...S.h1, marginBottom: 6, fontSize: String(item.title || '').length > 70 ? 22 : 28, lineHeight: 1.25 }}>{task ? String(item.title || '').replace(/^\s*\d+\s*[·.:)-]\s*/, '') : item.title}</h1>
          </div>
          <div style={{ display: 'flex', gap: 6, paddingBottom: 4, flexWrap: 'wrap' }}>
            {TABS.map(t => <Pill key={t} active={tab === t} onClick={() => setTab(t)} count={counts[t]}>{TAB_LABEL[t]}</Pill>)}
          </div>
        </div>

        <div style={{ ...S.panel, marginTop: 20 }}>
          {!rel && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, padding: '10px 0' }}>Reading the Ledger</div>}

          {rel && tab === 'overview' && (
            <div style={{ display: 'grid', gap: 22 }}>
              {obj && (() => { const prov = provenance(obj); const sz = SIZES[item.size] ? item.size : 'light'; const realm = realmOf(obj); const max = stepsMaxFor(sz); const field = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '6px 9px', fontFamily: MONO, fontSize: 12, height: 32, width: '100%', boxSizing: 'border-box' }; return (
                <>
                  <div>
                    <Label style={{ color: BLUE }}>{NORTH_STAR_LABEL}</Label>
                    {editStar || !obj.north_star
                      ? <textarea autoFocus={editStar} defaultValue={obj.north_star || ''} rows={2} onBlur={e => { const v = e.target.value.trim() || null; setEditStar(false); if (v !== (obj.north_star || null)) patchObj({ north_star: v }) }} placeholder={NORTH_STAR_ASK} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 17, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.45, resize: 'vertical' }} />
                      : <div onClick={() => setEditStar(true)} title="Click to edit" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: INK, borderLeft: `2px solid ${BLUE}`, paddingLeft: 12, cursor: 'text' }}>{obj.north_star}</div>}
                  </div>
                  <Evidence rows={rel.evidence || []} onFiles={() => setTab('files')} say={setMsg} />

                  <WhereItStands item={item} rel={rel} task={task} taskId={taskId} linkedBoards={linkedBoards} />
                  <SessionsStrip item={item} links={requests} />

                  {(() => { const seg = (on, color) => ({ ...btn(on ? color : INK2, on), padding: '5px 10px', whiteSpace: 'nowrap', borderRadius: 8 }); const cell = { display: 'grid', gap: 6, alignContent: 'start' }; return (
                    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, borderBottom: `1px solid ${PANEL_BORDER}`, padding: '14px 0', display: 'grid', gap: 16 }}>
                      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        {!task && <div style={cell}><Label style={{ marginBottom: 0 }}>Domain</Label><div style={{ display: 'flex', gap: 4 }}>{[['third-horizon', 'Third Horizon'], ['personal', 'Personal']].map(([k, l]) => <button key={k} onClick={() => patchObj({ tags: [...new Set([...(obj.tags || []).filter(t => t !== 'personal'), ...(k === 'personal' ? ['personal'] : [])])] })} style={seg(realm === k, k === 'personal' ? GOLD : BLUE)}>{l}</button>)}</div></div>}
                        {!task && <div style={cell}><Label style={{ marginBottom: 0 }}>Type</Label><div style={{ display: 'flex', gap: 4 }}>{Object.entries(SIZES).map(([k, sdef]) => <button key={k} onClick={() => setSize(obj.id, k).then(load)} title={sdef.sub} style={seg(sz === k, sdef.color)}>{sdef.label}</button>)}</div></div>}
                        {task && <div style={cell}><Label style={{ marginBottom: 0 }}>Milestone</Label><div style={{ fontSize: 13, color: INK2, paddingTop: 6 }}>10 miles at close{task.status === 'done' ? ' · closed' : ''}</div></div>}
                        <div style={cell}><Label style={{ marginBottom: 0 }}>Due</Label><input type="date" value={obj.due_date || ''} onChange={e => patchObj({ due_date: e.target.value || null })} style={{ ...field, width: 150 }} /></div>
                        <div style={cell}><Label style={{ marginBottom: 0 }}>Follow Up</Label><input type="date" value={obj.follow_up_date || ''} onChange={e => patchObj({ follow_up_date: e.target.value || null })} style={{ ...field, width: 150 }} /></div>
                        <div style={{ ...cell, flex: 1, minWidth: 180 }}><Label style={{ marginBottom: 0 }}>Who</Label><input defaultValue={obj.stakeholder || ''} onBlur={e => { if ((e.target.value || '') !== (obj.stakeholder || '')) patchObj({ stakeholder: e.target.value || null }) }} placeholder="the person this is for or with" style={{ ...field, fontFamily: 'inherit', fontSize: 13, width: '100%', maxWidth: 320 }} /></div>
                      </div>
                      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', fontSize: 13, color: INK2 }}>
                        <span><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: LABEL, marginRight: 8 }}>Captured</span>{obj.captured_at ? new Date(obj.captured_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'unknown'}<span style={{ color: GRAY }}> · {obj.state === 'released' ? `released ${obj.released_at ? obj.released_at.slice(0, 10) : ''}` : obj.state === 'active' ? 'on the Board' : (obj.tags || []).includes('stashed') ? 'in the Stash' : (obj.state || '').replace('_', ' ')}</span></span>
                        <span><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: LABEL, marginRight: 8 }}>From</span>{prov.label}{prov.label !== 'Added by hand' && prov.detail ? <span style={{ color: GRAY }}> · {prov.detail}</span> : null}</span>
                      </div>
                    </div>
                  ) })()}

                  {(item.description || obj.description) && <div><Label>Back Story</Label><div style={{ fontSize: 14.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{item.description || obj.description}</div></div>}

                  {!task && <div>
                    <Label>{sz === 'heavy' ? 'Gates · Mythic Tasks, 10 Miles Each, Five At Most' : sz === 'medium' ? 'Marks · What Has To Happen, Three At Most' : 'Marks'}</Label>
                    {max === 0 && <div style={{ fontSize: 13, color: GRAY }}>A Bounty is one action and carries no marks.</div>}
                    {max > 0 && rel.steps === null && <div style={{ fontSize: 12.5, color: GRAY }}>Steps are not set up yet. Run sql/2026-10-07-side-missions-archive.sql in the Ledger and they appear here.</div>}
                    {max > 0 && Array.isArray(rel.steps) && rel.steps.map((st, i) => (
                      <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                        <button onClick={() => toggleStep(st.id, !st.done).then(load)} aria-label={st.done ? 'Undo' : 'Done'} style={{ width: 18, height: 18, borderRadius: 999, border: `1px solid ${st.done ? GREEN : 'rgba(255,255,255,0.3)'}`, background: st.done ? `${GREEN}22` : 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{st.done && <Check size={11} color={GREEN} />}</button>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD, width: 14 }}>{i + 1}</span>
                        <span style={{ flex: 1, fontSize: 14, color: st.done ? GRAY : INK, textDecoration: st.done ? 'line-through' : 'none' }}>{st.text}</span>
                        {st.done_at && <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{chiTime(st.done_at)}</span>}
                        <button onClick={() => removeStep(st.id).then(load)} aria-label="Remove" style={{ background: 'transparent', border: 'none', color: GRAY, cursor: 'pointer', padding: 2 }}><Trash2 size={11} /></button>
                      </div>
                    ))}
                    {max > 0 && Array.isArray(rel.steps) && rel.steps.length < max && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input value={stepText} onChange={e => setStepText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addStepNow() }} placeholder={rel.steps.length ? `${sz === 'heavy' ? 'gate' : 'mark'} ${rel.steps.length + 1} of ${max}: something that can be seen to have happened` : `the first thing that has to happen (1 of ${max}): a decision marked, a conversation had, a thing produced`} disabled={objBusy} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '7px 10px', fontSize: 13, fontFamily: 'inherit' }} />
                        <button onClick={addStepNow} disabled={objBusy || !stepText.trim()} style={btn(BLUE, false)}><Plus size={11} /> Add</button>
                      </div>
                    )}
                    {max > 0 && Array.isArray(rel.steps) && rel.steps.length >= max && <div style={{ fontSize: 12, color: GRAY, marginTop: 8 }}>{sz === 'heavy' ? 'Five gates is the Mythic’s limit. A sixth means this is a Main Mission: promote it.' : 'Three marks is a Contract’s limit. More than that is a Mythic.'}</div>}
                  </div>}

                </>
              ) })()}
              {!obj && item.kind !== 'Event' && item.kind !== 'Session' && <WhereItStands item={item} rel={rel} task={task} taskId={taskId} linkedBoards={linkedBoards} />}
              {!obj && (item.description || task?.notes) && <div><Label>Back Story</Label><div style={{ fontSize: 14.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{item.description || task.notes}</div></div>}
              {item.event && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                  <div><Label>When</Label><div style={{ fontSize: 13, color: INK }}>{chiTime(item.event.start_at)} to {chiTime(item.event.end_at)} CT</div></div>
                  <div><Label>Organizer</Label><div style={{ fontSize: 13, color: INK }}>{item.event.organizer || 'unknown'}</div></div>
                  <div style={{ gridColumn: '1 / -1' }}><Label>Attendees</Label><div style={{ fontSize: 13, color: INK2, lineHeight: 1.6 }}>{(item.event.attendees || []).map(a => a?.name || a?.email || a).filter(Boolean).join(', ') || 'none listed'}</div></div>
                </div>
              )}
              {rel.project && (
                <div>
                  <Label>Mission</Label>
                  <button onClick={() => go([rel.project.id])} style={btn(GOLD)}><MapIcon size={12} /> {rel.project.name}</button>
                </div>
              )}
              {task && (
                <div>
                  <Label>Task</Label>
                  <div style={{ fontSize: 13, color: INK }}>{task.text}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textTransform: 'uppercase', marginTop: 4 }}>{task.status}{task.due_date ? ` · due ${task.due_date}` : ''}</div>
                </div>
              )}
              {loaded && (
                <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', alignItems: 'flex-end', borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
                  <div><Label>Clock Today</Label><div style={{ fontFamily: SERIF, fontSize: 20, color: loaded.equipped ? GREEN : INK }}>{fmtClock(loaded.minutes_today)}</div></div>
                  <div><Label>State</Label><div style={{ fontFamily: SERIF, fontSize: 20, color: INK }}>{loaded.equipped ? 'Equipped' : 'Holstered'}</div></div>
                </div>
              )}
              {(() => { const b = linkedBoards[0] || (task ? (rel.boards || [])[0] : null); return b && item.kind !== 'Event' ? (
                <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 16 }}>
                  <Label>{taskId ? 'Milestone Board · Claude’s Steps On This Milestone' : 'Session Board'}</Label>
                  {!b.linked && !(rel.objBoards || []).length && <div style={{ fontSize: 12.5, color: GRAY, marginBottom: 8 }}>Claude's latest board on the mission; nothing on it is tied to this {what.item} yet.</div>}
                  <SessionBoard key={b.id} board={b} compact focusTaskId={taskId} onChange={() => onChange && onChange()} />
                </div>
              ) : (obj && item.kind !== 'Event' ? (
                <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
                  <Label>Session Board</Label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13, color: GRAY }}>
                    <span>No Claude board is tied to this {what.item} yet. Tie the session that is working it:</span>
                    <select defaultValue="" onChange={e => { const b = recentBoards.find(x => x.id === e.target.value); if (b) tieBoard(b) }} style={{ background: '#0A1B2B', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 7, padding: '4px 8px', fontSize: 12, maxWidth: 360 }}>
                      <option value="">Pick a recent board…</option>
                      {recentBoards.map(b => <option key={b.id} value={b.id}>{b.project} · {b.title}</option>)}
                    </select>
                  </div>
                </div>
              ) : null) })()}
              {!item.description && !task?.notes && !rel.project && !item.event && !loaded && !obj && <div style={{ fontSize: 13, color: GRAY }}>No back story on this one yet.</div>}
            </div>
          )}

          {rel && tab === 'protocols' && (item.objective_id ? <ProtocolsTab objectiveId={item.objective_id} /> : <None what={{ ...what, thing: 'a protocol' }} />)}

          {rel && tab === 'files' && <FilesTab objectiveId={item.objective_id || null} rel={rel} what={what} open={open} taskId={taskId} onRead={async (a) => { try { setReading({ title: a.title, doc: briefs[a.slug] || await readObjArtifact(a.root, a.slug) }) } catch (e) { setMsg(`Could not read: ${e.message}`) } }} onGo={go} onAttach={attachArtifact} onChanged={load} />}

          {rel && tab === 'notes' && (
            <div style={{ display: 'grid', gap: 18 }}>
              {obj && (
                <div>
                  <Label>Notes On This {what.item === 'task' ? 'Milestone' : 'Mission'}</Label>
                  <textarea defaultValue={obj.notes || ''} rows={4} onBlur={e => { const v = e.target.value.trim() || null; if (v !== (obj.notes || null)) patchObj({ notes: v }) }} placeholder="A thought with nowhere else to land. Saved when you click away." style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
                </div>
              )}
              <div>
              {rel.meetings.map(m => (
                <div key={m.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '10px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setOpenNote(openNote === m.id ? null : m.id)}>
                    <Mic size={14} color={INK2} /><span style={{ flex: 1, fontSize: 13.5, color: INK }}>{m.title}</span><span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{m.meeting_date}</span>
                  </div>
                  {openNote === m.id && <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.65, color: INK2 }}>{m.summary ? renderMarkdown(m.summary) : <span style={{ color: GRAY }}>No summary stored.</span>}</div>}
                </div>
              ))}
              {!rel.meetings.length && <None what={{ ...what, thing: 'meeting notes' }} />}
              </div>
            </div>
          )}

          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, marginTop: 14 }}>{msg}</div>}
        </div>
      </div>
    </div>
  )
}
