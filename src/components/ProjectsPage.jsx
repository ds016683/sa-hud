import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, ArrowLeft, Check, Trash2, ArrowUpRight, Folder, FolderPlus, FileText,
  Upload, Download, Archive, ChevronRight, Hand, RefreshCw,
} from 'lucide-react'
import useProjects, { freshnessOf } from '../hooks/useProjects'
import ArtifactsTab from './river/ArtifactsTab'
import ItemDetail from './river/ItemDetail'
import SessionBoard from './river/SessionBoard'
import { listShares, archiveShare, archiveSharesFor, shareUrl } from '../lib/shares'
import { fileProject } from '../lib/archive'
import { equipTask } from '../lib/loadout'
import { supabase as sbClient2 } from '../lib/supabase'
import { listArtifacts as listProjArtifacts, readArtifact as readProjArtifact } from '../lib/artifacts'
import { supabase as sbClient } from '../lib/supabase'

// =============================================================================
// STYLE TOKENS (CIP canon, matches ObjectivesPage dark stage)
// =============================================================================
const INK = '#EAF1F8'
const NAVY_DEEP = '#0E2336'
const BLUE = '#A9C9E8'
const BLUE_DEEP = '#7FA8D4'
const GRAY = 'rgba(234,241,248,0.45)'
const TEXT_DIM = 'rgba(234,241,248,0.66)'
const PANEL_BORDER = 'rgba(255,255,255,0.10)'
const PANEL_BG = 'rgba(255,255,255,0.035)'
const GOLD = '#E6B54F'
const GREEN = '#43D392'
const RED = '#E06C5F'

const SERIF = "'Lora', Georgia, serif"
const MONO = 'var(--font-mono, monospace)'

const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px', color: INK },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: '#FFFFFF', fontFamily: SERIF, letterSpacing: '-0.01em' },
  sub: { fontSize: 10, color: GRAY, margin: '6px 0 0', fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16 },
  panelTitle: { fontSize: 10, fontWeight: 600, color: BLUE, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: 10, fontFamily: MONO },
  btnPrimary: { background: BLUE, color: NAVY_DEEP, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { background: 'rgba(255,255,255,0.05)', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 },
  input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.07)', color: INK },
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

const isOpen = (t) => t.status !== 'done' && !t.done
const isBlocked = (t) => t.status === 'blocked'

// =============================================================================
// Baseball card
// =============================================================================
// Milestones are the mission's tasks in creation order; the page numbers
// them by position (a leading "N · " typed into the text is stripped).
const stripNum = (t) => String(t || '').replace(/^\s*\d+\s*[·.:)-]\s*/, '')
const milestonesOf = (project) => [...(project.tasks || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
const nowMilestone = (ms) => ms.find(t => isOpen(t) && t.objective_id) || ms.find(t => isOpen(t)) || null

function ProjectCard({ project, onOpen }) {
  const ms = milestonesOf(project)
  const closed = ms.filter(t => !isOpen(t)).length
  const now = nowMilestone(ms)
  const next = now ? ms.find(t => isOpen(t) && t.id !== now.id) : null
  const blocked = ms.filter(t => isOpen(t) && isBlocked(t)).length
  const fresh = freshnessOf(project.last_activity_at)
  const freshColor = fresh === 'fresh' ? GREEN : fresh === 'warning' ? GOLD : GRAY
  const lastTouch = project.last_activity_at ? new Date(project.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never'
  const pct = ms.length ? Math.round(closed / ms.length * 100) : 0
  return (
    <button onClick={() => onOpen(project.id)} style={{ ...S.panel, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 150, width: '100%', transition: 'border-color 120ms' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(169,201,232,0.4)'} onMouseLeave={e => e.currentTarget.style.borderColor = PANEL_BORDER}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 17, letterSpacing: '-0.01em', color: INK, lineHeight: 1.3 }}>{project.name}</div>
          {project.description && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TEXT_DIM, marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{project.description}</div>}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: BLUE, border: `1px solid ${BLUE}55`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{CATEGORY_LABELS[project.category] || project.category}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14, color: INK }}>{closed} / {ms.length}</span>
        <span style={{ flex: 1, height: 4, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><span style={{ display: 'block', width: `${pct}%`, height: '100%', background: GOLD }} /></span>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>milestones</span>
      </div>
      <div style={{ marginTop: 'auto' }}>
        {now ? <div style={{ fontSize: 12.5, color: INK, lineHeight: 1.4 }}><span style={{ color: now.objective_id ? GREEN : GOLD, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', marginRight: 6 }}>{now.objective_id ? 'on the board' : 'now'}</span>{stripNum(now.text)}</div>
          : <div style={{ fontSize: 12.5, color: GRAY }}>{ms.length ? 'Every milestone closed.' : 'No milestones yet.'}</div>}
        {next && <div style={{ fontSize: 11.5, color: GRAY, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>next · {stripNum(next.text)}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: GRAY, textTransform: 'uppercase' }}>
        {blocked > 0 && <span style={{ color: RED, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Hand size={10} /> {blocked} on David</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: freshColor }} />touched {lastTouch}</span>
      </div>
    </button>
  )
}

// =============================================================================
// Detail: milestone row. The steps under it come from the mission's session
// board: the phase whose items carry this task id. Ticking a step or adding
// one writes that board, the same document the agent writes.
// =============================================================================
const Chip = ({ color, children }) => <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color, border: `1px solid ${color}55`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap' }}>{children}</span>

function MilestoneRow({ n, project, task, board, api, onNavigate, onBoardChange }) {
  const open = isOpen(task)
  const blocked = isBlocked(task)
  const onBoard = !!task.objective_id && open
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const phases = board?.phases || []
  const pi = phases.findIndex(ph => (ph.tasks || []).some(t => t.task_id === task.id))
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
  const addStep = () => {
    const label = window.prompt('The step', ''); if (!label?.trim()) return
    const item = { id: `${n}.${steps.length + 1}`, label: label.trim(), status: 'open', task_id: task.id }
    if (phase) writeBoard(phases.map((ph, i) => i !== pi ? ph : { ...ph, tasks: [...(ph.tasks || []), item] }))
    else writeBoard([...phases, { title: stripNum(task.text), tasks: [item] }])
  }
  const load = async () => { setBusy(true); try { const r = await equipTask(task, project.name, { clock: false }); setMsg(r.ok ? 'On the Board' : `Will not fit: ${r.reasons.join(' · ')}`); if (r.ok) api.refresh() } catch (e) { setMsg(`Could not load: ${e.message}`) } finally { setBusy(false) } }
  const rename = async () => { const t = window.prompt('Milestone', stripNum(task.text)); if (!t?.trim()) return; await api.updateTask(project.id, task.id, { text: t.trim() }) }
  const doneWhen = async () => { const t = window.prompt('Done when…', task.notes || ''); if (t === null) return; await api.updateTask(project.id, task.id, { notes: t.trim() || null }) }

  return (
    <div style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '12px 0', opacity: open ? 1 : 0.55 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, lineHeight: 1, color: open ? (onBoard ? GREEN : GOLD) : GREEN, width: 26, flexShrink: 0, paddingTop: 2 }}>{n}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span onClick={() => setExpanded(x => !x)} title="Open this milestone" style={{ fontSize: 15, lineHeight: 1.4, color: open ? INK : GRAY, textDecoration: open ? 'none' : 'line-through', cursor: 'pointer', flex: 1, minWidth: 220 }}>{stripNum(task.text)}</span>
            {!open && <Chip color={GREEN}>closed{task.released_at ? ` ${new Date(task.released_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''} · 10 mi</Chip>}
            {open && onBoard && <Chip color={GREEN}>on the board</Chip>}
            {open && blocked && <Chip color={RED}>blocked · needs David</Chip>}
            {steps.length > 0 && <Chip color={stepsDone === steps.length ? GOLD : GRAY}>{stepsDone} / {steps.length} steps</Chip>}
          </div>
          {task.notes && <div style={{ fontSize: 12.5, color: TEXT_DIM, marginTop: 3, lineHeight: 1.5 }}>Done when: {task.notes}</div>}
          {steps.length > 0 && (
            <div style={{ marginTop: 8, display: 'grid', gap: 2 }}>
              {steps.map((st, ti) => (
                <button key={st.id || ti} onClick={() => toggleStep(ti)} title={st.status === 'done' ? 'Reopen' : 'Mark done'} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, background: 'transparent', border: 'none', padding: '3px 0', cursor: 'pointer', textAlign: 'left', color: INK }}>
                  {st.status === 'done' ? <span style={{ width: 15, height: 15, borderRadius: 99, background: GREEN, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}><Check size={10} color={NAVY_DEEP} /></span>
                    : <span style={{ width: 15, height: 15, borderRadius: 99, border: `1.5px solid ${st.status === 'inmotion' ? GOLD : st.status === 'blocked' ? RED : 'rgba(234,241,248,0.3)'}`, display: 'inline-block', flexShrink: 0, marginTop: 2 }} />}
                  <span style={{ fontFamily: MONO, fontSize: 10, color: GOLD, letterSpacing: '0.5px', paddingTop: 2, flexShrink: 0 }}>{st.id}</span>
                  <span style={{ fontSize: 13, lineHeight: 1.45, color: st.status === 'done' ? GRAY : INK, textDecoration: st.status === 'done' ? 'line-through' : 'none' }}>{st.label}{st.note && <span style={{ display: 'block', fontSize: 12, color: st.status === 'blocked' ? RED : GRAY }}>{st.note}</span>}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
            <button onClick={() => setExpanded(x => !x)} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Open</button>
            {open && !onBoard && <button onClick={load} disabled={busy} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10, color: GREEN, borderColor: 'rgba(67,211,146,0.4)' }}>Load</button>}
            {open && <button onClick={addStep} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}><Plus size={10} /> Step</button>}
            {open && <button onClick={doneWhen} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Done when</button>}
            {open && <button onClick={rename} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Rename</button>}
            {open
              ? <button onClick={() => { if (window.confirm(`Close milestone ${n}? 10 miles on the next update.`)) api.toggleTask(project.id, task) }} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10, color: GOLD, borderColor: 'rgba(230,181,79,0.4)' }}><Check size={10} /> Close milestone</button>
              : <button onClick={() => api.toggleTask(project.id, task)} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Reopen</button>}
            <button onClick={() => { if (window.confirm('Delete this milestone?')) api.deleteTask(project.id, task.id) }} title="Delete" style={{ background: 'transparent', border: 'none', color: 'rgba(234,241,248,0.25)', cursor: 'pointer', padding: 4 }}><Trash2 size={12} /></button>
          </div>
          {msg && <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: msg.startsWith('Could') || msg.startsWith('Will') || msg.startsWith('No session') ? RED : GOLD, marginTop: 6 }}>{msg}</div>}
        </div>
      </div>
      {expanded && <ItemDetail item={{ id: task.objective_id || task.id, objective_id: task.objective_id || null, task_id: task.id, kind: 'Main Mission', title: stripNum(task.text), project: project.name, project_id: project.id, description: task.notes }} onClose={() => setExpanded(false)} onNavigate={onNavigate} onChange={() => api.refresh()} />}
    </div>
  )
}

// =============================================================================
// Detail: files browser (Supabase Storage, folder-per-project)
// =============================================================================
function FilesTab({ project, listFiles, uploadFile, createFolder, fileUrl, deleteFile }) {
  const [path, setPath] = useState('') // subpath below the project root
  const [entries, setEntries] = useState(undefined)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const load = useCallback(async () => {
    setEntries(undefined)
    const list = await listFiles(project.id, path)
    setEntries(list)
  }, [project.id, path, listFiles])

  useEffect(() => { load() }, [load])

  const crumbs = path ? path.split('/') : []
  const folders = (entries || []).filter(e => e.id === null)
  const files = (entries || []).filter(e => e.id !== null)

  const onUpload = async (ev) => {
    const picked = Array.from(ev.target.files || [])
    if (!picked.length) return
    setBusy(true)
    for (const f of picked) await uploadFile(project.id, path, f)
    setBusy(false)
    ev.target.value = ''
    load()
  }

  const onNewFolder = async () => {
    const name = window.prompt('Folder name')
    if (!name || !name.trim()) return
    await createFolder(project.id, path, name.trim().replace(/\//g, '-'))
    load()
  }

  const onOpenFile = async (name) => {
    const url = await fileUrl(project.id, path, name)
    if (url) window.open(url, '_blank', 'noopener')
  }

  const fmtSize = (b) => {
    if (b == null) return ''
    if (b < 1024) return `${b} B`
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / 1048576).toFixed(1)} MB`
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', color: TEXT_DIM, minWidth: 200 }}>
          <button onClick={() => setPath('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: crumbs.length ? BLUE : GRAY, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', padding: 0 }}>
            {(project.key || project.name).toUpperCase()}
          </button>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ChevronRight size={11} style={{ color: GRAY }} />
              <button onClick={() => setPath(crumbs.slice(0, i + 1).join('/'))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === crumbs.length - 1 ? GRAY : BLUE, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', padding: 0 }}>
                {c.toUpperCase()}
              </button>
            </span>
          ))}
        </div>
        <button style={S.btnGhost} onClick={onNewFolder}><FolderPlus size={13} /> Folder</button>
        <button style={{ ...S.btnPrimary, opacity: busy ? 0.5 : 1 }} disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload size={13} /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={onUpload} />
      </div>

      {entries === undefined && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', color: GRAY }}>LOADING…</div>}
      {entries !== undefined && !folders.length && !files.length && (
        <div style={{ fontSize: 13, color: GRAY, padding: '18px 0' }}>Empty. Drop files in with Upload, or make a folder.</div>
      )}

      {folders.map(f => (
        <button key={f.name} onClick={() => setPath(path ? `${path}/${f.name}` : f.name)} style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 2px',
          background: 'none', border: 'none', borderTop: `1px solid ${PANEL_BORDER}`, cursor: 'pointer',
          color: INK, fontFamily: 'inherit', fontSize: 13.5, textAlign: 'left',
        }}>
          <Folder size={15} style={{ color: BLUE_DEEP, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{f.name}</span>
          <ChevronRight size={13} style={{ color: GRAY }} />
        </button>
      ))}
      {files.map(f => (
        <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderTop: `1px solid ${PANEL_BORDER}` }}>
          <FileText size={15} style={{ color: GRAY, flexShrink: 0 }} />
          <button onClick={() => onOpenFile(f.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK, fontFamily: 'inherit', fontSize: 13.5, textAlign: 'left', flex: 1, padding: 0, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {f.name}
          </button>
          <span style={{ fontFamily: MONO, fontSize: 9.5, color: GRAY }}>{fmtSize(f.metadata?.size)}</span>
          <button onClick={() => onOpenFile(f.name)} title="Open / download" style={{ background: 'none', border: 'none', color: BLUE, cursor: 'pointer', padding: 4 }}><Download size={13} /></button>
          <button onClick={async () => { if (window.confirm(`Delete ${f.name}?`)) { await deleteFile(project.id, path, f.name); load() } }} title="Delete" style={{ background: 'none', border: 'none', color: 'rgba(234,241,248,0.25)', cursor: 'pointer', padding: 4 }}><Trash2 size={13} /></button>
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Detail view
// =============================================================================

// Private shares owned by this mission: a page on the HUD's domain behind an
// access code. Archiving retires the code; completing the mission archives all.
function SharesTab({ project }) {
  const [recs, setRecs] = useState(undefined)
  const [msg, setMsg] = useState(null)
  const load = useCallback(() => listShares(project.id).then(setRecs).catch(e => { setRecs([]); setMsg(e.message) }), [project.id])
  useEffect(() => { load() }, [load])
  const copy = async (text, what) => { try { await navigator.clipboard.writeText(text); setMsg(`${what} copied`) } catch { setMsg(`Copy failed; ${what}: ${text}`) } }
  if (recs === undefined) return <div style={{ fontSize: 13, color: GRAY, padding: '12px 0' }}>Loading…</div>
  if (!recs.length) return <div style={{ fontSize: 13, color: GRAY, padding: '12px 0' }}>No private pages shared from this mission. Claude publishes them here; each carries its own access code and is archived with the mission.</div>
  return (
    <div>
      {recs.map(r => (
        <div key={r.slug} style={{ borderTop: `1px solid ${PANEL_BORDER}`, padding: '12px 0', display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, color: r.active ? INK : GRAY }}>{r.title || r.slug}{!r.active && <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', color: GRAY, marginLeft: 8, textTransform: 'uppercase' }}>archived{r.archived_at ? ` · ${String(r.archived_at).slice(0, 10)}` : ''}</span>}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
              <button onClick={() => copy(shareUrl(r.slug), 'Link')} style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', fontFamily: MONO }}>{shareUrl(r.slug).replace(/^https?:\/\//, '')}</button>
              <button onClick={() => copy(r.code, 'Code')} style={{ ...S.btnGhost, fontSize: 11, padding: '4px 10px', fontFamily: MONO, letterSpacing: '2px', color: r.active ? GOLD : GRAY, borderColor: r.active ? 'rgba(230,181,79,0.4)' : PANEL_BORDER }}>{r.code}</button>
              <span style={{ fontSize: 11, color: GRAY }}>click to copy · created {String(r.created_at || '').slice(0, 10)}</span>
            </div>
            {r.note && <div style={{ fontSize: 12.5, color: TEXT_DIM, marginTop: 6 }}>{r.note}</div>}
          </div>
          <button onClick={async () => { await archiveShare(r, r.active); setMsg(r.active ? `Archived ${r.title || r.slug}; the code no longer opens it.` : `Reactivated ${r.title || r.slug}.`); load() }} style={{ ...S.btnGhost, fontSize: 10, padding: '5px 10px', color: r.active ? RED : GREEN, borderColor: r.active ? 'rgba(232,131,111,0.4)' : 'rgba(67,211,146,0.4)' }}>{r.active ? 'Archive' : 'Reactivate'}</button>
        </div>
      ))}
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: GOLD, marginTop: 10, textTransform: 'uppercase' }}>{msg}</div>}
    </div>
  )
}

function ProjectDetail({ project, board: boardProp, api, onBack, initialTab, initialSlug, onNavigate }) {
  const [tab, setTab] = useState(initialTab && ['tasks', 'board', 'artifacts', 'files', 'shares'].includes(initialTab) ? (initialTab === 'board' ? 'tasks' : initialTab) : 'tasks')
  const [board, setBoard] = useState(boardProp)
  useEffect(() => { let on = true; Promise.resolve().then(() => { if (on) setBoard(boardProp) }); return () => { on = false } }, [boardProp])
  const [artifactSlug, setArtifactSlug] = useState(initialSlug || null)
  const openArtifact = (slug) => { setArtifactSlug(slug); setTab('artifacts') }
  const [newTask, setNewTask] = useState('')

  const tasks = milestonesOf(project)
  const closed = tasks.filter(t => !isOpen(t)).length
  const pct = tasks.length ? Math.round(closed / tasks.length * 100) : 0

  const submit = async (e) => {
    e.preventDefault()
    const text = newTask.trim()
    if (!text) return
    setNewTask('')
    await api.addTask(project.id, text)
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
        <button onClick={onBack} style={S.btnGhost}><ArrowLeft size={13} /> All missions</button>
        {project.status !== 'completed' && !project.archived_at && (
          <button
            onClick={async () => {
              if (!window.confirm(`Mark "${project.name}" complete? The River strikes 10 miles on the next update.`)) return
              const ok = await api.updateProject(project.id, { status: 'completed', archived_at: new Date().toISOString() })
              try { await archiveSharesFor(project.id) } catch (e) { console.warn('shares archive', e.message) }
              // File the mission's artifacts and its latest session board in the Archive.
              try {
                const list = await listProjArtifacts(project.id)
                const artifacts = await Promise.all(list.map(async a => { const d = await readProjArtifact(project.id, a.slug).catch(() => null); return { slug: a.slug, title: d?.title || a.slug, kind: d?.kind, doc: d } }))
                const { data: sbs } = await sbClient.from('session_boards').select('id,title,phases').or(`project.eq.${project.key || project.name},project.eq.${project.name}`).order('updated_at', { ascending: false }).limit(1)
                const boards = (sbs || []).map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, title: b.title, phases: b.phases || [], done: ts.filter(t => t.status === 'done').length, total: ts.length } })
                await fileProject(project, { artifacts, boards, realm: project.category === 'personal' ? 'personal' : 'third-horizon' })
              } catch (e) { console.warn('archive', e.message) }
              if (ok) onBack()
            }}
            title="Whole mission complete: 10 miles on the River"
            style={{ ...S.btnGhost, border: '1px solid rgba(67,211,146,0.5)', color: '#43D392' }}
          >
            ✓ Mark mission complete
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={S.h1}>{project.name}</h1>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_DIM, margin: '8px 0 0', maxWidth: '72ch' }}>
            {project.description ? <span><span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: BLUE, marginRight: 8 }}>Destination</span>{project.description}</span> : <button onClick={async () => { const d = window.prompt('Where is this mission going? One sentence.', ''); if (d?.trim()) await api.updateProject(project.id, { description: d.trim() }) }} style={{ ...S.btnGhost, padding: '3px 9px', fontSize: 10 }}>Set the destination</button>}
          </div>
          <div style={S.sub}>
            {[CATEGORY_LABELS[project.category] || project.category, project.key, '100 miles on completion · 10 per milestone'].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 6, flexWrap: 'wrap' }}>
          <Pill active={tab === 'tasks'} onClick={() => setTab('tasks')}>Milestones · {tasks.length}</Pill>
          <Pill active={tab === 'artifacts'} onClick={() => setTab('artifacts')}>Artifacts</Pill>
          <Pill active={tab === 'files'} onClick={() => setTab('files')}>Files</Pill>
          <Pill active={tab === 'shares'} onClick={() => setTab('shares')}>Shares</Pill>
          <Pill active={false} onClick={() => onNavigate && onNavigate('cabinet')}>Cabinet</Pill>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 0' }}>
        <span style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}><span style={{ display: 'block', width: `${pct}%`, height: '100%', background: GOLD }} /></span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>{closed} of {tasks.length} closed</span>
      </div>

      <div style={{ ...S.panel, marginTop: 20 }}>
        {tab === 'tasks' && (
          <div>
            {!tasks.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>No milestones yet. Add the first one below: a thing that will be verifiably true.</div>}
            {tasks.map((t, i) => <MilestoneRow key={t.id} n={i + 1} project={project} task={t} board={board} api={api} onNavigate={onNavigate} onBoardChange={setBoard} />)}
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 16, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Add a milestone: something that will be verifiably true…" style={{ ...S.input, flex: 1 }} />
              <button type="submit" style={S.btnPrimary}><Plus size={13} /> Milestone</button>
            </form>
          </div>
        )}
        {tab === 'artifacts' && <ArtifactsTab key={artifactSlug || 'first'} project={project} initialSlug={artifactSlug} />}
        {tab === 'shares' && <SharesTab project={project} />}
        {tab === 'files' && (
          <FilesTab project={project}
            listFiles={api.listFiles} uploadFile={api.uploadFile} createFolder={api.createFolder}
            fileUrl={api.fileUrl} deleteFile={api.deleteFile} />
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

  if (loading && !projects.length) {
    return <div style={{ ...S.page, fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: GRAY }}>LOADING…</div>
  }

  const active = projects.filter(p => p.status !== 'archived' && !p.archived_at)
  const archived = projects.filter(p => p.status === 'archived' || p.archived_at)

  const detail = detailId ? projects.find(p => p.id === detailId) : null
  if (detail) {
    const board = boards.find(b => b.project === detail.key) || null
    return <ProjectDetail key={detail.id + (deepLink[1] || '') + (deepLink[2] || '')} project={detail} board={board} api={api} onBack={() => setDetailId(null)} initialTab={deepLink[0] === detail.id ? deepLink[1] : undefined} initialSlug={deepLink[0] === detail.id ? deepLink[2] : undefined} onNavigate={onNavigate} />
  }

  const cats = CATEGORY_ORDER.filter(c => active.some(p => p.category === c))
  const shown = catFilter === 'all' ? active : active.filter(p => p.category === catFilter)
  const sorted = [...shown].sort((a, b) => {
    const ba = (a.tasks || []).some(t => isOpen(t) && isBlocked(t)) ? 0 : 1
    const bb = (b.tasks || []).some(t => isOpen(t) && isBlocked(t)) ? 0 : 1
    if (ba !== bb) return ba - bb
    return new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0)
  })
  const blockedTotal = active.reduce((n, p) => n + (p.tasks || []).filter(t => isOpen(t) && isBlocked(t)).length, 0)

  const create = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const p = await api.createProject({ name, category: newCat })
    setNewName(''); setAdding(false)
    if (p) setDetailId(p.id)
  }

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1 style={S.h1}>Main Missions</h1>
          <div style={S.sub}>
            {active.length} standing · {blockedTotal > 0 ? `${blockedTotal} decisions waiting on you` : 'nothing waiting on you'}
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
            {CATEGORY_ORDER.map(c => <option key={c} value={c} style={{ color: '#0E2336' }}>{CATEGORY_LABELS[c]}</option>)}
          </select>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {sorted.map(p => <ProjectCard key={p.id} project={p} onOpen={setDetailId} />)}
      </div>
      {!sorted.length && <div style={{ fontSize: 13, color: GRAY, padding: '20px 0' }}>Nothing here.</div>}

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
