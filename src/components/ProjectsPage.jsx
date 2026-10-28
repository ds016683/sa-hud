import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, ArrowLeft, Check, Trash2, ArrowUpRight, Folder, FolderPlus, FileText,
  Upload, Download, Archive, ChevronRight, Hand, RefreshCw,
} from 'lucide-react'
import useProjects, { freshnessOf } from '../hooks/useProjects'
import ArtifactsTab from './river/ArtifactsTab'
import WorkbenchTab, { WorkbenchIntake } from './river/Workbench'
import WorkspacePages from './river/Workspace'
import PlanningCanvas from './river/PlanningCanvas'
import ItemDetail from './river/ItemDetail'
import SessionBoard from './river/SessionBoard'
import { listShares, archiveShare, archiveSharesFor, shareUrl } from '../lib/shares'
import { fileProject } from '../lib/archive'
import { listLiveFiles, markFiled, listEvidence, openLiveFile } from '../lib/livefiles'
import { supabase as sbAuth } from '../lib/supabase'
import { equipTask, stashTask, deleteMission } from '../lib/loadout'
import { NORTH_STAR_LABEL, LABEL, alpha, INK, INK2, NAVY_DEEP, BLUE, GRAY, PANEL_BORDER, PANEL_BG, GOLD, GREEN, SUCCESS, RED, PURPLE, CARD_PILLS, CardPill, Label as CanonLabel, Trail } from './river/canon'
import { importProject } from '../lib/cabinet'
import BadgeMedallion from './BadgeArt'
import { BADGES } from '../constants/collection'
import { supabase as sbClient2 } from '../lib/supabase'
import { listArtifacts as listProjArtifacts, readArtifact as readProjArtifact } from '../lib/artifacts'
import { supabase as sbClient } from '../lib/supabase'
import { hudPrompt, hudConfirm, hudNotice } from '../lib/dialog'
// =============================================================================
// STYLE TOKENS (CIP canon, matches ObjectivesPage dark stage)
// =============================================================================
// Canon tokens (Milestone 18 scrub, 10/24): the page's own palette is gone; two local aliases remain.
const BLUE_DEEP = LABEL
const TEXT_DIM = INK2

const SERIF = "'Lora', Georgia, serif"
const MONO = 'var(--font-mono, monospace)'

const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px', color: INK },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: INK, fontFamily: SERIF, letterSpacing: '-0.01em' },
  sub: { fontSize: 10, color: LABEL, margin: '6px 0 0', fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16 },
  panelTitle: { fontSize: 10, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: 10, fontFamily: MONO },
  btnPrimary: { background: BLUE, color: NAVY_DEEP, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { background: PANEL_BG, color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: alpha(INK, 7), color: INK },
}

// CIP pill grammar: active = solid baby blue + navy text, inactive = hairline ghost uppercase
function Pill({ active, children, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: MONO,
      fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase',
      background: active ? BLUE : 'transparent',
      color: active ? NAVY_DEEP : TEXT_DIM,
      border: active ? `1px solid ${BLUE}` : `1px solid ${PANEL_BORDER}`,
    }}>{children}</button>
  )
}

const CATEGORY_LABELS = {
  'client': 'Client', 'third-horizon': 'Third Horizon', 'personal': 'Personal',
  'learning': 'Learning', 'commercial-infra': 'Commercial Infra', 'biz-dev': 'Business Dev',
  'q2-must': 'Must Be True',
}
const CATEGORY_ORDER = ['q2-must', 'client', 'third-horizon', 'commercial-infra', 'biz-dev', 'personal', 'learning']

// Horizon (David 10/25, edges 10/26): the page sorts by where the mission sits on
// the Board, nothing subjective. A milestone in the Loadout gives the card a green
// edge; one in the Stash, gold; nothing on the Board, the accent blue. A mission
// tagged 'horizon' has no clock on it and sits in the Horizon band as a chip.
const isHorizon = (p) => (p.tags || []).includes('horizon')
const boardStateOf = (p, objState) => {
  const open = (p.tasks || []).filter(isOpen)
  const states = open.map(t => t.objective_id ? objState[t.objective_id] : null).filter(Boolean)
  if (states.some(o => o.state === 'active')) return 'loadout'
  if (states.some(o => o.state === 'parked' && (o.tags || []).includes('stashed'))) return 'stash'
  if (open.some(t => !!t.objective_id)) return 'loadout'   // promoted and live, state not read yet
  return 'off'
}
const EDGE = { loadout: GREEN, stash: GOLD, off: BLUE }

const isOpen = (t) => t.status !== 'done' && !t.done
const isBlocked = (t) => t.status === 'blocked'

// =============================================================================
// Baseball card
// =============================================================================
// Milestones. A milestone typed with a leading number ("3 · Smoke test…")
// keeps that number and sorts by it; the prefix is stripped from the text.
// Milestones without a number follow in creation order and are numbered by
// position. When a mission has numbered milestones, its unnumbered closed
// tasks are earlier work (history before the plan was reset) and fold away.
const NUM_RE = /^\s*(\d+)\s*[·.:)-]\s*/
const numOf = (t) => { const m = NUM_RE.exec(String(t?.text || '')); return m ? Number(m[1]) : null }
const stripNum = (t) => String(t || '').replace(NUM_RE, '')
const byCreated = (a, b) => new Date(a.created_at) - new Date(b.created_at)
function planOf(project) {
  const all = [...(project.tasks || [])].sort(byCreated)
  const numbered = all.filter(t => numOf(t) !== null).sort((a, b) => numOf(a) - numOf(b))
  if (!numbered.length) return { plan: all.map((t, i) => ({ t, n: i + 1 })), history: [] }
  const rest = all.filter(t => numOf(t) === null)
  const open = rest.filter(isOpen), history = rest.filter(t => !isOpen(t))
  let n = Math.max(...numbered.map(numOf))
  return { plan: [...numbered.map(t => ({ t, n: numOf(t) })), ...open.map(t => ({ t, n: ++n }))], history }
}
const nowMilestone = (plan) => plan.find(({ t }) => isOpen(t) && t.objective_id) || plan.find(({ t }) => isOpen(t)) || null

// The ring (David 10/26): x of x closed, drawn once and grown on mount.
function ProgressRing({ closed, total, size = 56, stroke = 5, color = GOLD }) {
  const [on, setOn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setOn(true), 20); return () => clearTimeout(t) }, [])
  const r = (size - stroke) / 2, c = 2 * Math.PI * r
  const pct = total ? closed / total : 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={alpha(INK, 8)} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={on ? c * (1 - pct) : c} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(0.2, 0.8, 0.2, 1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontSize: size > 56 ? 15 : size > 48 ? 13 : 11, color: INK, lineHeight: 1, whiteSpace: 'nowrap' }}><span>{closed}<span style={{ color: GRAY, fontSize: '0.75em', margin: '0 2px' }}>/</span>{total}</span></div>
    </div>
  )
}

function ProjectCard({ project, onOpen, edge = BLUE, compact = false }) {
  const { plan } = planOf(project)
  const ms = plan.map(p => p.t)
  const closed = ms.filter(t => !isOpen(t)).length
  const nowP = nowMilestone(plan)
  const now = nowP?.t || null
  const blocked = ms.filter(t => isOpen(t) && isBlocked(t)).length
  const fresh = freshnessOf(project.last_activity_at)
  const freshColor = fresh === 'fresh' ? GREEN : fresh === 'warning' ? GOLD : GRAY
  const lastTouch = project.last_activity_at ? new Date(project.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never'
  return (
    <button onClick={() => onOpen(project.id)} style={{ ...S.panel, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12, minHeight: compact ? 190 : 240, width: '100%', transition: 'border-color 120ms', borderLeft: `3px solid ${edge}`, background: compact ? 'transparent' : PANEL_BG, padding: compact ? '16px 18px' : '20px 20px 18px' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = alpha(BLUE, 40); e.currentTarget.style.borderLeftColor = edge }} onMouseLeave={e => { e.currentTarget.style.borderColor = PANEL_BORDER; e.currentTarget.style.borderLeftColor = edge }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontWeight: 500, fontSize: compact ? 16 : 18, letterSpacing: '-0.01em', color: INK, lineHeight: 1.25 }}>{project.name}</div>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: BLUE, border: `1px solid ${alpha(BLUE, 33)}`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{CATEGORY_LABELS[project.category] || project.category}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: compact ? '2px 0' : '6px 0' }}>
        <ProgressRing closed={closed} total={ms.length} size={compact ? 64 : 88} stroke={compact ? 5 : 6} />
      </div>
      {now
        ? <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 'auto' }}><span style={{ color: now.objective_id ? GREEN : GOLD, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', marginRight: 6 }}>{now.objective_id ? 'on the board' : 'now'}</span>{stripNum(now.text)}</div>
        : <div style={{ fontSize: 12.5, color: GRAY, marginTop: 'auto' }}>{ms.length ? 'Every milestone closed.' : 'No milestones yet.'}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', color: LABEL, textTransform: 'uppercase' }}>
        {blocked > 0 && <span style={{ color: RED, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Hand size={10} /> {blocked} on David</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: freshColor }} />touched {lastTouch}</span>
      </div>
    </button>
  )
}

// =============================================================================
// Detail: milestone row. The steps under it come from the mission's session
// board: the phase that carries this task id (on the phase, or on one of its
// items). Ticking a step or adding one writes that board, the same document
// the agent writes. New steps never carry the task id themselves: the sync
// closes the Ledger task when an item with its id is done, so only the step
// that means "the milestone is true" should carry it.
// =============================================================================
const Chip = ({ color, children }) => <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color, border: `1px solid ${alpha(color, 33)}`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>{children}</span>

function MilestoneRow({ n, project, task, board, api, onNavigate, onBoardChange, onAward, objState }) {
  const open = isOpen(task)
  const blocked = isBlocked(task)
  const ost = task.objective_id ? objState?.[task.objective_id] : null
  const onBoard = open && !!task.objective_id && (ost ? ost.state === 'active' : true)
  const stashed = open && !!ost && ost.state === 'parked' && (ost.tags || []).includes('stashed')
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const phases = board?.phases || []
  const pi = phases.findIndex(ph => ph.task_id === task.id || (ph.tasks || []).some(t => t.task_id === task.id))
  const phase = pi >= 0 ? phases[pi] : null
  const steps = phase ? (phase.tasks || []) : []
  const stepsDone = steps.filter(t => t.status === 'done').length

  const writeBoard = async (nextPhases) => {
    if (!board?.id) { setMsg('No session board on this mission yet; steps live there.'); return }
    const { error } = await sbClient2.from('session_boards').update({ phases: nextPhases, updated_at: new Date().toISOString() }).eq('id', board.id)
    if (error) { setMsg(`Could not save: ${error.message}`); return }
    onBoardChange && onBoardChange({ ...board, phases: nextPhases })
  }
  const toggleStep = (ti) => writeBoard(phases.map((ph, i) => i !== pi ? ph : { ...ph, tasks: ph.tasks.map((t, j) => j !== ti ? t : { ...t, status: t.status === 'done' ? 'open' : 'done' }) }))
  const addStep = async () => {
    const label = await hudPrompt('The step', ''); if (!label?.trim()) return
    const item = { id: `${n}.${steps.length + 1}`, label: label.trim(), status: 'open' }
    if (phase) writeBoard(phases.map((ph, i) => i !== pi ? ph : { ...ph, tasks: [...(ph.tasks || []), item] }))
    else writeBoard([...phases, { title: `${n} · ${stripNum(task.text)}`, task_id: task.id, tasks: [item] }])
  }
  const load = async () => { setBusy(true); try { const r = await equipTask(task, project.name, { clock: false }); setMsg(r.ok ? 'On the Board' : `Will not fit: ${r.reasons.join(' · ')}`); if (r.ok) api.refresh() } catch (e) { setMsg(`Could not load: ${e.message}`) } finally { setBusy(false) } }
  const toStash = async () => { setBusy(true); try { await stashTask(task, project.name); setMsg('In the Stash'); api.refresh() } catch (e) { setMsg(`Could not stash: ${e.message}`) } finally { setBusy(false) } }
  const rename = async () => { const t = await hudPrompt('Milestone', stripNum(task.text)); if (!t?.trim()) return; await api.updateTask(project.id, task.id, { text: t.trim() }) }
  const doneWhen = async () => { const t = await hudPrompt('Done when…', task.notes || ''); if (t === null) return; await api.updateTask(project.id, task.id, { notes: t.trim() || null }) }

  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '12px 0', opacity: open ? 1 : 0.55 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, lineHeight: 1, color: open ? (onBoard ? GREEN : GOLD) : SUCCESS, width: 26, flexShrink: 0, paddingTop: 2 }}>{n}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span onClick={() => setExpanded(x => !x)} title="Open this milestone" style={{ fontSize: 15, lineHeight: 1.4, color: open ? INK : GRAY, textDecoration: open ? 'none' : 'line-through', cursor: 'pointer', flex: 1, minWidth: 220 }}>{stripNum(task.text)}</span>
            {!open && <Chip color={SUCCESS}>closed{task.released_at ? ` ${new Date(task.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} · 10 mi</Chip>}
            {open && onBoard && <Chip color={GREEN}>on the board</Chip>}
            {stashed && <Chip color={BLUE}>in the stash</Chip>}
            {open && blocked && <Chip color={RED}>blocked · needs David</Chip>}
            {steps.length > 0 && <Chip color={stepsDone === steps.length ? GOLD : GRAY}>{stepsDone} / {steps.length} steps</Chip>}
          </div>
          {task.notes && <div style={{ fontSize: 12.5, color: TEXT_DIM, marginTop: 3, lineHeight: 1.5 }}>Done when: {task.notes}</div>}
          {steps.length > 0 && (
            <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
              {steps.map((st, ti) => (
                <button key={st.id || ti} onClick={() => toggleStep(ti)} title={st.status === 'done' ? 'Reopen' : 'Mark done'} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'transparent', border: 'none', padding: '3px 0', cursor: 'pointer', textAlign: 'left', color: INK }}>
                  {st.status === 'done' ? <span style={{ width: 15, height: 15, borderRadius: 99, background: SUCCESS, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Check size={10} color={NAVY_DEEP} /></span>
                    : <span style={{ width: 15, height: 15, borderRadius: 99, border: `1.5px solid ${st.status === 'inmotion' ? GOLD : st.status === 'blocked' ? RED : alpha(INK, 30)}`, display: 'inline-block', flexShrink: 0, marginTop: 2 }} />}
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD, letterSpacing: '0.5px', paddingTop: 2, flexShrink: 0 }}>{st.id}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: st.status === 'done' ? GRAY : INK, textDecoration: st.status === 'done' ? 'line-through' : 'none' }}>{st.label}{st.note && <span style={{ display: 'block', fontSize: 12, color: st.status === 'blocked' ? RED : GRAY }}>{st.note}</span>}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={() => setExpanded(x => !x)} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Open</button>
            {open && !onBoard && <button onClick={load} disabled={busy} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10, color: GREEN, borderColor: alpha(GREEN, 40) }}>Load</button>}
            {open && !onBoard && !stashed && <button onClick={toStash} disabled={busy} title="Stage it in the Stash on the Board; no slot, no clock" style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10, color: BLUE, borderColor: alpha(BLUE, 40) }}>Stash</button>}
            {open && <button onClick={addStep} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}><Plus size={10} /> Step</button>}
            {open && <button onClick={doneWhen} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Done when</button>}
            {open && <button onClick={rename} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Rename</button>}
            {open
              ? <button onClick={async () => { if (!await hudConfirm(`Close milestone ${n}? 10 miles on the next update.`)) return; await api.toggleTask(project.id, task); onAward && onAward({ n, title: stripNum(task.text) }) }} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10, color: GOLD, borderColor: alpha(GOLD, 40) }}><Check size={10} /> Close milestone</button>
              : <button onClick={() => api.toggleTask(project.id, task)} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Reopen</button>}
            <button onClick={async () => { if (await hudConfirm('Delete this milestone?')) api.deleteTask(project.id, task.id) }} title="Delete" style={{ background: 'transparent', border: 'none', color: alpha(INK, 25), cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
          </div>
          {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') || msg.startsWith('Will') || msg.startsWith('No session') ? RED : msg === 'In the Stash' ? BLUE : GOLD, marginTop: 6 }}>{msg}</div>}
        </div>
      </div>
      {expanded && <ItemDetail item={{ id: task.objective_id || task.id, objective_id: task.objective_id || null, task_id: task.id, kind: 'Main Mission', title: stripNum(task.text), project: project.name, project_id: project.id, description: task.notes }} onClose={() => setExpanded(false)} onNavigate={onNavigate} onChange={() => api.refresh()} />}
    </div>
  )
}

// =============================================================================
// Detail: files browser (Supabase Storage, folder-per-project)
// =============================================================================
function CloseMissionModal({ project, tasks, onClose, onDone }) {
  const [achieved, setAchieved] = useState('')
  const [files, setFiles] = useState(null)
  const [fileThem, setFileThem] = useState(true)
  const [closeOpen, setCloseOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const openTasks = (tasks || []).filter(t => t.status !== 'done')
  useEffect(() => {
    let on = true
    const oids = (tasks || []).map(t => t.objective_id).filter(Boolean)
    Promise.all([listLiveFiles({ projectId: project.id }).catch(() => ({ rows: [] })), ...oids.map(id => listLiveFiles({ objectiveId: id }).catch(() => ({ rows: [] })))])
      .then(rs => { if (!on) return; const seen = new Set(); setFiles(rs.flatMap(r => r.rows || []).filter(f => !seen.has(f.id) && seen.add(f.id))) })
    return () => { on = false }
  }, [project.id, tasks])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const go = async () => {
    if (!achieved.trim()) { setErr('Answer the question first. One sentence is enough.'); return }
    setBusy(true); setErr(null)
    try { await onDone({ achieved: achieved.trim(), closeOpen, fileThem, files: files || [] }) } catch (e) { setErr(e?.message || String(e)); setBusy(false) }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(5,14,24,0.74)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(680px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '22px 24px 20px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, marginBottom: 6 }}>Debrief · Mark Mission Complete</div>
        <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 22, color: '#fff', lineHeight: 1.3 }}>{project.name}</div>
        {project.description && <div style={{ marginTop: 10, paddingLeft: 12, borderLeft: `2px solid ${LABEL}`, fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontSize: 14.5, color: TEXT_DIM, lineHeight: 1.5 }}>{project.description}</div>}
        <div style={{ marginTop: 18, fontSize: 14.5, fontWeight: 600, color: '#fff' }}>Is it true? What's different now?</div>
        <textarea value={achieved} onChange={e => setAchieved(e.target.value)} rows={3} placeholder="In your words. It lands in the Archive as Achieved and on the yay page under the star." style={{ ...S.input, width: '100%', marginTop: 8, resize: 'vertical', lineHeight: 1.5 }} autoFocus />
        {openTasks.length > 0 && (
          <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: GOLD }}>{openTasks.length} milestone{openTasks.length === 1 ? '' : 's'} still open</div>
            <div style={{ fontSize: 12.5, color: TEXT_DIM, margin: '6px 0 8px', lineHeight: 1.5 }}>{openTasks.map(t => stripNum(t.text)).join(' · ')}</div>
            <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#fff', cursor: 'pointer' }}><input type="checkbox" checked={closeOpen} onChange={e => setCloseOpen(e.target.checked)} style={{ marginTop: 3 }} /><span>Close them as done with the mission (each pays its 10). Unchecked, they stay open in the mission's history and pay nothing.</span></label>
          </div>
        )}
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: '#fff' }}>{files === null ? 'Checking Live Files' : files.length ? `${files.length} file${files.length === 1 ? '' : 's'} in play on this mission` : 'Nothing in play on this mission'}</div>
          {files && files.length > 0 && (
            <>
              <div style={{ fontSize: 12.5, color: TEXT_DIM, margin: '6px 0 8px', lineHeight: 1.5 }}>{files.map(f => f.name).join(' · ')}</div>
              <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: '#fff', cursor: 'pointer' }}><input type="checkbox" checked={fileThem} onChange={e => setFileThem(e.target.checked)} style={{ marginTop: 3 }} /><span>File them with the mission and take them out of play (they stay on the mission's pages and in the Archive).</span></label>
            </>
          )}
          <div style={{ fontSize: 12, color: GRAY, marginTop: 8 }}>Artifacts, the latest session board and the mission's cabinet file automatically.</div>
        </div>
        {err && <div style={{ marginTop: 10, fontSize: 12.5, color: RED }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
          <button onClick={onClose} disabled={busy} style={S.btnGhost}>Not yet</button>
          <button onClick={go} disabled={busy} style={{ ...S.btnGhost, border: `1px solid ${alpha(SUCCESS, 50)}`, color: SUCCESS, opacity: busy ? 0.6 : 1 }}>{busy ? 'Closing' : '✓ Close the mission · 100 miles'}</button>
        </div>
      </div>
    </div>
  )
}

// Files (10/26): one list. The cabinet's files and folders, the filed live files, the
// artifacts and the shares, each a row with a kind chip. No Cabinet, Artifacts or
// Shares sections: those are kinds of file, not places.
function MissionFiles({ project, api, initialSlug }) {
  const [path, setPath] = useState('')
  const [rows, setRows] = useState(null)
  const [artifact, setArtifact] = useState(initialSlug || null)
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const load = useCallback(async () => {
    const [entries, live, arts, shares] = await Promise.all([
      api.listFiles(project.id, path).catch(() => []),
      path ? [] : listLiveFiles({ projectId: project.id }, { includeFiled: true }).then(r => r.rows.filter(f => f.filed_at && f.bucket !== 'link')).catch(() => []),
      path ? [] : listProjArtifacts(project.id).catch(() => []),
      path ? [] : listShares(project.id).catch(() => []),
    ])
    const out = []
    for (const e of entries) out.push(e.id === null ? { kind: 'folder', key: `d:${e.name}`, name: e.name } : { kind: 'file', key: `f:${e.name}`, name: e.name, when: e.updated_at || e.created_at, entry: e })
    for (const f of live) out.push({ kind: 'filed', key: `l:${f.id}`, name: f.name, when: f.filed_at, live: f })
    for (const a of arts) out.push({ kind: 'artifact', key: `a:${a.slug}`, name: a.slug.replace(/-/g, ' '), when: a.updated_at, slug: a.slug })
    for (const r of shares) out.push({ kind: 'share', key: `s:${r.slug}`, name: r.title || r.slug, when: r.created_at, share: r })
    out.sort((a, b) => (a.kind === 'folder' ? 0 : 1) - (b.kind === 'folder' ? 0 : 1) || String(b.when || '').localeCompare(String(a.when || '')))
    setRows(out)
  }, [project.id, path, api])
  useEffect(() => { load() }, [load])
  const KIND = { folder: ['Folder', GRAY], file: ['File', BLUE], filed: ['Filed', INK2], artifact: ['Artifact', GOLD], share: ['Share', PURPLE] }
  const open = async (r) => {
    try {
      if (r.kind === 'folder') { setPath(path ? `${path}/${r.name}` : r.name); return }
      if (r.kind === 'file') { const u = await api.fileUrl(project.id, path, r.name); if (u) window.open(u, '_blank', 'noopener'); return }
      if (r.kind === 'filed') { window.open(await openLiveFile(r.live), '_blank', 'noopener'); return }
      if (r.kind === 'artifact') { setArtifact(r.slug); return }
      if (r.kind === 'share') { window.open(shareUrl(r.share.slug), '_blank', 'noopener') }
    } catch (e) { setMsg(`Could not open: ${e.message}`) }
  }
  const upload = async (file) => { if (!file) return; setBusy(true); try { await api.uploadFile(project.id, path, file); setMsg(`Filed ${file.name}`); await load() } catch (e) { setMsg(`Could not upload: ${e.message}`) } finally { setBusy(false) } }
  const crumbs = path ? path.split('/') : []
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL }}>
          <button onClick={() => setPath('')} style={{ background: 'none', border: 'none', color: path ? LABEL : INK, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', padding: 0 }}>{project.name}</button>
          {crumbs.map((c, i) => <span key={i}> / <button onClick={() => setPath(crumbs.slice(0, i + 1).join('/'))} style={{ background: 'none', border: 'none', color: i === crumbs.length - 1 ? INK : LABEL, cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', padding: 0 }}>{c}</button></span>)}
        </span>
        <span style={{ flex: 1 }} />
        <label style={{ ...S.btnGhost, cursor: busy ? 'wait' : 'pointer', fontSize: 10 }}>Upload<input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => { upload(e.target.files?.[0]); e.target.value = '' }} /></label>
        <button onClick={async () => { const n = await hudPrompt({ title: 'New folder', placeholder: 'folder name' }); if (n && n.trim()) { await api.createFolder(project.id, path, n.trim()); load() } }} style={{ ...S.btnGhost, fontSize: 10 }}>Folder</button>
      </div>
      {rows === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY, padding: '10px 0' }}>Reading</div>}
      {rows && !rows.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>Nothing filed here yet.</div>}
      {(rows || []).map(r => { const [label, color] = KIND[r.kind]; return (
        <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color, width: 58, flexShrink: 0 }}>{label}</span>
          <button onClick={() => open(r)} style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13.5, color: INK, fontFamily: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}{r.kind === 'folder' ? '/' : ''}{r.live?.version > 1 ? <span style={{ fontFamily: MONO, fontSize: 9, color: GOLD, marginLeft: 8 }}>v{r.live.version}</span> : null}{r.kind === 'share' && !r.share.active ? <span style={{ fontFamily: MONO, fontSize: 9, color: GRAY, marginLeft: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>archived</span> : null}</button>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, whiteSpace: 'nowrap' }}>{r.when ? String(r.when).slice(0, 10) : ''}</span>
          {r.kind === 'share' && <button onClick={async () => { try { await navigator.clipboard.writeText(r.share.code); setMsg('Code copied') } catch { setMsg(`Code: ${r.share.code}`) } }} style={{ ...S.btnGhost, fontSize: 10, padding: '3px 8px', fontFamily: MONO, letterSpacing: '2px', color: r.share.active ? GOLD : GRAY }}>{r.share.code}</button>}
          {r.kind === 'share' && <button onClick={async () => { await archiveShare(r.share, r.share.active); load() }} style={{ ...S.btnGhost, fontSize: 10, padding: '3px 8px', color: r.share.active ? RED : GREEN }}>{r.share.active ? 'Archive' : 'Reactivate'}</button>}
          {r.kind === 'file' && <button onClick={async () => { if (await hudConfirm(`Delete ${r.name}?`)) { await api.deleteFile(project.id, path, r.name); load() } }} title="Delete" style={{ background: 'transparent', border: 'none', color: alpha(INK, 25), cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>}
        </div>
      ) })}
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') ? RED : GOLD, marginTop: 10 }}>{msg}</div>}
      {artifact && (
        <div onClick={() => setArtifact(null)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(5,14,24,0.74)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(960px, 100%)', maxHeight: '90vh', overflowY: 'auto', background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '18px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button onClick={() => setArtifact(null)} style={{ ...S.btnGhost, fontSize: 10 }}>Close</button></div>
            <ArtifactsTab key={artifact} project={project} initialSlug={artifact} />
          </div>
        </div>
      )}
    </div>
  )
}

// Notes (10/26): the mission's own notes, newest first, from project_notes.
function ProjectNotes({ project }) {
  const [rows, setRows] = useState(null)
  const [text, setText] = useState('')
  const load = useCallback(() => sbClient2.from('project_notes').select('id,text,created_at').eq('project_id', project.id).order('created_at', { ascending: false }).limit(200).then(({ data }) => setRows(Array.isArray(data) ? data : [])), [project.id])
  useEffect(() => { load() }, [load])
  const add = async () => { const t = text.trim(); if (!t) return; await sbClient2.from('project_notes').insert({ project_id: project.id, text: t }); setText(''); load() }
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="A note on this mission: commentary, a table in words, a thing to remember." style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, color: INK, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', lineHeight: 1.6, resize: 'vertical' }} />
        <button onClick={add} disabled={!text.trim()} style={{ ...S.btnGhost, alignSelf: 'flex-end' }}>Add</button>
      </div>
      {rows === null && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY }}>Reading</div>}
      {rows && !rows.length && <div style={{ fontSize: 13, color: GRAY }}>No notes on this mission yet.</div>}
      {(rows || []).map(n => (
        <div key={n.id} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '10px 0' }}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: INK, whiteSpace: 'pre-wrap' }}>{n.text}</div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY, marginTop: 4 }}>{new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}</div>
        </div>
      ))}
    </div>
  )
}

function ProjectDetail({ project, board: boardProp, api, onBack, initialTab, initialSlug, onNavigate }) {
  // Milestones first, always (David 10/21). A tab in the hash only sticks when it
  // carries an artifact slug (a deep link from Lumen or a session); otherwise the
  // page opens on Milestones, whatever tab the URL remembered.
  // The card canon (10/26): five pills, the old names still open the right one.
  const LEGACY = { tasks: 'briefing', artifacts: 'files', shares: 'files', planning: 'workbench', cabinet: 'files' }
  const [tab, setTab] = useState(CARD_PILLS.some(([id]) => id === initialTab) ? initialTab : (LEGACY[initialTab] || 'briefing'))
  const [board, setBoard] = useState(boardProp)
  useEffect(() => { let on = true; Promise.resolve().then(() => { if (on) setBoard(boardProp) }); return () => { on = false } }, [boardProp])
  const [artifactSlug, setArtifactSlug] = useState(initialSlug || null)
  const [newTask, setNewTask] = useState('')
  const [closingMission, setClosingMission] = useState(false)
  const [celebrate, setCelebrate] = useState(null)
  const [draft, setDraft] = useState(null)
  const [drafting, setDrafting] = useState(false)
  const [draftErr, setDraftErr] = useState(null)

  // mission hash (David, 10/17): the open mission and its tab ride the URL so a refresh lands back here.
  useEffect(() => { try { const suffix = ((window.location.hash || '').match(/\/item\/[^/]+$/) || [''])[0]; window.history.replaceState(window.history.state, '', `#/main-missions/${project.id}/${tab}${suffix}`) } catch { /* no-op */ } }, [project.id, tab])
  const { plan, history } = planOf(project)
  const tasks = plan.map(p => p.t)
  const [objState, setObjState] = useState({})
  const [evidence, setEvidence] = useState([])
  useEffect(() => { let on = true; listEvidence({ projectId: project.id }).then(r => { if (on) setEvidence(r) }).catch(() => {}); return () => { on = false } }, [project.id, tab])
  const objIds = tasks.map(t => t.objective_id).filter(Boolean).sort().join(',')
  useEffect(() => {
    let on = true
    if (!objIds) { Promise.resolve().then(() => { if (on) setObjState({}) }); return () => { on = false } }
    sbClient2.from('objectives').select('id,state,tags').in('id', objIds.split(',')).then(({ data }) => { if (on) setObjState(Object.fromEntries((data || []).map(o => [o.id, o]))) })
    return () => { on = false }
  }, [objIds])
  const closed = tasks.filter(t => !isOpen(t)).length
  const pct = tasks.length ? Math.round(closed / tasks.length * 100) : 0
  const [showHistory, setShowHistory] = useState(false)
  const [award, setAward] = useState(null)

  const closeMission = async ({ achieved, closeOpen, fileThem, files }) => {
    if (closeOpen) for (const t of (tasks || []).filter(x => x.status !== 'done')) await api.updateTask(project.id, t.id, { status: 'done', done: true, released_at: new Date().toISOString() })
    const ok = await api.updateProject(project.id, { status: 'completed', archived_at: new Date().toISOString() })
    try { await archiveSharesFor(project.id) } catch (e) { console.warn('shares archive', e.message) }
    try { await importProject(project.id, `${project.category === 'personal' ? 'Personal' : 'Third Horizon'}/Missions/${project.name.replace(/[/\\]/g, ' ')}`) } catch (e) { console.warn('cabinet import', e.message) }
    try {
      const list = await listProjArtifacts(project.id)
      const artifacts = await Promise.all(list.map(async a => { const d = await readProjArtifact(project.id, a.slug).catch(() => null); return { slug: a.slug, title: d?.title || a.slug, kind: d?.kind, doc: d } }))
      const { data: sbs } = await sbClient.from('session_boards').select('id,title,phases').or(`project.eq.${project.key || project.name},project.eq.${project.name}`).order('updated_at', { ascending: false }).limit(1)
      const boards = (sbs || []).map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, title: b.title, phases: b.phases || [], done: ts.filter(t => t.status === 'done').length, total: ts.length } })
      await fileProject(project, { artifacts, boards, realm: project.category === 'personal' ? 'personal' : 'third-horizon', achieved })
    } catch (e) { console.warn('archive', e.message) }
    if (fileThem) for (const f of files) { try { await markFiled(f.id, `mission:${project.id}`) } catch (e) { console.warn('file', e.message) } }
    setClosingMission(false)
    // The celebratory moment (David 10/21): the badge, the award, and what is true now.
    if (ok) setCelebrate({ achieved, closed: closeOpen ? (tasks || []).filter(x => x.status !== 'done').length : 0, total: (tasks || []).length })
    else onBack()
  }
  // Natural language in, an organized milestone out (David 10/21): the door
  // api/milestone-draft returns a title, a done-when and steps for him to confirm.
  const organize = async () => {
    const text = newTask.trim(); if (!text) return
    setDrafting(true); setDraftErr(null)
    try {
      const { data: { session } } = await sbAuth.auth.getSession()
      const r = await fetch('/api/milestone-draft', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, project: project.name, polaris: project.description || '', existing: (tasks || []).map(t => stripNum(t.text)) }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error) throw new Error(j.error || `draft ${r.status}`)
      const n = j.number || (text.match(/^\s*(\d+)\s*[·.:)-]/) || [])[1] || null
      setDraft({ ...j, number: n ? Number(n) : null })
    } catch (e) { setDraftErr(e?.message || String(e)) } finally { setDrafting(false) }
  }
  const addDraft = async () => {
    if (!draft?.title?.trim()) return
    const n = draft.number
    const t = await api.addTask(project.id, `${n ? `${n} · ` : ''}${draft.title.trim()}`)
    if (!t) { setDraftErr('Could not add the milestone'); return }
    if (draft.done_when?.trim()) await api.updateTask(project.id, t.id, { notes: draft.done_when.trim() })
    const steps = (draft.steps || []).map(s => s.trim()).filter(Boolean)
    if (steps.length && board?.id) {
      const num = n || ((tasks || []).length + 1)
      const nextPhases = [...(board.phases || []), { title: `${num} · ${draft.title.trim()}`, task_id: t.id, tasks: steps.map((s, i) => ({ id: `${num}.${i + 1}`, label: s, status: 'open' })) }]
      const { error } = await sbClient2.from('session_boards').update({ phases: nextPhases, updated_at: new Date().toISOString() }).eq('id', board.id)
      if (!error) setBoard({ ...board, phases: nextPhases })
    }
    setDraft(null); setNewTask('')
  }
  const submit = async (e) => {
    e.preventDefault()
    const text = newTask.trim()
    if (!text) return
    setNewTask('')
    await api.addTask(project.id, text)
  }

  return (
    <div style={S.page}>
      {closingMission && <CloseMissionModal project={project} tasks={tasks} onClose={() => setClosingMission(false)} onDone={closeMission} />}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <Trail nodes={[{ label: 'Main Missions', onClick: onBack }, { label: project.name }]} />
        {project.status !== 'completed' && !project.archived_at && (
          <button
            onClick={() => setClosingMission(true)}
            title="Whole mission complete: 100 miles on the River"
            style={{ ...S.btnGhost, border: `1px solid ${alpha(SUCCESS, 50)}`, color: SUCCESS }}
          >
            ✓ Mark mission complete
          </button>
        )}
        {project.status !== 'completed' && (
          <button
            onClick={async () => {
              const yes = await hudConfirm({ eyebrow: 'Delete Mission', title: project.name, message: 'Delete this mission? No miles are awarded. Milestones already closed keep theirs. Its artifacts and cabinet stay in the Ledger. It leaves every list.', confirm: 'Delete Mission', danger: true })
              if (!yes) return
              try { await deleteMission(project); await api.refresh(); onBack() } catch (e) { await hudNotice(`Could not delete: ${e.message}`) }
            }}
            title="Delete this mission: no miles, gone from every list"
            style={{ ...S.btnGhost, border: `1px solid ${alpha(RED, 35)}`, color: RED, padding: '6px 10px' }}
          >
            <Trash2 size={12} /> Delete mission
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={S.h1}>{project.name}</h1>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_DIM, margin: '8px 0 0', maxWidth: '72ch' }}>
            {project.description ? <span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE, marginRight: 8, display: 'block', marginBottom: 2 }}>{NORTH_STAR_LABEL}</span><span style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 15.5, color: INK }}>{project.description}</span></span> : <button onClick={async () => { const d = await hudPrompt(`${NORTH_STAR_LABEL}? One sentence.`, ''); if (d?.trim()) await api.updateProject(project.id, { description: d.trim() }) }} style={{ ...S.btnGhost, padding: '3px 9px', fontSize: 10 }}>Write the Polaris Objective</button>}
          </div>
          <div style={{ ...S.sub, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span>{[CATEGORY_LABELS[project.category] || project.category, project.key, '100 miles on completion · 10 per milestone'].filter(Boolean).join(' · ')}</span>
            <button onClick={() => api.updateProject(project.id, { tags: isHorizon(project) ? (project.tags || []).filter(t => t !== 'horizon') : [...(project.tags || []), 'horizon'] })} title={isHorizon(project) ? 'On the horizon: no clock. Click to bring it into the standing missions.' : 'Click to put it on the horizon: no clock, a chip on the page.'} style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, border: `1px ${isHorizon(project) ? 'dashed' : 'solid'} ${PANEL_BORDER}`, background: 'transparent', color: isHorizon(project) ? GRAY : LABEL, cursor: 'pointer' }}>{isHorizon(project) ? 'Horizon' : 'Standing'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 6, flexWrap: 'wrap' }}>
          {CARD_PILLS.map(([id, label]) => <CardPill key={id} active={tab === id} onClick={() => setTab(id)} count={id === 'briefing' ? tasks.length : id === 'polaris' ? evidence.length : 0}>{label}</CardPill>)}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 0' }}>
        <span style={{ flex: 1, height: 5, borderRadius: 99, background: alpha(INK, 8), overflow: 'hidden' }}><span style={{ display: 'block', width: `${pct}%`, height: '100%', background: GOLD }} /></span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL }}>{closed} of {tasks.length} closed</span>
      </div>

      <div style={{ ...S.panel, marginTop: 20 }}>
        {tab === 'briefing' && (
          <div>
            {!tasks.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>No milestones yet. Add the first one below: a thing that will be verifiably true.</div>}
            {plan.map(({ t, n }) => <MilestoneRow key={t.id} n={n} project={project} task={t} board={board} api={api} onNavigate={onNavigate} onBoardChange={setBoard} onAward={setAward} objState={objState} />)}
            {history.length > 0 && (
              <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '10px 0 0' }}>
                <button onClick={() => setShowHistory(x => !x)} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>{showHistory ? 'Hide' : 'Show'} earlier work · {history.length} closed before this plan</button>
                {showHistory && history.map(t => (
                  <div key={t.id} style={{ display: 'flex', gap: 10, padding: '6px 0', fontSize: 13, color: GRAY, textDecoration: 'line-through', opacity: 0.7 }}><Check size={12} color={SUCCESS} style={{ flexShrink: 0, marginTop: 3 }} /><span>{t.text}</span></div>
                ))}
              </div>
            )}
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Say the milestone in your own words; Organize writes it up, or add it as typed (lead with its number to place it)" style={{ ...S.input, flex: 1 }} />
              <button type="button" onClick={organize} disabled={drafting || !newTask.trim()} title="Lumen organizes what you typed into a milestone: Title Case, a done-when, three to five steps. You confirm before it lands." style={{ ...S.btnGhost, opacity: drafting || !newTask.trim() ? 0.5 : 1 }}>{drafting ? 'Organizing' : '✦ Organize'}</button>
              <button type="submit" style={S.btnPrimary}><Plus size={13} /> Milestone</button>
            </form>
            {draftErr && <div style={{ fontSize: 12.5, color: RED, marginTop: 8 }}>{draftErr}</div>}
            {draft && (
              <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${alpha(LABEL, 40)}`, background: alpha(LABEL, 6) }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, marginBottom: 8 }}>Draft milestone · edit, then add</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input value={draft.number ?? ''} onChange={e => setDraft({ ...draft, number: e.target.value ? Number(e.target.value) : null })} placeholder="#" style={{ ...S.input, width: 56 }} />
                  <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} style={{ ...S.input, flex: 1, fontWeight: 600 }} />
                </div>
                <div style={{ fontSize: 11, color: LABEL, margin: '10px 0 4px', fontWeight: 600 }}>Done when</div>
                <input value={draft.done_when || ''} onChange={e => setDraft({ ...draft, done_when: e.target.value })} style={{ ...S.input, width: '100%' }} />
                <div style={{ fontSize: 11, color: LABEL, margin: '10px 0 4px', fontWeight: 600 }}>Steps</div>
                {(draft.steps || []).map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 11, color: GRAY, width: 22, paddingTop: 8 }}>{i + 1}</span>
                    <input value={s} onChange={e => setDraft({ ...draft, steps: draft.steps.map((x, j) => j === i ? e.target.value : x) })} style={{ ...S.input, flex: 1 }} />
                    <button type="button" onClick={() => setDraft({ ...draft, steps: draft.steps.filter((_, j) => j !== i) })} style={{ ...S.btnGhost, padding: '4px 8px' }}>✕</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 10 }}>
                  <button type="button" onClick={() => setDraft({ ...draft, steps: [...(draft.steps || []), ''] })} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}><Plus size={10} /> Step</button>
                  <button type="button" onClick={() => setDraft(null)} style={S.btnGhost}>Discard</button>
                  <button type="button" onClick={addDraft} style={S.btnPrimary}><Plus size={13} /> Add This Milestone</button>
                </div>
                {!board?.id && (draft.steps || []).length > 0 && <div style={{ fontSize: 11.5, color: GRAY, marginTop: 8 }}>Steps need a session board on this mission; the title and done-when land now, the steps once a session opens its board.</div>}
              </div>
            )}
          </div>
        )}
        {tab === 'workbench' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 30, minWidth: 0 }}>
            <div style={{ minWidth: 0, overflow: 'hidden' }}><CanonLabel>Planning</CanonLabel><PlanningCanvas project={project} /></div>
            <div style={{ minWidth: 0 }}><CanonLabel>Workspace</CanonLabel><WorkspacePages root={project.id} what="mission" /></div>
            <div style={{ minWidth: 0 }}><CanonLabel>In Play</CanonLabel><WorkbenchTab project={project} intake={false} /></div>
          </div>
        )}
        {tab === 'files' && (
          <div style={{ display: 'grid', gap: 30 }}>
            <div><CanonLabel>Bring In</CanonLabel><WorkbenchIntake project={project} /></div>
            <div><CanonLabel>Filed</CanonLabel><MissionFiles project={project} api={api} initialSlug={artifactSlug} /></div>
          </div>
        )}
        {tab === 'notes' && <ProjectNotes project={project} />}
        {tab === 'polaris' && (
          <div style={{ display: 'grid', gap: 22 }}>
            <div>
              <CanonLabel style={{ color: BLUE }}>{NORTH_STAR_LABEL}</CanonLabel>
              <textarea defaultValue={project.description || ''} rows={3} onBlur={e => { const v = e.target.value.trim() || null; if (v !== (project.description || null)) api.updateProject(project.id, { description: v }) }} placeholder="What will be true when this mission is done? One sentence." style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 17, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.45, resize: 'vertical' }} />
            </div>
            <div>
              <CanonLabel>Evidence{evidence.length ? ` · ${evidence.length}` : ''}</CanonLabel>
              {!evidence.length && <div style={{ fontSize: 13, color: GRAY }}>Nothing pinned yet. When the thing that proves the objective exists, pin it with the star on the Workbench and it shows here.</div>}
              {evidence.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: GOLD, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{f.version > 1 ? <span style={{ fontFamily: MONO, fontSize: 9, color: GOLD, marginLeft: 8 }}>v{f.version}</span> : null}</span>
                  <button onClick={async () => { try { window.open(f.bucket === 'link' ? f.path : await openLiveFile(f), '_blank', 'noopener') } catch { /* no-op */ } }} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Open</button>
                </div>
              ))}
            </div>
            {project.status === 'completed' && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: GREEN }}>Complete{project.archived_at ? ` · ${String(project.archived_at).slice(0, 10)}` : ''}</div>}
          </div>
        )}
      {celebrate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(5,16,28,0.84)', display: 'grid', placeItems: 'center', zIndex: 80 }}>
          <div style={{ ...S.panel, width: 'min(560px, 94vw)', textAlign: 'center', padding: '38px 32px 28px', display: 'grid', gap: 12, justifyItems: 'center', border: `1px solid ${alpha(GOLD, 45)}`, boxShadow: `0 0 90px ${alpha(GOLD, 18)}` }}>
            <BadgeMedallion id="main-mission" size={136} glow />
            <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '2.4px', textTransform: 'uppercase', color: GOLD }}>Main Mission Complete</div>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, letterSpacing: '-0.01em', color: INK, lineHeight: 1.2 }}>{project.name}</div>
            <div style={{ fontSize: 13.5, color: TEXT_DIM, lineHeight: 1.5 }}>{BADGES['main-mission'].label} · {BADGES['main-mission'].miles} miles on the River at the next update{celebrate.closed ? ` · ${celebrate.closed} milestone${celebrate.closed === 1 ? '' : 's'} closed with it, ${BADGES['mission-task'].miles} each` : ''}.</div>
            <div style={{ width: '100%', marginTop: 6, padding: '14px 16px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: PANEL_BG, textAlign: 'left' }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: LABEL, marginBottom: 6 }}>What is true now, that was not true before</div>
              {project.description && <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 16, color: INK, lineHeight: 1.5 }}>{project.description}</div>}
              {celebrate.achieved && <div style={{ fontSize: 13.5, color: TEXT_DIM, lineHeight: 1.55, marginTop: project.description ? 10 : 0 }}><span style={{ color: GOLD, fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', marginRight: 8 }}>Achieved</span>{celebrate.achieved}</div>}
            </div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: GRAY }}>{BADGES['main-mission'].lore}</div>
            <button onClick={() => { setCelebrate(null); onBack() }} style={{ ...S.btnPrimary, marginTop: 6 }}>Continue</button>
          </div>
        </div>
      )}
      {award && (
        <div onClick={() => setAward(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(5,16,28,0.78)', display: 'grid', placeItems: 'center', zIndex: 60 }}>
          <div onClick={e => e.stopPropagation()} style={{ ...S.panel, width: 'min(440px, 92vw)', textAlign: 'center', padding: '34px 28px 26px', display: 'grid', gap: 12, justifyItems: 'center' }}>
            <BadgeMedallion id="mission-task" size={112} glow />
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: PURPLE }}>MMT badge awarded</div>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, letterSpacing: '-0.01em', color: INK, lineHeight: 1.25 }}>{award.n} · {award.title}</div>
            <div style={{ fontSize: 13, color: TEXT_DIM, lineHeight: 1.5 }}>{BADGES['mission-task'].label} · {BADGES['mission-task'].miles} miles on the River at the next update.</div>
            <div style={{ fontFamily: SERIF, fontStyle: 'italic', fontSize: 13, color: GRAY }}>{BADGES['mission-task'].lore}</div>
            <button onClick={() => setAward(null)} style={{ ...S.btnPrimary, marginTop: 6 }}>Continue</button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// =============================================================================
// Page
// =============================================================================
export default function ProjectsPage({ deepLink = [], onNavigate } = {}) {
  const api = useProjects()
  const { loading, projects, boards } = api
  const [detailId, setDetailId] = useState(deepLink[0] || null)
  useEffect(() => { if (deepLink[0]) setDetailId(deepLink[0]) }, [deepLink])
  const [catFilter, setCatFilter] = useState('all')
  const [showArchived, setShowArchived] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState('client')
  const [newHorizon, setNewHorizon] = useState(true)
  // Board state of every promoted milestone, for the card edges and the bands.
  const [objStates, setObjStates] = useState({})
  const allObjIds = projects.flatMap(p => (p.tasks || []).map(t => t.objective_id)).filter(Boolean).sort().join(',')
  useEffect(() => {
    let on = true
    if (!allObjIds) { Promise.resolve().then(() => { if (on) setObjStates({}) }); return () => { on = false } }
    sbClient2.from('objectives').select('id,state,tags').in('id', allObjIds.split(',')).then(({ data }) => { if (on) setObjStates(Object.fromEntries((data || []).map(o => [o.id, o]))) })
    return () => { on = false }
  }, [allObjIds])

  if (loading && !projects.length) {
    return <div style={{ ...S.page, fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: GRAY }}>LOADING…</div>
  }

  const active = projects.filter(p => p.status !== 'archived' && !p.archived_at)
  const archived = projects.filter(p => p.status === 'archived' || p.archived_at)

  const detail = detailId ? projects.find(p => p.id === detailId) : null
  if (detail) {
    const board = boards.find(b => b.project === detail.key) || null
    return <ProjectDetail key={detail.id + (deepLink[1] || '') + (deepLink[2] || '')} project={detail} board={board} api={api} onBack={() => { setDetailId(null); try { window.history.replaceState(window.history.state, '', '#/main-missions') } catch { /* no-op */ } }} initialTab={deepLink[0] === detail.id ? deepLink[1] : undefined} initialSlug={deepLink[0] === detail.id ? deepLink[2] : undefined} onNavigate={onNavigate} />
  }

  const cats = CATEGORY_ORDER.filter(c => active.some(p => p.category === c))
  const shown = catFilter === 'all' ? active : active.filter(p => p.category === catFilter)
  const withB = shown.map(p => ({ p, b: boardStateOf(p, objStates) }))
  const byTouch = (a, b) => new Date(b.p.last_activity_at || 0) - new Date(a.p.last_activity_at || 0)
  const nowBand = withB.filter(x => !isHorizon(x.p) && x.b !== 'off').sort((a, b) => (a.b === 'loadout' ? 0 : 1) - (b.b === 'loadout' ? 0 : 1) || byTouch(a, b))
  const steady = withB.filter(x => !isHorizon(x.p) && x.b === 'off').sort(byTouch)
  const horizon = withB.filter(x => isHorizon(x.p)).sort(byTouch)
  const standing = active.filter(p => !isHorizon(p)).length
  const onBoardCount = active.filter(p => !isHorizon(p) && boardStateOf(p, objStates) !== 'off').length

  const create = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const p = await api.createProject({ name, category: newCat, tags: newHorizon ? ['horizon'] : [] })
    setNewName(''); setAdding(false)
    if (p) setDetailId(p.id)
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={S.h1}>Main Missions</h1>
          <div style={{ fontFamily: SERIF, fontSize: 19, color: INK, marginTop: 8, lineHeight: 1.3 }}>
            {standing} standing · <span style={{ color: onBoardCount ? GREEN : INK }}>{onBoardCount} on the Board</span>{horizon.length ? <span style={{ color: TEXT_DIM }}> · {horizon.length} on the horizon</span> : null}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
          <button style={S.btnGhost} onClick={api.refresh}><RefreshCw size={13} /> Refresh</button>
          <button style={S.btnPrimary} onClick={() => setAdding(!adding)}><Plus size={13} /> Add project</button>
        </div>
      </div>

      {adding && (
        <form onSubmit={create} style={{ ...S.panel, marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Project name" style={{ ...S.input, flex: 1, minWidth: 220 }} />
          <select value={newCat} onChange={e => setNewCat(e.target.value)} style={{ ...S.input, width: 190 }}>
            {CATEGORY_ORDER.map(c => <option key={c} value={c} style={{ color: '#0F2334' }}>{CATEGORY_LABELS[c]}</option>)}
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10.5, letterSpacing: '1px', textTransform: 'uppercase', color: newHorizon ? LABEL : GRAY, cursor: 'pointer', padding: '0 6px' }}><input type="checkbox" checked={newHorizon} onChange={e => setNewHorizon(e.target.checked)} /> Horizon · no clock yet</label>
          <button type="submit" style={S.btnPrimary}>Create</button>
        </form>
      )}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '20px 0 18px' }}>
        <Pill active={catFilter === 'all'} onClick={() => setCatFilter('all')}>All · {active.length}</Pill>
        {cats.map(c => (
          <Pill key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
            {CATEGORY_LABELS[c]} · {active.filter(p => p.category === c).length}
          </Pill>
        ))}
      </div>

      {nowBand.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: GREEN }}>Now</span><span style={{ flex: 1, height: 1, background: PANEL_BORDER }} /><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>a milestone in the Loadout (green) or the Stash (gold)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {nowBand.map(({ p, b }) => <ProjectCard key={p.id} project={p} onOpen={setDetailId} edge={EDGE[b]} />)}
          </div>
        </div>
      )}
      {steady.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }}>Steady</span><span style={{ flex: 1, height: 1, background: PANEL_BORDER }} /><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>standing, nothing on the Board</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {steady.map(({ p }) => <ProjectCard key={p.id} project={p} onOpen={setDetailId} compact edge={BLUE} />)}
          </div>
        </div>
      )}
      {horizon.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: GRAY }}>Horizon</span><span style={{ flex: 1, height: 1, background: PANEL_BORDER }} /><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>no clock on these</span></div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {horizon.map(({ p }) => <button key={p.id} onClick={() => setDetailId(p.id)} title={p.description || p.name} style={{ fontSize: 12.5, color: TEXT_DIM, border: `1px dashed ${PANEL_BORDER}`, borderRadius: 999, padding: '6px 12px', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>{p.name}</button>)}
          </div>
        </div>
      )}
      {!nowBand.length && !steady.length && !horizon.length && <div style={{ fontSize: 13, color: GRAY, padding: '20px 0' }}>Nothing here.</div>}

      {archived.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <button onClick={() => setShowArchived(!showArchived)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6,
            fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: GRAY, textTransform: 'uppercase',
          }}>
            <Archive size={11} /> {showArchived ? 'Hide' : 'Show'} archive · {archived.length}
          </button>
          {showArchived && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12, marginTop: 12, opacity: 0.6 }}>
              {archived.map(p => <ProjectCard key={p.id} project={p} onOpen={setDetailId} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
