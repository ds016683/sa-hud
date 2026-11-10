// One detail view for every discrete thing on the Board: a Main Mission task,
// a Side Mission, an impromptu, a Claude session, a calendar event. Laid out
// like the mission page: title, a line under it, four pills across the right
// (David 10/23: Briefing · Live Protocols · Files · Notes). Every item of every
// kind carries the same four. Briefing holds Polaris and the evidence pinned
// under it, Where It Stands, Sessions, the facts and the marks. Live Protocols
// shows whatever checklist is running on the item. Files is the one place its
// files live. Notes is the meetings and the item's own notes.
import { useCallback, useEffect, useState } from 'react'
import { Play, Pause, Archive, ExternalLink, Mic, Check, Plus, Trash2, Terminal, Star } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listArtifacts, readArtifact } from '../../lib/artifacts'
import { fetchLoadout, equip, holster, stash, equipObjective, equipTask, fmtClock, SIZES } from '../../lib/loadout'
import DocView from './DocView'
import { fetchSteps, listObjectiveArtifacts, listObjectiveFiles, listObjectiveBoards, realmOf, setSize, updateObjective, objRoot, fetchMilestones } from '../../lib/objectives'
import { renderMarkdown } from './MeetingCloseout'
import { recall } from '../../lib/recall'
import { fmtStamp, listLiveFiles, listEvidence, openLiveFile, isRequest, isLink } from '../../lib/livefiles'
import { isOpenRow } from '../../lib/protocols'
import CardFiles, { WrittenOnCard } from './CardFiles'
import WorkbenchSheet from './WorkbenchSheet'
import LumenPanel from './LumenPanel'
import { openCard } from '../../lib/card'
import { LEDGER_EVENT, fireLedgerChanged } from '../../lib/lumenPanel'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GOLD_BRIGHT, BLUE, GREEN, SUCCESS, RED, CAUTION, MONO, SERIF, S, Label, KIND_COLOR, KindIcon, NORTH_STAR_LABEL, NORTH_STAR_ASK, LABEL, MUTED, MYTHIC, alpha, NAVY_DEEP, CARD_PILLS, CardPill, Trail } from './canon'

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
      // A Main Mission milestone (David 11/4): its number and the mission's count, the same way the Main Mission page numbers them.
      if (task) {
        try {
          const { data: pts } = await supabase.from('project_tasks').select('id,text,status,created_at').eq('project_id', pid).order('created_at')
          const numOf = (t) => { const m = /^\s*(\d+)\s*[·.:)-]/.exec(String(t?.text || '')); return m ? Number(m[1]) : null }
          const all = pts || []
          const numbered = all.filter(t => numOf(t) !== null)
          const unnumberedOpen = all.filter(t => numOf(t) === null && t.status !== 'done')
          out.milestoneOf = numbered.length ? numbered.length + unnumberedOpen.length : all.length
          const n = numOf(task)
          out.milestoneN = n !== null ? n : (all.findIndex(t => t.id === task.id) + 1 || null)
        } catch { /* the fence falls back to ? of ? */ }
      }
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

// Where It Stands (David, 10/17; 11/4): above the facts, two lists. Done is the history,
// a summary of what closed: milestones released, marks ticked, board items closed. Not
// file names (11/4); a file stays only once it is pinned as evidence, the deliverable. Still needed:
// the open gates, the open board items, and Lumen's two or three next steps
// toward the star (the same brain as the Loadout card, loaded after).

// Sessions (David 10/22): reopen the Claude Code session that worked this item, or
// copy a terminal command that starts one briefed. The reopen links are launch links
// in Live Files (claude://claude.ai/epitaxy/local_<session id>) that focus.py leaves on
// the item; the note carries the resume command. The briefed command is built here.
const isSessionLink = (r) => isLink(r) && /^claude:\/\//.test(String(r.path || ''))
const sessionLinks = (links) => (links || []).filter(isSessionLink).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
// The Cold Start (David 11/4): one button on the Briefing copies a briefed start for a fresh Claude session.
function briefCommand(item, links) {
  const sessions = sessionLinks(links)
  const cwd = (String(sessions[0]?.note || '').match(/^cd "([^"]+)"/) || [])[1] || '~/builds/sa-hud'
  const oid = item.objective_id || item.id
  return `cd "${cwd}" && claude "Pick up the ${item.kind || 'Side Mission'} '${String(item.title || '').replace(/"/g, "'")}' (${oid}): read its briefing with get_objectives and list_steps, its files with list_live_files, then continue from Next. Set the focus on it first."`
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
          <button onClick={() => openRow(r)} style={btn(INK2)}><ExternalLink size={11} /> Open</button>
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
    ...(rel.objFiles || []).filter(f => f.evidence).map(f => ({ text: f.name, meta: 'deliverable', kind: 'made' })),
  ]
  const needed = [
    ...kids.filter(k => k.state !== 'released').map((k, i) => ({ text: k.title, meta: `milestone ${i + 1}`, kind: 'milestone' })),
    ...steps.filter(st => !st.done).map(st => ({ text: st.text, meta: null, kind: 'gate' })),
    ...boardItems.filter(t => t.status !== 'done').map(t => ({ text: t.label, meta: t.status === 'blocked' ? (t.note || 'blocked') : t.status === 'inmotion' ? 'in motion' : t.id, kind: t.status === 'blocked' ? 'blocked' : 'board' })),
  ]
  if (task && task.status === 'done') done.unshift({ text: 'Milestone closed', meta: task.released_at ? new Date(task.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null, kind: 'board' })
  // The card palette (David 11/4): done is a filled ink dot, open is an ink ring, blocked is the caution tone; no purple
  // on the card below the header chip (David 11/4, "still have a rogue purple").
  const doneColor = INK2
  const Row = ({ r, color, open }) => (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}>
      <span style={{ width: 9, height: 9, borderRadius: 99, boxSizing: 'border-box', background: open ? 'transparent' : color, border: `1.5px solid ${color}`, marginTop: 6, flexShrink: 0 }} />
      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK, flex: 1 }}>{r.text}{r.meta && <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: r.kind === 'blocked' ? CAUTION : GRAY, marginLeft: 8 }}>{r.meta}</span>}</span>
    </div>
  )
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div>
        <Label>Done</Label>
        {done.length ? done.map((r, i) => <Row key={i} r={r} color={doneColor} />) : <div style={{ fontSize: 13, color: GRAY, padding: '4px 0' }}>Nothing closed yet.</div>}
      </div>
      <div>
        <Label>Next</Label>
        {needed.map((r, i) => <Row key={i} r={r} color={r.kind === 'blocked' ? CAUTION : INK2} open />)}
        {thinking && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, padding: '4px 0' }}>Lumen is reading the trail</div>}
        {!thinking && (next || []).map((t, i) => <div key={`n${i}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '4px 0' }}><span style={{ width: 9, height: 9, borderRadius: 99, boxSizing: 'border-box', border: `1.5px solid ${INK2}`, marginTop: 6, flexShrink: 0 }} /><span style={{ fontSize: 13.5, lineHeight: 1.5, color: INK2, fontStyle: 'italic', flex: 1 }}>{t}<span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY, marginLeft: 8, fontStyle: 'normal' }}>Lumen</span></span></div>)}
        {!thinking && !needed.length && !(next || []).length && <div style={{ fontSize: 13, color: GRAY, padding: '4px 0' }}>Nothing open. If the star is true, extract it.</div>}
      </div>
    </div>
  )
}

export default function ItemDetail({ item, onClose, onNavigate, onChange, initialTab = 'overview', host = 'overlay' }) {
  const [tab, setTab] = useState(TABS.includes(initialTab) ? initialTab : (LEGACY_TAB[initialTab] || 'briefing'))
  // The open pill rides the card's address (David 11/7: a refresh while working with Lumen on a pill must land back on that pill).
  useEffect(() => { if (host !== 'page') return; try { const h = window.location.hash || ''; if (!/\/item\//.test(h)) return; const next = h.replace(/(\/item\/[^/]+)(\/[^/]*)?$/, `$1/${tab}`); if (next !== h) window.history.replaceState(window.history.state, '', next) } catch { /* no-op */ } }, [tab, host])
  const [rel, setRel] = useState(null)
  const [msg, setMsg] = useState(null)
  const [openNote, setOpenNote] = useState(null)
  const [requests, setRequests] = useState([])
  const objKey = item.objective_id || null
  useEffect(() => { let on = true; if (!objKey) { Promise.resolve().then(() => { if (on) setRequests([]) }); return () => { on = false } } listLiveFiles({ objectiveId: objKey }).then(r => { if (on) setRequests((r.rows || []).filter(x => isRequest(x) || isLink(x))) }).catch(() => {}); return () => { on = false } }, [objKey, rel])
  const load = useCallback(() => loadRelated(item).then(setRel).catch(e => { console.warn('item detail', e.message); setRel({ project: null, task: null, artifacts: [], boards: [], projectFiles: [], storeFiles: [], meetings: [], loadout: null }) }), [item])
  useEffect(() => { load() }, [load])
  // Lumen acted on this card from the panel (11/4): reread it, and remount the Workbench's lists.
  const [tick, setTick] = useState(0)
  useEffect(() => { const h = (e) => { const id = e?.detail?.id; if (!id || id === (item.objective_id || item.id)) { load(); setTick(t => t + 1) } }; window.addEventListener(LEDGER_EVENT, h); return () => window.removeEventListener(LEDGER_EVENT, h) }, [load, item])
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
    if (host !== 'overlay') return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, host])

  const task = rel?.task
  const taskId = item.task_id || task?.id || null
  const linkedBoards = [...(rel?.objBoards || []), ...(rel?.boards || []).filter(b => b.linked)]
  const loaded = rel?.loadout?.items.find(i => i.id === (item.objective_id || item.id)) || null
  const what = { item: item.kind === 'Event' ? 'meeting' : item.kind === 'Main Mission' ? 'task' : item.kind === 'Session' ? 'session' : 'mission' }

  const act = async (fn, after) => { try { await fn(); setMsg(after); await load(); onChange && onChange() } catch (e) { setMsg(`Could not do that: ${e.message}`) } }
  // One chassis (11/4): as a page, leaving the card is a route change; the overlay closes first.
  const go = (segs) => { if (host === 'overlay') onClose(); onNavigate && onNavigate('main-missions', segs) }
  const startTimer = () => act(async () => {
    if (loaded) return equip(loaded.id)
    if (item.objective_id) { const r = await equipObjective(item.objective_id); if (!r.ok) throw new Error(r.reasons.join('; ')) ; return }
    if (task) { const r = await equipTask(task, rel?.project?.name); if (!r.ok) throw new Error(r.reasons.join('; ')); return }
    throw new Error('nothing to load')
  }, 'Timer on')

  const counts = { workbench: (rel?.punchlist || []).filter(isOpenRow).length, polaris: (rel?.evidence || []).length, files: rel?.objFiles?.length || 0, notes: rel?.meetings.length || 0 }
  const obj = rel?.objective || null
  const [copied, setCopied] = useState(false)
  const copyText = async (text) => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch { /* no clipboard */ } }
  const [editStar, setEditStar] = useState(false)
  const [reading, setReading] = useState(null)
  const [briefs, setBriefs] = useState({})
  const readObjArtifact = useCallback(async (root, slug) => { const { data, error } = await supabase.storage.from('project-files').download(`${root}/artifacts/${slug}.json`); if (error) throw new Error(error.message); return JSON.parse(await data.text()) }, [])
  useEffect(() => { let on = true; const objArts = (rel?.objArtifacts || []); Promise.all(objArts.map(a => readObjArtifact(a.root || `objectives/${obj?.id}`, a.slug).then(d => [a.slug, d]).catch(() => [a.slug, null]))).then(ps => { if (on) setBriefs(Object.fromEntries(ps)) }); return () => { on = false } }, [rel, obj, readObjArtifact])
  const patchObj = async (patch) => { try { await updateObjective(obj.id, patch); await load(); onChange && onChange(); fireLedgerChanged({ id: obj.id, source: 'card' }) } catch (e) { setMsg(`Could not save: ${e.message}`) } }
  const patchTask = async (patch) => { try { const { error } = await supabase.from('project_tasks').update(patch).eq('id', task.id); if (error) throw error; await load(); onChange && onChange(); fireLedgerChanged({ id: item.objective_id || item.id, source: 'card' }) } catch (e) { setMsg(`Could not save: ${e.message}`) } }

  return (
    <div style={host === 'page' ? { minWidth: 0 } : { position: 'fixed', top: 0, left: 0, bottom: 0, right: 'var(--lumen-aside, 0px)', transition: 'right 220ms ease', zIndex: 240, overflowY: 'auto', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)' }}>
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
      <div style={host === 'page' ? { minWidth: 0 } : { ...S.page, maxWidth: 1180, margin: '0 auto' }}>
        {(() => {
          // Header canon (David 10/29): the kind is the header and is bigger than the name it heads;
          // the type wears its icon beside it; the name runs the full width and wraps only when the
          // space is out. The trail above is navigation only.
          const nodes = []
          let head = item.kind
          let chip = null
          const nav = (route) => () => { if (host === 'overlay') onClose(); onNavigate && onNavigate(route) }
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
            nodes.push({ label: rel.parent.title, onClick: host === 'page' ? () => openCard(rel.parent.id) : onClose })
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
            <div>
              <Trail nodes={nodes} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 16 }}>
                <h1 style={{ ...S.h1, fontSize: 28, lineHeight: 1.2 }}>{head}</h1>
                {chip && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: chip.color, border: `1px solid ${alpha(chip.color, 40)}`, borderRadius: 999, padding: '5px 12px', whiteSpace: 'nowrap' }}><KindIcon kind={chip.kind} size={13} color={chip.color} />{chip.label}</span>}
              </div>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 21, lineHeight: 1.3, color: INK, marginTop: 8, letterSpacing: '-0.005em' }}>{name}</div>
              {obj?.north_star && <div onClick={() => setTab('polaris')} title="Polaris" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 14.5, color: INK2, lineHeight: 1.45, maxWidth: '72ch', cursor: 'pointer', marginTop: 6 }}>{obj.north_star}</div>}
              {/* The pills (David 11/4, the rebuild): one quiet row under the header, left, not fighting the trail. */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 18 }}>
                {TABS.map(t => <CardPill key={t} active={tab === t} onClick={() => setTab(t)} count={counts[t]}>{TAB_LABEL[t]}</CardPill>)}
              </div>
            </div>
          )
        })()}

        {/* No surface under the card (David 11/4): the content lives on the page itself, like the Main Mission page. */}
        <div style={{ marginTop: 20 }}>
          {!rel && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, padding: '10px 0' }}>Reading the Ledger</div>}

          {rel && tab === 'briefing' && (
            <div style={{ display: 'grid', gap: 22 }}>
              {obj && (() => { const sz = SIZES[item.size] ? item.size : 'light'; const realm = realmOf(obj); const field = { background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '6px 9px', fontFamily: MONO, fontSize: 12, height: 32, width: '100%', boxSizing: 'border-box' }; return (
                <>
                  {(() => {
                    // The header strip (David 11/4): one fence around Domain and Type, read as the card's upper header,
                    // with the one date the card carries at its right: Target Completion. Pills are real pills, equal
                    // width (10/29). Next Action Due By is retired; a Mythic's next milestone carries its own date on its own card.
                    const seg = (on, color) => ({ ...btn(on ? color : INK2, on), padding: '6px 12px', whiteSpace: 'nowrap', borderRadius: 999, minWidth: PILL_W, justifyContent: 'center' })
                    const cell = { display: 'grid', gap: 8, alignContent: 'start' }
                    const fence = { display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', padding: '14px 18px 16px', borderRadius: 12, border: `1px solid ${PANEL_BORDER}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.18)' }
                    return (
                      <div style={fence}>
                        <div style={cell}><Label style={{ marginBottom: 0 }}>Domain</Label><div style={{ display: 'flex', gap: 6 }}>{[['third-horizon', 'Third Horizon'], ['personal', 'Personal']].map(([k, l]) => <button key={k} onClick={() => patchObj({ tags: [...new Set([...(obj.tags || []).filter(t => t !== 'personal'), ...(k === 'personal' ? ['personal'] : [])])] })} style={seg(realm === k, BLUE)}>{l}</button>)}</div></div>
                        {(rel.parent || task) ? <div style={cell}><Label style={{ marginBottom: 0 }}>Milestone</Label><div style={{ fontFamily: SERIF, fontSize: 15.5, color: INK, paddingTop: 5 }}>{rel.milestoneN || '?'} of {rel.milestoneOf || '?'} on {rel.parent ? rel.parent.title : (rel.project?.name || item.project || 'the Main Mission')}<span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, marginLeft: 10 }}>{rel.parent ? '10 miles on close' : '1 mile on close'}</span></div></div> : <div style={cell}><Label style={{ marginBottom: 0 }}>Type</Label><div style={{ display: 'flex', gap: 6 }}>{Object.entries(SIZES).map(([k, sdef]) => <button key={k} onClick={() => setSize(obj.id, k).then(load)} title={sdef.sub} style={seg(sz === k, BLUE)}>{sdef.label}</button>)}</div></div>}
                        <div style={{ ...cell, marginLeft: 'auto' }}><Label style={{ marginBottom: 0 }}>Target Completion</Label><input type="date" value={(task ? task.due_date : obj.due_date) || ''} onChange={e => task ? patchTask({ due_date: e.target.value || null }) : patchObj({ due_date: e.target.value || null })} style={{ ...field, width: 150 }} /></div>
                      </div>
                    ) })()}

                  <WhereItStands item={item} rel={rel} task={task} taskId={taskId} linkedBoards={linkedBoards} />
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
              {task?.due_date && !obj && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', color: LABEL, textTransform: 'uppercase' }}>{task.status} · due {task.due_date}</div>}
              {item.kind !== 'Event' && item.kind !== 'Session' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 16 }}>
                  {!rel?.parent && (loaded
                    ? (loaded.equipped
                      ? <button onClick={() => act(() => holster(loaded.id), 'Timer off')} style={btn(GREEN, true)}><Pause size={12} /> Holster</button>
                      : <button onClick={() => act(() => equip(loaded.id), 'Timer on')} style={btn(GOLD, true)}><Play size={12} /> Equip</button>)
                    : <button onClick={startTimer} style={btn(GOLD, true)}><Play size={12} /> Equip</button>)}
                  <button onClick={() => copyText(briefCommand(item, requests))} title={briefCommand(item, requests)} style={btn(INK2)}><Terminal size={12} /> {copied ? 'Copied' : 'Cold Start'}</button>
                  {loaded && <button onClick={() => act(() => stash(loaded.id), 'Stashed')} style={btn(INK2)}><Archive size={12} /> Stash</button>}
                  <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: GRAY }}>{loaded ? (loaded.equipped ? 'Equipped' : 'Holstered') : 'Not loaded'} · <span style={{ color: loaded?.equipped ? GREEN : INK2 }}>{fmtClock(loaded?.minutes_today || 0)} today</span></span>
                </div>
              )}
            </div>
          )}

          {rel && tab === 'workbench' && (item.objective_id ? (
            <div key={tick} style={{ minWidth: 0 }}><WorkbenchSheet root={objRoot(item.objective_id)} scopes={[{ objectiveId: item.objective_id, label: null }]} /></div>
          ) : <None what={{ ...what, thing: 'a workbench' }} />)}

          {rel && tab === 'polaris' && (obj ? (
            <div style={{ display: 'grid', gap: 22 }}>
              <>
                  <div>
                    <Label>{NORTH_STAR_LABEL}</Label>
                    {editStar || !obj.north_star
                      ? <textarea autoFocus={editStar} defaultValue={obj.north_star || ''} rows={2} onBlur={e => { const v = e.target.value.trim() || null; setEditStar(false); if (v !== (obj.north_star || null)) patchObj({ north_star: v }) }} placeholder={NORTH_STAR_ASK} style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 17, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.45, resize: 'vertical' }} />
                      : <div onClick={() => setEditStar(true)} title="Click to edit" style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, lineHeight: 1.5, color: INK, borderLeft: `2px solid ${LABEL}`, paddingLeft: 12, cursor: 'text' }}>{obj.north_star}</div>}
                  </div>
                  <Evidence rows={rel.evidence || []} onFiles={() => setTab('files')} say={setMsg} />

              </>
              {obj.state === 'released' && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: SUCCESS }}>Released{obj.released_at ? ` · ${obj.released_at.slice(0, 10)}` : ''}</div>}
            </div>
          ) : <None what={{ ...what, thing: 'a Polaris of its own' }} />)}

          {rel && tab === 'files' && <CardFiles key={`files:${item.objective_id || item.id}`} objectiveId={item.objective_id || null} onChanged={load} />}
          {rel && tab === 'files' && <WrittenOnCard artifacts={rel.objArtifacts || []} onRead={async (a) => { try { setReading({ title: a.title, doc: briefs[a.slug] || await readObjArtifact(a.root, a.slug) }) } catch (e) { setMsg(`Could not read: ${e.message}`) } }} />}

          {rel && tab === 'notes' && (
            <div style={{ display: 'grid', gap: 18 }}>
              {(item.description || obj?.description || task?.notes) && <div><Label>Back Story</Label><div style={{ fontSize: 14.5, lineHeight: 1.65, color: INK, whiteSpace: 'pre-wrap' }}>{item.description || obj?.description || task?.notes}</div></div>}
              {obj && (
                <div>
                  <Label>Notes On This {what.item === 'task' ? 'Milestone' : 'Mission'}</Label>
                  <textarea defaultValue={obj.notes || ''} rows={4} onBlur={e => { const v = e.target.value.trim() || null; if (v !== (obj.notes || null)) patchObj({ notes: v }) }} placeholder="A thought with nowhere else to land. Saved when you click away." style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
                </div>
              )}
              <div>
              {rel.meetings.map(m => (
                <div key={m.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '13px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, cursor: 'pointer' }} onClick={() => setOpenNote(openNote === m.id ? null : m.id)}>
                    <Mic size={15} color={LABEL} style={{ flexShrink: 0 }} /><span style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontWeight: 500, fontSize: 16, lineHeight: 1.3, letterSpacing: '-0.005em', color: INK }}>{m.title}</span><span style={{ fontSize: 13, color: MUTED, whiteSpace: 'nowrap' }}>{m.meeting_date ? new Date(`${String(m.meeting_date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''}</span>
                  </div>
                  {openNote === m.id && <div style={{ marginTop: 12, maxWidth: '86ch', fontSize: 14.5, lineHeight: 1.7, color: INK2 }}>{m.summary ? renderMarkdown(m.summary, { size: 14.5 }) : <span style={{ color: GRAY }}>No summary stored.</span>}</div>}
                </div>
              ))}
              {!rel.meetings.length && <None what={{ ...what, thing: 'meeting notes' }} />}
              </div>
            </div>
          )}

          {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD_BRIGHT, marginTop: 14 }}>{msg}</div>}
        </div>
      </div>
      {item.objective_id && <LumenPanel item={{ kind: 'objective', id: item.objective_id, title: item.title, root: objRoot(item.objective_id), summary: [obj?.north_star, item.description || obj?.description].filter(Boolean).join('\n\n') }} />}
    </div>
  )
}
