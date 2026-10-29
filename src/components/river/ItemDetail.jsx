// One detail view for every discrete thing on the Board: a Main Mission task,
// a Side Mission, an impromptu, a Claude session, a calendar event. Laid out
// like the mission page: title, a line under it, four pills across the right
// (David 10/23: Briefing · Live Protocols · Files · Notes). Every item of every
// kind carries the same four. Briefing holds Polaris and the evidence pinned
// under it, Where It Stands, Sessions, the facts and the marks. Live Protocols
// shows whatever checklist is running on the item. Files is the one place its
// files live. Notes is the meetings and the item's own notes.
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Play, Pause, Archive, ExternalLink, Mic, Map as MapIcon, Check, Plus, Trash2, Terminal, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listArtifacts, readArtifact, writeArtifact } from '../../lib/artifacts'
import { fetchLoadout, equip, holster, stash, equipObjective, equipTask, fmtClock, SIZES } from '../../lib/loadout'
import DocView from './DocView'
import { stepsMaxFor } from '../../lib/objectives'
import { fetchSteps, addStep, toggleStep, removeStep, listObjectiveArtifacts, listObjectiveFiles, listObjectiveBoards, realmOf, setSize, updateObjective, objRoot, fetchMilestones } from '../../lib/objectives'
import { renderMarkdown } from './MeetingCloseout'
import SessionBoard from './SessionBoard'
import { recall } from '../../lib/recall'
import { fmtStamp, listLiveFiles, listEvidence, openLiveFile, isRequest, isLink } from '../../lib/livefiles'
import ProtocolsTab from './Protocols'
import { isOpenRow } from '../../lib/protocols'
import FilesTab from './Files'
import WorkbenchTab, { WorkbenchIntake } from './Workbench'
import WorkspacePages from './Workspace'
import MythicMilestones from './MythicMilestones'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, SUCCESS, RED, MONO, SERIF, S, Label, KIND_COLOR, KindIcon, NORTH_STAR_LABEL, NORTH_STAR_ASK, LABEL, MYTHIC, alpha, NAVY_DEEP, CARD_PILLS, CardPill, Trail } from './canon'

const TABS = CARD_PILLS.map(([id]) => id)
const TAB_LABEL = Object.fromEntries(CARD_PILLS)
// Deep links and callers from before 10/23 still name the old pills.
const LEGACY_TAB = { overview: 'briefing', protocols: 'workbench', punchlist: 'workbench', artifacts: 'files', production: 'files', sessions: 'briefing' }
const STOP = new Set(['the', 'and', 'with', 'for', 'from', 'about', 'notes', 'upload', 'interview', 'call', 'meeting', 'review', 'investigate', 'weekly', 'monthly', 'david', 'smith'])
const words = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
const chiTime = (iso) => iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''

const btn = (color = INK2, filled = false) => ({
  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '6px 11px', borderRadius: 8, border: `1px solid ${filled ? color : `${alpha(color, 40)}`}`, background: filled ? color : 'transparent', color: filled ? NAVY_DEEP : color, cursor: 'pointer',
})
// Equal-width pills on the facts row (David 10/29): one width fits Third Horizon, the longest label.
const PILL_W = 124
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
    // Mythic milestones (David 10/29): the children of a Mythic, and for a milestone, its parent and its number.
    try { out.children = await fetchMilestones(item.objective_id) } catch { out.children = [] }
    out.parent = null; out.milestoneN = null; out.milestoneOf = null
    if (out.objective?.parent_id) {
      try {
        const [{ data: prow }, sibs] = await Promise.all([supabase.from('objectives').select('id,title,effort,tags,state').eq('id', out.objective.parent_id).limit(1), fetchMilestones(out.objective.parent_id)])
        out.parent = prow?.[0] || null
        const ix = sibs.findIndex(k => k.id === item.objective_id)
        out.milestoneN = ix >= 0 ? ix + 1 : null; out.milestoneOf = sibs.length
      } catch { out.parent = null }
    }
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
  const latest = sessions.find(r => r.note) || null
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${PANEL_BORDER}` }}>
      <div style={{ fontSize: 14.5, fontWeight: 600, color: LABEL }}>Sessions</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
        <button onClick={() => copy('brief', brief)} title={brief} style={{ ...btn(BLUE), padding: '5px 10px' }}><Terminal size={11} /> {copied === 'brief' ? 'Copied' : 'Copy a Briefed Start'}</button>
        {latest && <button onClick={() => copy('resume', latest.note)} title={latest.note} style={{ ...btn(INK2), padding: '5px 10px' }}><Terminal size={11} /> {copied === 'resume' ? 'Copied' : 'Copy Resume Command'}</button>}
      </div>
      {sessions.length === 0 && <div style={{ fontSize: 12.5, color: GRAY, marginTop: 8 }}>No Claude session has worked this item yet. The Briefed Start begins one; paste it in a terminal.</div>}
      {sessions.map(r => (
        <div key={r.id} style={{ fontSize: 13, color: INK, marginTop: 8 }}>{String(r.name || '').replace(/^Claude session · /, '')}<span style={{ fontFamily: MONO, fontSize: 10, color: GRAY, marginLeft: 8 }}>{fmtStamp(r.created_at)}</span></div>
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
  const kids = Array.isArray(rel.children) ? rel.children : []
  const boardItems = []
  for (const b of linkedBoards) for (const ph of (b.phases || [])) {
    const phTied = !taskId || ph.task_id === taskId || (ph.tasks || []).some(t => t.task_id === taskId)
    if (!phTied) continue
    for (const t of (ph.tasks || [])) boardItems.push({ ...t, board: b.title })
  }
  const done = [
    ...kids.filter(k => k.state === 'released').map(k => ({ text: k.title, meta: k.released_at ? `milestone · ${new Date(k.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'milestone', kind: 'milestone' })),
    ...steps.filter(st => st.done).map(st => ({ text: st.text, meta: st.done_at ? chiTime(st.done_at) : null, kind: 'gate' })),
    ...boardItems.filter(t => t.status === 'done').map(t => ({ text: t.label, meta: t.id, kind: 'board' })),
    ...(rel.objArtifacts || []).map(a => ({ text: a.title || a.slug, meta: 'artifact', kind: 'made' })),
    ...(rel.artifacts || []).filter(a => taskId && a.task_id === taskId).map(a => ({ text: a.title || a.slug, meta: 'artifact', kind: 'made' })),
    ...(rel.objFiles || []).map(f => ({ text: f.name, meta: 'file', kind: 'made' })),
  ]
  const needed = [
    ...kids.filter(k => k.state !== 'released').map((k, i) => ({ text: k.title, meta: `milestone ${i + 1}`, kind: 'milestone' })),
    ...steps.filter(st => !st.done).map(st => ({ text: st.text, meta: null, kind: 'gate' })),
    ...boardItems.filter(t => t.status !== 'done').map(t => ({ text: t.label, meta: t.status === 'blocked' ? (t.note || 'blocked') : t.status === 'inmotion' ? 'in motion' : t.id, kind: t.status === 'blocked' ? 'blocked' : 'board' })),
  ]
  if (task && task.status === 'done') done.unshift({ text: 'Milestone closed', meta: task.released_at ? new Date(task.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null, kind: 'board' })
  // Done wears the type's color (David 10/29: a Contract's Done is the Contract blue); Still Needed stays gold.
  const doneColor = item.size && SIZES[item.size] ? SIZES[item.size].color : (KIND_COLOR[item.kind] || SUCCESS)
  const Row = ({ r, color, open }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, boxSizing: 'border-box', background: open ? 'transparent' : color, border: `1.5px solid ${color}`, marginTop: 6, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, flex: 1 }}>{r.text}{r.meta && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: r.kind === 'blocked' ? RED : GRAY, marginLeft: 8 }}>{r.meta}</span>}</span>
    </div>
  )
  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
      <Label>Where It Stands</Label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 22 }}>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: doneColor, marginBottom: 5 }}>Done</div>
          {done.length ? done.map((r, i) => <Row key={i} r={r} color={doneColor} />) : <div style={{ fontSize: 13, color: GRAY, padding: '4px 0' }}>Nothing ticked, closed or produced yet.</div>}
        </div>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: GOLD, marginBottom: 5 }}>Still Needed</div>
          {needed.map((r, i) => <Row key={i} r={r} color={r.kind === 'blocked' ? RED : GOLD} open />)}
          {thinking && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, padding: '4px 0' }}>Lumen is reading the trail</div>}
          {!thinking && (next || []).map((t, i) => <div key={`n${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}><span style={{ width: 9, height: 9, borderRadius: 99, boxSizing: 'border-box', border: `1.5px solid ${BLUE}`, marginTop: 6, flexShrink: 0 }} /><span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK2, fontStyle: 'italic', flex: 1 }}>{t}<span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: BLUE, marginLeft: 8, fontStyle: 'normal' }}>Lumen</span></span></div>)}
          {!thinking && !needed.length && !(next || []).length && <div style={{ fontSize: 13, color: GRAY, padding: '4px 0' }}>Nothing open. If the star is true, extract it.</div>}
        </div>
      </div>
    </div>
  )
}

export default function ItemDetail({ item, onClose, onNavigate, onChange, initialTab = 'overview' }) {
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : (LEGACY_TAB[initialTab] || 'briefing'))
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

  const counts = { workbench: (rel?.punchlist || []).filter(isOpenRow).length, polaris: (rel?.evidence || []).length, files: (rel?.objFiles?.length || 0) + (rel?.projectFiles.length || 0) + (rel?.storeFiles.filter(f => !f.folder).length || 0), notes: rel?.meetings.length || 0 }
  const obj = rel?.objective || null
  const [stepText, setStepText] = useState('')
  const [objBusy, setObjBusy] = useState(false)
  const [editStar, setEditStar] = useState(false)
  const [reading, setReading] = useState(null)
  const [openChild, setOpenChild] = useState(null)
  const [briefs, setBriefs] = useState({})
  const readObjArtifact = useCallback(async (root, slug) => { const { data, error } = await supabase.storage.from('project-files').download(`${root}/artifacts/${slug}.json`); if (error) throw new Error(error.message); return JSON.parse(await data.text()) }, [])
  useEffect(() => { let on = true; const objArts = (rel?.objArtifacts || []); Promise.all(objArts.map(a => readObjArtifact(a.root || `objectives/${obj?.id}`, a.slug).then(d => [a.slug, d]).catch(() => [a.slug, null]))).then(ps => { if (on) setBriefs(Object.fromEntries(ps)) }); return () => { on = false } }, [rel, obj, readObjArtifact])
  const patchObj = async (patch) => { try { await updateObjective(obj.id, patch); await load(); onChange && onChange() } catch (e) { setMsg(`Could not save: ${e.message}`) } }
  const addStepNow = async () => { const t = stepText.trim(); if (!t || !obj) return; setObjBusy(true); try { const r = await addStep(obj.id, t, (rel.steps || []).length); if (r === null) setMsg('Steps are not set up yet: run sql/2026-10-07-side-missions-archive.sql'); setStepText(''); await load() } catch (e) { setMsg(`Could not add: ${e.message}`) } finally { setObjBusy(false) } }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 240, overflowY: 'auto', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)' }}>
      {openChild && <ItemDetail item={{ id: openChild.m.id, objective_id: openChild.m.id, kind: 'Side Mission', title: openChild.m.title, description: openChild.m.description, tags: openChild.m.tags, size: 'light' }} onClose={() => { setOpenChild(null); load() }} onNavigate={onNavigate} onChange={load} />}
      {reading && (
        <div onClick={() => setReading(null)} style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(5,16,28,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(760px, 100%)', maxHeight: '88vh', overflowY: 'auto', background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '24px 26px', display: 'grid', gap: 14 }}>
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
            {item.kind !== 'Event' && item.kind !== 'Session' && !rel?.parent && (loaded
              ? (loaded.equipped
                ? <button onClick={() => act(() => holster(loaded.id), 'Timer off')} style={btn(GREEN, true)}><Pause size={12} /> Timer on · {fmtClock(loaded.minutes_today)}</button>
                : <button onClick={() => act(() => equip(loaded.id), 'Timer on')} style={btn(GREEN)}><Play size={12} /> Timer off · {fmtClock(loaded.minutes_today)}</button>)
              : <button onClick={startTimer} style={btn(GREEN)}><Play size={12} /> Load and start timer</button>)}
            {loaded && <button onClick={() => act(() => stash(loaded.id), 'Stashed')} style={btn(INK2)}><Archive size={12} /> Stash</button>}
          </div>
        </div>

        {(() => {
          // Header canon (David 10/29): the kind is the header and is bigger than the name it heads;
          // the type wears its icon beside it; the name runs the full width and wraps only when the
          // space is out. The trail above is navigation only.
          const nodes = []
          let head = item.kind
          let chip = null
          const nav = (route) => () => { onClose(); onNavigate && onNavigate(route) }
          if (task || rel?.project || item.project) {
            nodes.push({ label: 'Main Missions', onClick: nav('main-missions') })
            nodes.push({ label: rel?.project?.name || item.project, onClick: rel?.project ? () => go([rel.project.id]) : null })
            const n = String(task?.text || '').match(/^\s*(\d+)\s*[·.:)-]/)
            head = task ? `Milestone${n ? ` ${n[1]}` : ''}` : item.kind
            chip = { kind: 'Main Mission', label: 'Main Mission', color: KIND_COLOR['Main Mission'] }
          } else if (item.kind === 'Event' || item.kind === 'Session' || item.kind === 'Ad Hoc') {
            nodes.push({ label: 'Board', onClick: nav('agenda') })
            head = item.kind === 'Event' ? 'Meeting' : item.kind
            chip = item.kind === 'Event' ? { kind: 'Event', label: chiTime(item.event?.start_at), color: BLUE } : { kind: item.kind, label: item.kind, color: KIND_COLOR[item.kind] || BLUE }
          } else if (rel?.parent) {
            nodes.push({ label: 'Side Missions', onClick: nav('side-missions') })
            nodes.push({ label: rel.parent.title, onClick: onClose })
            head = rel.milestoneN ? `Milestone ${rel.milestoneN}` : 'Milestone'
            chip = { kind: 'Side Mission', label: 'Mythic', color: MYTHIC }
          } else {
            nodes.push({ label: 'Side Missions', onClick: nav('side-missions') })
            head = 'Side Mission'
            const sdef = item.size && SIZES[item.size] ? SIZES[item.size] : null
            chip = sdef ? { kind: 'Side Mission', label: sdef.label, color: sdef.color } : { kind: 'Side Mission', label: 'Side Mission', color: GOLD }
          }
          const name = task ? String(item.title || '').replace(/^\s*\d+\s*[·.:)-]\s*/, '') : item.title
          return (
            <div style={{ marginTop: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Trail nodes={nodes} />
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TABS.map(t => <CardPill key={t} active={tab === t} onClick={() => setTab(t)} count={counts[t]}>{TAB_LABEL[t]}</CardPill>)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 16 }}>
                <h1 style={{ ...S.h1, fontSize: 28, lineHeight: 1.2 }}>{head}</h1>
                {chip && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: chip.color, border: `1px solid ${alpha(chip.color, 40)}`, borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap' }}><KindIcon kind={chip.kind} size={13} color={chip.color} />{chip.label}</span>}
              </div>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 21, lineHeight: 1.3, color: INK, marginTop: 8, letterSpacing: '-0.005em' }}>{name}</div>
              {obj?.north_star && <div onClick={() => setTab('polaris')} title="Polaris" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, color: INK2, lineHeight: 1.45, maxWidth: '72ch', cursor: 'pointer', marginTop: 6 }}>{obj.north_star}</div>}
            </div>
          )
        })()}

        <div style={{ ...S.panel, marginTop: 20 }}>
          {!rel && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, padding: '10px 0' }}>Reading the Ledger</div>}

          {rel && tab === 'briefing' && (
            <div style={{ display: 'grid', gap: 22 }}>
              {obj && (() => { const sz = SIZES[item.size] ? item.size : 'light'; const realm = realmOf(obj); const max = stepsMaxFor(sz); const field = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '6px 9px', fontFamily: MONO, fontSize: 12, height: 32, width: '100%', boxSizing: 'border-box' }; return (
                <>
                  {(() => {
                    // Pills are real pills, equal width (David 10/29). Dates: the Completion Requirement is the objective's
                    // due date; Next Action Due By rides the next open milestone on a Mythic, else the objective's follow up.
                    const seg = (on, color) => ({ ...btn(on ? color : INK2, on), padding: '6px 12px', whiteSpace: 'nowrap', borderRadius: 999, minWidth: PILL_W, justifyContent: 'center' })
                    const cell = { display: 'grid', gap: 6, alignContent: 'start' }
                    const kids = Array.isArray(rel.children) ? rel.children : []
                    const nextIx = kids.findIndex(k => k.state !== 'released')
                    const nextKid = nextIx >= 0 ? kids[nextIx] : null
                    const nextVal = nextKid ? (nextKid.due_date || '') : (obj.follow_up_date || '')
                    const setNext = (v) => nextKid ? updateObjective(nextKid.id, { due_date: v || null }).then(load) : patchObj({ follow_up_date: v || null })
                    return (
                      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                        <div style={cell}><Label style={{ marginBottom: 0 }}>Domain</Label><div style={{ display: 'flex', gap: 6 }}>{[['third-horizon', 'Third Horizon'], ['personal', 'Personal']].map(([k, l]) => <button key={k} onClick={() => patchObj({ tags: [...new Set([...(obj.tags || []).filter(t => t !== 'personal'), ...(k === 'personal' ? ['personal'] : [])])] })} style={seg(realm === k, k === 'personal' ? GOLD : BLUE)}>{l}</button>)}</div></div>
                        {rel.parent ? <div style={cell}><Label style={{ marginBottom: 0 }}>Milestone</Label><div style={{ fontFamily: SERIF, fontSize: 15.5, color: INK, paddingTop: 5 }}>{rel.milestoneN || '?'} of {rel.milestoneOf || '?'} on {rel.parent.title}<span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: MYTHIC, marginLeft: 10 }}>10 miles on close</span></div></div> : <div style={cell}><Label style={{ marginBottom: 0 }}>Type</Label><div style={{ display: 'flex', gap: 6 }}>{Object.entries(SIZES).map(([k, sdef]) => <button key={k} onClick={() => setSize(obj.id, k).then(load)} title={sdef.sub} style={seg(sz === k, sdef.color)}>{sdef.label}</button>)}</div></div>}
                        <div style={cell}><Label style={{ marginBottom: 0 }}>{rel.parent ? 'Milestone' : 'Side Mission'} Completion Requirement</Label><input type="date" value={obj.due_date || ''} onChange={e => patchObj({ due_date: e.target.value || null })} style={{ ...field, width: 150 }} /></div>
                        <div style={cell}><Label style={{ marginBottom: 0 }}>Next Action Due By</Label><input type="date" value={nextVal} onChange={e => setNext(e.target.value)} style={{ ...field, width: 150 }} />{nextKid && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: MYTHIC }}>Milestone {nextIx + 1} · {nextKid.title}</div>}</div>
                      </div>
                    ) })()}

                  <WhereItStands item={item} rel={rel} task={task} taskId={taskId} linkedBoards={linkedBoards} />
                  <SessionsStrip item={item} links={requests} />

                  {(item.description || obj.description) && <div><Label>Back Story</Label><div style={{ fontSize: 14.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{item.description || obj.description}</div></div>}

                  {rel.parent ? null : sz === 'heavy' ? <MythicMilestones parent={obj} milestones={rel.children || []} onChanged={load} onOpen={(m, n) => setOpenChild({ m, n })} /> : <div>
                    <Label>{sz === 'medium' ? 'Marks · What Has To Happen, Three At Most' : 'Marks'}</Label>
                    {max === 0 && <div style={{ fontSize: 13, color: GRAY }}>A Bounty is one action and carries no marks.</div>}
                    {max > 0 && rel.steps === null && <div style={{ fontSize: 12.5, color: GRAY }}>Steps are not set up yet. Run sql/2026-10-07-side-missions-archive.sql in the Ledger and they appear here.</div>}
                    {max > 0 && Array.isArray(rel.steps) && rel.steps.map((st, i) => (
                      <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                        <button onClick={() => toggleStep(st.id, !st.done).then(load)} aria-label={st.done ? 'Undo' : 'Done'} style={{ width: 18, height: 18, borderRadius: 999, border: `1px solid ${st.done ? SUCCESS : 'rgba(255,255,255,0.3)'}`, background: st.done ? `${alpha(SUCCESS, 13)}` : 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{st.done && <Check size={11} color={SUCCESS} />}</button>
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
                    <select defaultValue="" onChange={e => { const b = recentBoards.find(x => x.id === e.target.value); if (b) tieBoard(b) }} style={{ background: 'var(--hud-on-accent)', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 7, padding: '4px 8px', fontSize: 12, maxWidth: 360 }}>
                      <option value="">Pick a recent board…</option>
                      {recentBoards.map(b => <option key={b.id} value={b.id}>{b.project} · {b.title}</option>)}
                    </select>
                  </div>
                </div>
              ) : null) })()}
              {!item.description && !task?.notes && !rel.project && !item.event && !loaded && !obj && <div style={{ fontSize: 13, color: GRAY }}>No back story on this one yet.</div>}
            </div>
          )}

          {rel && tab === 'workbench' && (item.objective_id ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 28 }}>
              <div><Label>Live Protocols</Label><ProtocolsTab objectiveId={item.objective_id} /></div>
              <div style={{ minWidth: 0 }}><Label>Workspace</Label><WorkspacePages root={objRoot(item.objective_id)} what="item" /></div>
              <div><Label>In Play</Label><WorkbenchTab objectiveId={item.objective_id} intake={false} /></div>
            </div>
          ) : <None what={{ ...what, thing: 'a workbench' }} />)}

          {rel && tab === 'polaris' && (obj ? (
            <div style={{ display: 'grid', gap: 22 }}>
              <>
                  <div>
                    <Label style={{ color: BLUE }}>{NORTH_STAR_LABEL}</Label>
                    {editStar || !obj.north_star
                      ? <textarea autoFocus={editStar} defaultValue={obj.north_star || ''} rows={2} onBlur={e => { const v = e.target.value.trim() || null; setEditStar(false); if (v !== (obj.north_star || null)) patchObj({ north_star: v }) }} placeholder={NORTH_STAR_ASK} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 17, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.45, resize: 'vertical' }} />
                      : <div onClick={() => setEditStar(true)} title="Click to edit" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: INK, borderLeft: `2px solid ${BLUE}`, paddingLeft: 12, cursor: 'text' }}>{obj.north_star}</div>}
                  </div>
                  <Evidence rows={rel.evidence || []} onFiles={() => setTab('workbench')} say={setMsg} />

              </>
              {obj.state === 'released' && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: GREEN }}>Released{obj.released_at ? ` · ${obj.released_at.slice(0, 10)}` : ''}</div>}
            </div>
          ) : <None what={{ ...what, thing: 'a Polaris of its own' }} />)}

          {rel && tab === 'files' && item.objective_id && <div style={{ marginBottom: 28 }}><Label>Bring In</Label><WorkbenchIntake objectiveId={item.objective_id} /></div>}
          {rel && tab === 'files' && <FilesTab inPlay={false} objectiveId={item.objective_id || null} rel={rel} what={what} open={open} taskId={taskId} onRead={async (a) => { try { setReading({ title: a.title, doc: briefs[a.slug] || await readObjArtifact(a.root, a.slug) }) } catch (e) { setMsg(`Could not read: ${e.message}`) } }} onGo={go} onAttach={attachArtifact} onChanged={load} />}

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
