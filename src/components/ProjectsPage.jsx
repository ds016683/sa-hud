import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, ArrowLeft, Check, Trash2, ArrowUpRight, Folder, FolderPlus, FileText,
  Upload, Download, Archive, ChevronRight, Hand, RefreshCw,
} from 'lucide-react'
import useProjects, { freshnessOf } from '../hooks/useProjects'

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
function ProjectCard({ project, onOpen }) {
  const tasks = project.tasks || []
  const open = tasks.filter(isOpen)
  const blocked = open.filter(isBlocked)
  const done = tasks.length - open.length
  const fresh = freshnessOf(project.last_activity_at)
  const freshColor = fresh === 'fresh' ? GREEN : fresh === 'warning' ? GOLD : GRAY
  const lastTouch = project.last_activity_at
    ? new Date(project.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'never'

  return (
    <button onClick={() => onOpen(project.id)} style={{
      ...S.panel, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', flexDirection: 'column', gap: 10, minHeight: 128, width: '100%',
      transition: 'border-color 120ms',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(169,201,232,0.4)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = PANEL_BORDER}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 16.5, letterSpacing: '-0.01em', color: INK, lineHeight: 1.3 }}>
            {project.name}
          </div>
          {project.key && (
            <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.2px', color: GRAY, marginTop: 4, textTransform: 'uppercase' }}>
              {project.key}
            </div>
          )}
        </div>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: freshColor, flexShrink: 0, marginTop: 5 }} title={`Last activity ${lastTouch}`} />
      </div>

      {project.description ? (
        <div style={{ fontSize: 12.5, lineHeight: 1.5, color: TEXT_DIM, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.description}
        </div>
      ) : <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto', fontFamily: MONO, fontSize: 10, letterSpacing: '0.8px', color: GRAY }}>
        <span style={{ color: open.length ? BLUE : GRAY }}>{open.length} OPEN</span>
        {blocked.length > 0 && (
          <span style={{ color: RED, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Hand size={10} /> {blocked.length} ON DAVID
          </span>
        )}
        <span style={{ marginLeft: 'auto' }}>{done}/{tasks.length || 0} DONE</span>
      </div>
    </button>
  )
}

// =============================================================================
// Detail: task row
// =============================================================================
function TaskRow({ project, task, onToggle, onPromote, onDelete }) {
  const open = isOpen(task)
  const blocked = isBlocked(task)
  const promoted = !!task.objective_id
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
      <button onClick={() => onToggle(project.id, task)} title={open ? 'Mark done' : 'Reopen'} style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
        border: open ? `1.5px solid ${blocked ? RED : 'rgba(234,241,248,0.35)'}` : `1.5px solid ${GREEN}`,
        background: open ? 'transparent' : 'rgba(67,211,146,0.18)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: GREEN, padding: 0,
      }}>
        {!open && <Check size={12} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13.5, lineHeight: 1.45, color: open ? INK : GRAY,
          textDecoration: open ? 'none' : 'line-through',
        }}>{task.text}</div>
        {(blocked || promoted || task.source === 'session') && open && (
          <div style={{ display: 'flex', gap: 8, marginTop: 3, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase' }}>
            {blocked && <span style={{ color: RED }}>Blocked · needs David</span>}
            {task.source === 'session' && <span style={{ color: GRAY }}>from session{task.session_ref ? ` · ${task.session_ref}` : ''}</span>}
            {promoted && <span style={{ color: GOLD }}>In Objectives queue</span>}
          </div>
        )}
      </div>
      {open && !promoted && (
        <button onClick={() => onPromote(project, task)} title="Promote to Objectives (lands in Queue)" style={{
          ...S.btnGhost, padding: '4px 8px', fontSize: 10, color: GOLD, borderColor: 'rgba(230,181,79,0.35)',
        }}><ArrowUpRight size={11} /> Objective</button>
      )}
      <button onClick={() => { if (window.confirm('Delete this task?')) onDelete(project.id, task.id) }} title="Delete task" style={{
        background: 'transparent', border: 'none', color: 'rgba(234,241,248,0.25)', cursor: 'pointer', padding: 4,
      }}><Trash2 size={13} /></button>
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
// Detail: session board (read-only mirror of the live board)
// =============================================================================
function BoardTab({ board }) {
  if (!board) {
    return <div style={{ fontSize: 13, color: GRAY, padding: '12px 0' }}>
      No session board for this project. One appears when a Claude session runs /hud-board under this project's key.
    </div>
  }
  const stColor = { done: GREEN, inmotion: GOLD, blocked: RED, open: GRAY }
  return (
    <div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.2px', color: GRAY, marginBottom: 12, textTransform: 'uppercase' }}>
        {board.title} · updated {new Date(board.updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </div>
      {(board.phases || []).map((ph, i) => (
        <div key={i} style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 14.5, letterSpacing: '-0.01em', color: BLUE, marginBottom: 6 }}>{ph.title}</div>
          {(ph.tasks || []).map(t => (
            <div key={t.id} style={{ display: 'flex', gap: 10, padding: '5px 0', alignItems: 'flex-start' }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: stColor[t.status] || GRAY, flexShrink: 0, paddingTop: 2 }}>{t.id}</span>
              <span style={{
                fontSize: 13, lineHeight: 1.45, flex: 1,
                color: t.status === 'done' ? GRAY : INK,
                textDecoration: t.status === 'done' ? 'line-through' : 'none',
              }}>
                {t.label}
                {t.status === 'blocked' && t.note && <span style={{ color: RED, fontSize: 11.5 }}> · {t.note}</span>}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: '1px', textTransform: 'uppercase', color: stColor[t.status] || GRAY, paddingTop: 3 }}>{t.status}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// =============================================================================
// Detail view
// =============================================================================
function ProjectDetail({ project, board, api, onBack }) {
  const [tab, setTab] = useState('tasks')
  const [newTask, setNewTask] = useState('')
  const [showDone, setShowDone] = useState(false)

  const tasks = [...(project.tasks || [])].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const open = tasks.filter(isOpen)
  const blockedFirst = [...open.filter(isBlocked), ...open.filter(t => !isBlocked(t))]
  const doneTasks = tasks.filter(t => !isOpen(t))

  const submit = async (e) => {
    e.preventDefault()
    const text = newTask.trim()
    if (!text) return
    setNewTask('')
    await api.addTask(project.id, text)
  }

  const promote = async (proj, task) => {
    const obj = await api.promoteTask(proj, task)
    if (!obj) window.alert('Promote failed, check console.')
  }

  return (
    <div style={S.page}>
      <button onClick={onBack} style={{ ...S.btnGhost, marginBottom: 18 }}><ArrowLeft size={13} /> All projects</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <h1 style={S.h1}>{project.name}</h1>
          <div style={S.sub}>
            {[project.key, CATEGORY_LABELS[project.category] || project.category, project.kind === 'provisional' ? 'provisional' : 'standing'].filter(Boolean).join(' · ')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 6 }}>
          <Pill active={tab === 'tasks'} onClick={() => setTab('tasks')}>Tasks</Pill>
          <Pill active={tab === 'board'} onClick={() => setTab('board')}>Session Board</Pill>
          <Pill active={tab === 'files'} onClick={() => setTab('files')}>Files</Pill>
        </div>
      </div>

      {project.description && (
        <p style={{ fontSize: 14, lineHeight: 1.6, color: TEXT_DIM, margin: '10px 0 0', maxWidth: '72ch' }}>{project.description}</p>
      )}

      <div style={{ ...S.panel, marginTop: 20 }}>
        {tab === 'tasks' && (
          <div>
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                placeholder="Add a task to this project…"
                style={{ ...S.input, flex: 1 }}
              />
              <button type="submit" style={S.btnPrimary}><Plus size={13} /> Add</button>
            </form>

            {!blockedFirst.length && <div style={{ fontSize: 13, color: GRAY, padding: '10px 0' }}>No open tasks.</div>}
            {blockedFirst.map(t => (
              <TaskRow key={t.id} project={project} task={t}
                onToggle={api.toggleTask} onPromote={promote} onDelete={api.deleteTask} />
            ))}

            {doneTasks.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button onClick={() => setShowDone(!showDone)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: GRAY, textTransform: 'uppercase',
                }}>
                  {showDone ? 'Hide' : 'Show'} completed · {doneTasks.length}
                </button>
                {showDone && doneTasks.map(t => (
                  <TaskRow key={t.id} project={project} task={t}
                    onToggle={api.toggleTask} onPromote={promote} onDelete={api.deleteTask} />
                ))}
              </div>
            )}
          </div>
        )}
        {tab === 'board' && <BoardTab board={board} />}
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
export default function ProjectsPage() {
  const api = useProjects()
  const { loading, projects, boards } = api
  const [detailId, setDetailId] = useState(null)
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
    return <ProjectDetail project={detail} board={board} api={api} onBack={() => setDetailId(null)} />
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
          <h1 style={S.h1}>Projects</h1>
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
