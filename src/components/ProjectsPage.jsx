import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Plus, ArrowLeft, Check, Trash2, ArrowUpRight, Folder, FolderPlus, FileText,
  Upload, Download, Pencil, Archive, ChevronRight, Hand, RefreshCw, Star, X as XMark,
} from 'lucide-react'
import useProjects, { freshnessOf } from '../hooks/useProjects'
import ArtifactsTab from './river/ArtifactsTab'
import WorkbenchTab, { WorkbenchIntake } from './river/Workbench'
import WorkbenchSheet from './river/WorkbenchSheet'
import ItemDetail from './river/ItemDetail'
import LumenPanel from './river/LumenPanel'
import { LEDGER_EVENT } from '../lib/lumenPanel'
import SessionBoard from './river/SessionBoard'
import { listShares, archiveShare, archiveSharesFor, shareUrl } from '../lib/shares'
import { fileProject, fileEntry } from '../lib/archive'
import { listLiveFiles, markFiled, listEvidence, openLiveFile } from '../lib/livefiles'
import { supabase as sbAuth } from '../lib/supabase'
import { equipTask, stashTask, unload, deleteMission } from '../lib/loadout'
import { splitNotes, joinNotes } from '../lib/gateNotes'
import { GlyphLoadout, GlyphHolster, GlyphStash } from './river/glyphs'
import { NORTH_STAR_LABEL, LABEL, alpha, INK, INK2, NAVY_DEEP, BLUE, GRAY, PANEL_BORDER, PANEL_BG, GOLD, GREEN, SUCCESS, RED, CAUTION, PURPLE, CARD_PILLS, CardPill, Label as CanonLabel, Trail, KIND_COLOR, KindIcon } from './river/canon'
import { importProject } from '../lib/cabinet'
import BadgeMedallion from './BadgeArt'
import ExtractionDebrief from './river/ExtractionDebrief'
import GateDebrief from './river/GateDebrief'
import { GateGlyph } from './river/GatePage'
import { AwardYay } from './river/AwardYay'
import { markPlayed } from '../lib/yay'
import { addObjective } from '../lib/objectives'
import { BADGES } from '../constants/collection'
import { supabase as sbClient2 } from '../lib/supabase'
import { listArtifacts as listProjArtifacts, readArtifact as readProjArtifact } from '../lib/artifacts'
import { supabase as sbClient } from '../lib/supabase'
import { hudPrompt, hudConfirm, hudNotice } from '../lib/dialog'
import { useGateView, onGate } from '../lib/gateView'
import { openCard } from '../lib/card'
import CardBriefing from './river/CardBriefing'
import useGateStories from './river/useGateStories'
import { listPages, readPage } from '../lib/workspace'
import { listBuilds } from '../lib/lumenPanel'
import { readPath, noteSource, savePathSteps } from '../lib/path'
// =============================================================================
// STYLE TOKENS (CIP canon, matches ObjectivesPage dark stage)
// =============================================================================
// Canon tokens (Gate 18 scrub, 10/24): the page's own palette is gone; two local aliases remain.
const BLUE_DEEP = LABEL
const TEXT_DIM = INK2

const SERIF = "'Lora', Georgia, serif"
const MONO = 'var(--font-mono, monospace)'

const S = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '20px 24px 80px', color: INK },
  h1: { fontSize: 28, fontWeight: 500, margin: 0, color: INK, fontFamily: SERIF, letterSpacing: '-0.01em' },
  sub: { fontSize: 10, color: LABEL, margin: '6px 0 0', fontFamily: MONO, letterSpacing: '1.4px', textTransform: 'uppercase' },
  panel: { background: PANEL_BG, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, padding: 16 },
  panelTitle: { fontSize: 10, fontWeight: 600, color: LABEL, textTransform: 'uppercase', letterSpacing: '1.6px', marginBottom: 10, fontFamily: MONO },
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
// the Board, nothing subjective. A gate in the Loadout gives the card a green
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
const EDGE = { loadout: GREEN, stash: INK2, off: INK2 }

const isOpen = (t) => t.status !== 'done' && !t.done
const isBlocked = (t) => t.status === 'blocked'
const footBtn = { display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer', whiteSpace: 'nowrap' }

// =============================================================================
// Baseball card
// =============================================================================
// Gates. A gate typed with a leading number ("3 · Smoke test…")
// keeps that number and sorts by it; the prefix is stripped from the text.
// Gates without a number follow in creation order and are numbered by
// position. When a mission has numbered gates, its unnumbered closed
// tasks are earlier work (history before the plan was reset) and fold away.
const NUM_RE = /^\s*(?:gate\s+)?(\d+)\s*[·.:)-]\s*/i
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
const nowGate = (plan) => plan.find(({ t }) => isOpen(t) && t.objective_id) || plan.find(({ t }) => isOpen(t)) || null

// The ring (David 10/26): x of x closed, drawn once and grown on mount.
function ProgressRing({ closed, total, size = 56, stroke = 5, color = LABEL }) {
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

function ProjectCard({ project, onOpen, edge = INK2, compact = false }) {
  const { plan } = planOf(project)
  const ms = plan.map(p => p.t)
  const closed = ms.filter(t => !isOpen(t)).length
  const nowP = nowGate(plan)
  const now = nowP?.t || null
  const blocked = ms.filter(t => isOpen(t) && isBlocked(t)).length
  const fresh = freshnessOf(project.last_activity_at)
  const freshColor = fresh === 'fresh' ? GREEN : fresh === 'warning' ? CAUTION : GRAY
  const lastTouch = project.last_activity_at ? new Date(project.last_activity_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'never'
  return (
    <button onClick={() => onOpen(project.id)} style={{ ...S.panel, textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', gap: compact ? 10 : 12, minHeight: compact ? 190 : 240, width: '100%', transition: 'border-color 120ms', borderLeft: `3px solid ${edge}`, background: compact ? 'transparent' : PANEL_BG, padding: compact ? '16px 18px' : '20px 20px 18px' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = alpha(BLUE, 40); e.currentTarget.style.borderLeftColor = edge }} onMouseLeave={e => { e.currentTarget.style.borderColor = PANEL_BORDER; e.currentTarget.style.borderLeftColor = edge }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontWeight: 500, fontSize: compact ? 16 : 18, letterSpacing: '-0.01em', color: INK, lineHeight: 1.25 }}>{project.name}</div>
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: LABEL, border: `1px solid ${alpha(LABEL, 33)}`, borderRadius: 999, padding: '2px 7px', whiteSpace: 'nowrap', flexShrink: 0 }}>{CATEGORY_LABELS[project.category] || project.category}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', padding: compact ? '2px 0' : '6px 0' }}>
        <ProgressRing closed={closed} total={ms.length} size={compact ? 64 : 88} stroke={compact ? 5 : 6} />
      </div>
      {now
        ? <div style={{ fontSize: 13.5, color: INK, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginTop: 'auto' }}><span style={{ color: now.objective_id ? GREEN : GOLD, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', marginRight: 6 }}>{now.objective_id ? 'on the board' : 'now'}</span>{stripNum(now.text)}</div>
        : <div style={{ fontSize: 12.5, color: GRAY, marginTop: 'auto' }}>{ms.length ? 'Every gate closed.' : 'No gates yet.'}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.8px', color: LABEL, textTransform: 'uppercase' }}>
        {blocked > 0 && <span style={{ color: CAUTION, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Hand size={10} /> {blocked} on David</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: freshColor }} />touched {lastTouch}</span>
      </div>
    </button>
  )
}

// =============================================================================
// Detail: what sits under an open gate on the mission's line (David 11/17: the Main Mission page is
// the same card as every other, so a gate is a stop on the line, not a row of its own). Its place, its
// card, the Board and the Stash, its done-when and its name. The gate closes from its circle.
// =============================================================================
function GateTools({ n, project, task, api, objState, takeOff, say }) {
  const ost = task.objective_id ? objState?.[task.objective_id] : null
  // Where the gate is, on the same three round marks as its card (David 11/18). A move shows at once; the
  // Ledger's read catches up behind it.
  const [moved, setMoved] = useState(null)
  const onBoard = moved ? moved === 'loadout' : (!!task.objective_id && (ost ? ost.state === 'active' : true))
  const stashed = moved ? moved === 'stash' : (!!ost && ost.state === 'parked' && (ost.tags || []).includes('stashed'))
  const place = onBoard ? 'loadout' : stashed ? 'stash' : 'holster'
  const { doneWhen: when, details } = splitNotes(task.notes)
  const [busy, setBusy] = useState(false)
  const load = async () => { setBusy(true); try { const r = await equipTask(task, project.name, { clock: false }); say(r.ok ? `Gate ${n} is on the Board.` : `Will not fit: ${r.reasons.join(' · ')}`); if (r.ok) { setMoved('loadout'); api.refresh() } } catch (e) { say(`Could not load: ${e.message}`) } finally { setBusy(false) } }
  const toStash = async () => { setBusy(true); try { await stashTask(task, project.name); setMoved('stash'); say(`Gate ${n} is in the Stash.`); api.refresh() } catch (e) { say(`Could not stash: ${e.message}`) } finally { setBusy(false) } }
  const rename = async () => { const t = await hudPrompt('Gate', stripNum(task.text)); if (!t?.trim()) return; await api.updateTask(project.id, task.id, { text: `${n} · ${t.trim()}` }) }
  const toHolster = async () => { if (!task.objective_id) return; setBusy(true); try { await unload(task.objective_id); setMoved('holster'); say(`Gate ${n} is back on the Mission Board.`); api.refresh() } catch (e) { say(`Could not holster: ${e.message}`) } finally { setBusy(false) } }
  const moveTo = (to) => { if (busy || to === place) return; return to === 'loadout' ? load() : to === 'stash' ? toStash() : toHolster() }
  const doneWhen = async () => { const t = await hudPrompt({ title: 'Polaris · Done When', value: when || '', multiline: true }); if (t === null) return; await api.updateTask(project.id, task.id, { notes: joinNotes(t, details) }) }
  return (
    <>
      <div className="src gate-row">
        <span className="brf-where sm" role="group" aria-label={`Where gate ${n} is`}>
          {[['loadout', 'Loadout · On the Board, clock off', <GlyphLoadout key="g" size={14} />], ['holster', 'Holster · On the Mission Board', <GlyphHolster key="g" size={14} />], ['stash', 'Stash · Held on the Board, no slot, no clock', <GlyphStash key="g" size={14} />]].map(([id, tip, glyph]) => (
            <button key={id} className={place === id ? 'on' : ''} aria-pressed={place === id} aria-label={tip} title={tip} disabled={busy} onClick={() => moveTo(id)}>{glyph}</button>
          ))}
        </span>
        {isBlocked(task) ? <span>Blocked, Needs David</span> : null}
        {/* Icons, not words (David 11/21: "edit icon for the name. red x for delete. Polaris, pulsing red if it needs a Polaris objective"). */}
        <span className="gt-set">
          <button className={`gt-ic${when ? '' : ' need'}`} title={when ? 'Polaris · Done When' : 'Needs A Polaris Objective'} aria-label={when ? `Gate ${n}'s Polaris objective` : `Gate ${n} needs a Polaris objective`} onClick={doneWhen}><Star size={13} /></button>
          <button className="gt-ic" title="Rename" aria-label={`Rename gate ${n}`} onClick={rename}><Pencil size={13} /></button>
          <button className="gt-ic del" title="Take It Off" aria-label={`Take gate ${n} off`} onClick={takeOff}><XMark size={14} /></button>
        </span>
      </div>
      {details && <div className="done-when" title={details}>{details}</div>}
      {when && <div className="done-when" title={when}>Done when: {when}</div>}
    </>
  )
}

// =============================================================================
// Detail: files browser (Supabase Storage, folder-per-project)
// =============================================================================

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
  const KIND = { folder: ['Folder', GRAY], file: ['File', LABEL], filed: ['Filed', INK2], artifact: ['Artifact', LABEL], share: ['Share', LABEL] }
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
          {r.kind === 'share' && <button onClick={async () => { try { await navigator.clipboard.writeText(r.share.code); setMsg('Code copied') } catch { setMsg(`Code: ${r.share.code}`) } }} style={{ ...S.btnGhost, fontSize: 10, padding: '3px 8px', fontFamily: MONO, letterSpacing: '2px', color: r.share.active ? LABEL : GRAY }}>{r.share.code}</button>}
          {r.kind === 'share' && <button onClick={async () => { await archiveShare(r.share, r.share.active); load() }} style={{ ...S.btnGhost, fontSize: 10, padding: '3px 8px' }}>{r.share.active ? 'Archive' : 'Reactivate'}</button>}
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

function ProjectDetail({ project, board: boardProp, api, onBack, initialTab, initialSlug }) {
  // Gates first, always (David 10/21). A tab in the hash only sticks when it
  // carries an artifact slug (a deep link from Lumen or a session); otherwise the
  // page opens on Gates, whatever tab the URL remembered.
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
  // Lumen acted on this mission from the panel (11/4): refresh the project and remount the Workbench's lists.
  const [tick, setTick] = useState(0)
  useEffect(() => { const h = (e) => { const id = e?.detail?.id; if (!id || id === project.id) { api?.refresh?.(); setTick(t => t + 1) } }; window.addEventListener(LEDGER_EVENT, h); return () => window.removeEventListener(LEDGER_EVENT, h) }, [api, project.id])

  // mission hash (David, 10/17): the open mission and its tab ride the URL so a refresh lands back here.
  useEffect(() => { try { const suffix = ((window.location.hash || '').match(/\/item\/.*$/) || [''])[0]; window.history.replaceState(window.history.state, '', `#/main-missions/${project.id}/${tab}${suffix}`) } catch { /* no-op */ } }, [project.id, tab])
  const { plan } = planOf(project)
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
  // The Briefing is the same card every mission and every gate has (David 11/17): CardBriefing, handed
  // this mission's gates as its stops. The doors below turn its step calls into this mission's gates.
  const [organizing, setOrganizing] = useState(false)
  const [noteCount, setNoteCount] = useState(null)
  useEffect(() => { let on = true; sbClient2.from('project_notes').select('id', { count: 'exact', head: true }).eq('project_id', project.id).then(({ count }) => { if (on) setNoteCount(count ?? null) }); return () => { on = false } }, [project.id, tab])
  const live = useRef({ api, project, plan })
  useEffect(() => { live.current = { api, project, plan } })
  const gateSteps = useMemo(() => planOf(project).plan.map(({ t, n }) => ({ id: t.id, n, text: stripNum(t.text), done: !isOpen(t), done_at: t.released_at, objective_id: t.objective_id || null, due_date: t.due_date || null, doneWhen: splitNotes(t.notes).doneWhen, details: splitNotes(t.notes).details })), [project])
  const cardGates = useMemo(() => planOf(project).plan.filter(({ t }) => t.objective_id).map(({ t, n }) => ({ n, text: stripNum(t.text), objective_id: t.objective_id })), [project])
  const stories = useGateStories(cardGates)
  const extraTrail = useMemo(() => [...stories, ...planOf(project).history.filter(t => t.released_at).map(t => ({ at: t.released_at, kind: 'Gate Closed', text: t.text, gate: true }))], [stories, project])
  const missionObj = useMemo(() => ({ id: project.id, title: project.name, captured_at: project.created_at, north_star: project.description || null }), [project.id, project.name, project.created_at, project.description])
  const gateView = useGateView()
  const missionApi = useMemo(() => ({
    addStep: async (_id, text) => { const { api: a, plan: pl } = live.current; return a.addTask(project.id, NUM_RE.test(text) ? text : `${Math.max(0, ...pl.map(x => x.n)) + 1} · ${text}`) },
    toggleStep: async (id) => { const { api: a, project: pr } = live.current; const t = (pr.tasks || []).find(x => x.id === id); if (!t) throw new Error('that gate is gone'); return a.toggleTask(project.id, t) },
    removeStep: async (id) => live.current.api.deleteTask(project.id, id),
    renameStep: async (id, text) => { const { api: a, plan: pl } = live.current; const p = pl.find(x => x.t.id === id); return a.updateTask(project.id, id, { text: p ? `${p.n} · ${text}` : text }) },
    setStepOrder: async () => {},   // a mission's gates stand in number order
    listPages, readPage, listBuilds, readPath, noteSource, savePathSteps,
    // the mission's own files; a gate card's files come in with that gate's story
    listLiveFiles: async () => { const cards = new Set((live.current.project.tasks || []).map(t => t.objective_id).filter(Boolean)); const r = await listLiveFiles({ projectId: project.id }); return { rows: (r.rows || []).filter(f => !cards.has(f.objective_id)) } },
  }), [project.id])
  // A gate's Extract runs through its debrief (David 11/23: Gate 1's Extract on the trail skipped it and went straight
  // to the old badge box). debrief is the gate in the pop-up; gateYay is what it did, for the yay that follows.
  const [debrief, setDebrief] = useState(null)
  const [gateYay, setGateYay] = useState(null)
  const finishGate = async (st, record) => {
    const { api: a, project: pr } = live.current
    const t = (pr.tasks || []).find(x => x.id === st.id); if (!t) throw new Error('that gate is gone')
    if (!(t.status === 'done' || t.done)) await a.toggleTask(project.id, t)
    if (record) await fileEntry({ realm: project.category === 'personal' ? 'personal' : 'third-horizon', source_kind: 'project', source_id: project.id, source_title: project.name, tags: ['gate'], kind: 'summary', title: `Gate ${st.n} · ${st.text}`, summary: record, body: { achieved: record, gate_task_id: st.id } }).catch(e => console.warn('gate record', e.message))
    await a.refresh?.()
    return { minutes: 0 }
  }
  const toNextGate = async (load) => {
    const info = gateYay, next = info?.next
    if (info?.gate?.id) markPlayed(info.gate.id)
    setGateYay(null)
    try {
      if (next && load) { const r = await equipTask({ id: next.task_id, text: `${next.n} · ${next.text}`, objective_id: next.objective_id }, project.name); if (r && r.ok === false) await hudNotice((r.reasons || []).join(' ') || 'It did not load.') }
      if (next && next.objective_id) openCard(next.objective_id)
    } catch (e) { console.warn('next gate', e.message) }
  }

  // The debrief hands back David's words, the closing notes, what to file and what to drop, and what he checked to be
  // made (David 11/21). Only what he checked is made: a loose end or a note to send becomes a Bounty, a mission that
  // came out of this one becomes a Side Mission of its kind or a Main Mission.
  const closeMission = async ({ achieved, notes = '', closeOpen, fileThem, files, drop = [], make = null }) => {
    const from = `From the debrief of ${project.name}.`
    const tags = project.category === 'personal' ? ['personal'] : ['third-horizon']
    const made = []
    if (make) {
      for (const x of make.todo || []) { try { await addObjective({ title: x.text, size: 'light', tags, description: `${from} ${x.why || ''}`.trim() }); made.push(x.text) } catch (e) { console.warn('debrief todo', e.message) } }
      for (const x of make.hear || []) { try { const t = `Send A Note To ${x.who}`; await addObjective({ title: t, size: 'light', tags, description: `${from} ${x.why || ''}`.trim() }); made.push(t) } catch (e) { console.warn('debrief note', e.message) } }
      for (const x of make.missions || []) {
        try {
          if (x.kind === 'Main Mission') await api.createProject({ name: x.title, category: project.category || 'client' })
          else await addObjective({ title: x.title, size: x.kind === 'Mythic' ? 'heavy' : x.kind === 'Contract' ? 'medium' : 'light', tags, description: `${from} ${x.why || ''}`.trim() })
          made.push(x.title)
        } catch (e) { console.warn('debrief mission', e.message) }
      }
    }
    for (const f of drop) { try { await markFiled(f.id, `dropped:mission:${project.id}`) } catch (e) { console.warn('drop', e.message) } }
    if (closeOpen) for (const t of (tasks || []).filter(x => x.status !== 'done')) await api.updateTask(project.id, t.id, { status: 'done', done: true, released_at: new Date().toISOString() })
    const ok = await api.updateProject(project.id, { status: 'completed', archived_at: new Date().toISOString() })
    if (!ok) throw new Error('The mission did not close: the Ledger refused the change. Nothing was filed. Try again, or tell a session.')
    try { await archiveSharesFor(project.id) } catch (e) { console.warn('shares archive', e.message) }
    try { await importProject(project.id, `${project.category === 'personal' ? 'Personal' : 'Third Horizon'}/Missions/${project.name.replace(/[/\\]/g, ' ')}`) } catch (e) { console.warn('cabinet import', e.message) }
    try {
      const list = await listProjArtifacts(project.id)
      const artifacts = await Promise.all(list.map(async a => { const d = await readProjArtifact(project.id, a.slug).catch(() => null); return { slug: a.slug, title: d?.title || a.slug, kind: d?.kind, doc: d } }))
      const { data: sbs } = await sbClient.from('session_boards').select('id,title,phases').or(`project.eq.${project.key || project.name},project.eq.${project.name}`).order('updated_at', { ascending: false }).limit(1)
      const boards = (sbs || []).map(b => { const ts = (b.phases || []).flatMap(ph => ph.tasks || []); return { id: b.id, title: b.title, phases: b.phases || [], done: ts.filter(t => t.status === 'done').length, total: ts.length } })
      await fileProject(project, { artifacts, boards, realm: project.category === 'personal' ? 'personal' : 'third-horizon', achieved: notes ? `${achieved}\n\nClosing notes: ${notes}` : achieved })
    } catch (e) { console.warn('archive', e.message) }
    if (fileThem) for (const f of files) { try { await markFiled(f.id, `mission:${project.id}`) } catch (e) { console.warn('file', e.message) } }
    setClosingMission(false)
    // The celebratory moment (David 10/21): the badge, the award, and what is true now.
    if (ok) setCelebrate({ achieved, made, closed: closeOpen ? (tasks || []).filter(x => x.status !== 'done').length : 0, total: (tasks || []).length })
    else onBack()
  }
  // Natural language in, an organized gate out (David 10/21): the door
  // api/gate-draft returns a title, a done-when and steps for him to confirm.
  const organize = async () => {
    const text = newTask.trim(); if (!text) return
    setDrafting(true); setDraftErr(null)
    try {
      const { data: { session } } = await sbAuth.auth.getSession()
      const r = await fetch('/api/gate-draft', { method: 'POST', headers: { Authorization: `Bearer ${session?.access_token || ''}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text, project: project.name, polaris: project.description || '', existing: (tasks || []).map(t => stripNum(t.text)) }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || j.error) throw new Error(j.error || `draft ${r.status}`)
      const n = j.number || (text.match(/^\s*(?:gate\s+)?(\d+)\s*[·.:)-]/i) || [])[1] || null
      setDraft({ ...j, number: n ? Number(n) : null })
    } catch (e) { setDraftErr(e?.message || String(e)) } finally { setDrafting(false) }
  }
  const addDraft = async () => {
    if (!draft?.title?.trim()) return
    const n = draft.number
    const t = await api.addTask(project.id, `${n ? `${n} · ` : ''}${draft.title.trim()}`)
    if (!t) { setDraftErr('Could not add the gate'); return }
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
      {closingMission && <ExtractionDebrief project={project} tasks={tasks} onClose={() => setClosingMission(false)} onDone={closeMission} />}
      {/* Card header canon (David 10/29): the kind heads the name and is bigger than it; the
          type chip with its icon sits beside the header; the name runs full width beneath. */}
      <div style={{ marginBottom: 18 }}>
        <Trail nodes={[{ label: 'Main Missions', onClick: onBack }]} />
      </div>

      {/* The header reads as every card's does (David 11/17): the name is the title, what it is sits to
          the right as chips. Polaris ends the line below; the count is in the side of the Briefing. */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <h1 style={{ ...S.h1, lineHeight: 1.2, flex: 1, minWidth: 260 }}>{project.name}<button title="Rename" aria-label="Rename" onClick={async () => { const t = String(await hudPrompt({ title: 'Title', value: project.name }) || '').replace(/\s+/g, ' ').trim(); if (t && t !== project.name) api.updateProject(project.id, { name: t }) }} style={{ background: 'transparent', border: 'none', padding: '0 0 0 12px', cursor: 'pointer', color: 'var(--hud-ink-3)', verticalAlign: 'middle' }}><Pencil size={17} /></button></h1>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
          <span className="brf-chip" style={{ cursor: 'default', gap: 6 }}><KindIcon kind="Main Mission" size={13} color={KIND_COLOR['Main Mission']} />Main Mission</span>
          {(CATEGORY_LABELS[project.category] || project.category) && <span className="brf-chip" style={{ cursor: 'default' }}>{CATEGORY_LABELS[project.category] || project.category}</span>}
          <button className="brf-chip" onClick={() => api.updateProject(project.id, { tags: isHorizon(project) ? (project.tags || []).filter(t => t !== 'horizon') : [...(project.tags || []), 'horizon'] })} title={isHorizon(project) ? 'On the horizon: no clock. Click to bring it into the standing missions.' : 'Click to put it on the horizon: no clock, a chip on the page.'}>{isHorizon(project) ? 'On The Horizon' : 'Standing'}</button>
        </span>
      </div>
      {/* One way in (David 11/17): no pills. The card opens on the Briefing; its right side leads to the
          Workbench, Files and Notes, Polaris opens from the trail, and each has this way back. */}
      {tab !== 'briefing' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 18 }}>
          <button className="brf-chip" onClick={() => setTab('briefing')}>‹ Back To The Briefing</button>
          <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 20, color: INK }}>{(CARD_PILLS.find(([id]) => id === tab) || [])[1]}</span>
        </div>
      )}

      <div style={tab === 'briefing' ? { marginTop: 24 } : { ...S.panel, marginTop: 20 }}>
        {tab === 'briefing' && (
          <CardBriefing obj={missionObj} root={project.id} kindLabel="Main Mission" steps={gateSteps} extraTrail={extraTrail} api={missionApi}
            onEditPolaris={async () => { const cur = project.description || ''; const got = await hudPrompt({ title: 'Polaris', value: cur, multiline: true }); if (got == null) return; const t = String(got).trim(); if (t !== cur.trim()) await api.updateProject(project.id, { description: t || null }) }}
            hereText={`${closed} of ${tasks.length} gates closed.${nowGate(plan) ? ` Next: ${stripNum(nowGate(plan).t.text)}` : ''}`}
            nextStepId={nowGate(plan) ? nowGate(plan).t.id : null}
            stopExtra={(st, h) => { const p = plan.find(x => x.t.id === st.id); return p ? <GateTools n={p.n} project={project} task={p.t} api={api} objState={objState} takeOff={h.takeOff} say={(m) => hudNotice(m)} /> : null }}
            onExtract={(st) => setDebrief(st)}
            onReload={async () => { await api.refresh?.() }} onTab={setTab} onOpenCard={openCard} say={(m) => hudNotice(m)} notesCount={noteCount} />
        )}
        {tab === 'briefing' && (
          <div style={{ marginTop: 24 }}>
            {/* Lumen can still write a gate up from plain words (David 10/21); it sits behind one button now. */}
            <button className="brf-chip" onClick={() => setOrganizing(o => !o)}>{organizing ? 'Hide The Organizer' : 'Organize A Gate With Lumen'}</button>
            {organizing && <>
            <form onSubmit={submit} style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <input value={newTask} onChange={e => setNewTask(e.target.value)} placeholder="Say the gate in your own words; Organize writes it up, or add it as typed (lead with its number to place it)" style={{ ...S.input, flex: 1 }} />
              <button type="button" onClick={organize} disabled={drafting || !newTask.trim()} title="Lumen organizes what you typed into a gate: Title Case, a done-when, three to five steps. You confirm before it lands." style={{ ...S.btnGhost, opacity: drafting || !newTask.trim() ? 0.5 : 1 }}>{drafting ? 'Organizing' : '✦ Organize'}</button>
              <button type="submit" style={S.btnPrimary}><Plus size={13} /> Gate</button>
            </form>
            {draftErr && <div style={{ fontSize: 12.5, color: RED, marginTop: 8 }}>{draftErr}</div>}
            {draft && (
              <div style={{ marginTop: 12, padding: '14px 16px', borderRadius: 10, border: `1px solid ${alpha(LABEL, 40)}`, background: alpha(LABEL, 6) }}>
                <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: LABEL, marginBottom: 8 }}>Draft gate · edit, then add</div>
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
                  <button type="button" onClick={addDraft} style={S.btnPrimary}><Plus size={13} /> Add This Gate</button>
                </div>
                {!board?.id && (draft.steps || []).length > 0 && <div style={{ fontSize: 11.5, color: GRAY, marginTop: 8 }}>Steps need a session board on this mission; the title and done-when land now, the steps once a session opens its board.</div>}
              </div>
            )}
            </>}
          </div>
        )}
        {tab === 'workbench' && (
          /* The sheet (David 11/7): tabs across the top, one blank page each, a live protocol first with a tab of its own; the files in play read under Files. */
          <div style={{ minWidth: 0 }}><WorkbenchSheet key={tick} root={project.id} project={project} scopes={planOf(project).plan.filter(({ t }) => t.objective_id).map(({ t, n }) => ({ objectiveId: t.objective_id, label: `Gate ${n}` }))} /></div>
        )}
        {tab === 'files' && (
          <div style={{ display: 'grid', gap: 30 }}>
            <div><CanonLabel>Bring In</CanonLabel><WorkbenchIntake project={project} /></div>
            <div style={{ minWidth: 0 }}><CanonLabel>In Play</CanonLabel><WorkbenchTab key={tick} project={project} intake={false} /></div>
            <div><CanonLabel>Filed</CanonLabel><MissionFiles project={project} api={api} initialSlug={artifactSlug} /></div>
          </div>
        )}
        {tab === 'notes' && <ProjectNotes project={project} />}
        {tab === 'polaris' && (
          <div style={{ display: 'grid', gap: 22 }}>
            <div>
              <CanonLabel>{NORTH_STAR_LABEL}</CanonLabel>
              <textarea defaultValue={project.description || ''} rows={3} onBlur={e => { const v = e.target.value.trim() || null; if (v !== (project.description || null)) api.updateProject(project.id, { description: v }) }} placeholder="What will be true when this mission is done? One sentence." style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.05)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '10px 12px', color: INK, fontSize: 17, fontFamily: SERIF, fontStyle: 'italic', lineHeight: 1.45, resize: 'vertical' }} />
            </div>
            <div>
              <CanonLabel>Evidence{evidence.length ? ` · ${evidence.length}` : ''}</CanonLabel>
              {!evidence.length && <div style={{ fontSize: 13, color: GRAY }}>Nothing pinned yet. When the thing that proves the objective exists, pin it with the star under Files and it shows here.</div>}
              {evidence.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: `1px solid ${PANEL_BORDER}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: GOLD, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13.5, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}{f.version > 1 ? <span style={{ fontFamily: MONO, fontSize: 9, color: GOLD, marginLeft: 8 }}>v{f.version}</span> : null}</span>
                  <button onClick={async () => { try { window.open(f.bucket === 'link' ? f.path : await openLiveFile(f), '_blank', 'noopener') } catch { /* no-op */ } }} style={{ ...S.btnGhost, padding: '4px 9px', fontSize: 10 }}>Open</button>
                </div>
              ))}
            </div>
            {project.status === 'completed' && <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.2px', textTransform: 'uppercase', color: SUCCESS }}>Complete{project.archived_at ? ` · ${String(project.archived_at).slice(0, 10)}` : ''}</div>}
          </div>
        )}
        {/* The foot of the card, where a Side Mission keeps Equip and Stash: the mission's two moves and what it pays. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', borderTop: `1px solid ${PANEL_BORDER}`, marginTop: 26, paddingTop: 16 }}>
          {project.status !== 'completed' && !project.archived_at && (
            <button onClick={() => setClosingMission(true)} title="Whole mission complete: 100 miles on the River" style={{ ...footBtn, border: `1px solid ${alpha(SUCCESS, 50)}`, color: SUCCESS }}><Check size={14} /> Mark Mission Complete</button>
          )}
          {project.status !== 'completed' && (
            <button
              onClick={async () => {
                const yes = await hudConfirm({ eyebrow: 'Delete Mission', title: project.name, message: 'Delete this mission? No miles are awarded. Gates already closed keep theirs. Its artifacts and cabinet stay in the Ledger. It leaves every list.', confirm: 'Delete Mission', danger: true })
                if (!yes) return
                try { await deleteMission(project); await api.refresh(); onBack() } catch (e) { await hudNotice(`Could not delete: ${e.message}`) }
              }}
              title="Delete this mission: no miles, gone from every list" style={footBtn}
            ><Trash2 size={13} /> Delete Mission</button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: INK2 }}>{[project.key, '100 miles on completion', '7 per gate'].filter(Boolean).join(' · ')}</span>
        </div>
      {celebrate && (
        <AwardYay title="Mission Complete" sub={project.name} banked={null}
          awards={[{ badge: 'main-mission', n: 1, miles: BADGES['main-mission'].miles }, ...(celebrate.closed ? [{ badge: 'gate', n: celebrate.closed, miles: celebrate.closed * BADGES['gate'].miles }] : [])]}
          done={(celebrate.made || []).slice(0, 6).map(t => ({ tag: 'New', color: '#B4A3E8', text: t }))}
          onContinue={() => { markPlayed(project.id); setCelebrate(null); onBack() }}>
          {celebrate.achieved && <><h3>Achieved</h3><p>{celebrate.achieved}</p></>}
        </AwardYay>
      )}
      {debrief && (
        <GateDebrief item={{ id: debrief.objective_id || null, task_id: debrief.id, project_id: project.id, title: `Gate ${debrief.n} · ${debrief.text}` }}
          onClose={() => setDebrief(null)} finish={(record) => finishGate(debrief, record)}
          onDone={(r, info) => { setDebrief(null); setGateYay(info || {}) }} />
      )}
      {gateYay && (
        <AwardYay title="Gate Extracted" sub={gateYay.gate ? `Gate ${gateYay.gate.n} · ${gateYay.gate.text}` : project.name} awards={[{ badge: 'gate', n: 1, miles: BADGES['gate'].miles }]} banked={null}
          done={(gateYay.did || []).slice(0, 6).map(x => ({ tag: x.tag, color: '#B4A3E8', text: x.text }))}
          go={gateYay.next ? `Gate ${gateYay.next.n} · ${gateYay.next.text}` : 'Back To The Mission'} onContinue={() => toNextGate(false)}
          extra={gateYay.next ? <button type="button" className="yay-side" title={`Load Gate ${gateYay.next.n} And Start The Clock`} aria-label={`Load gate ${gateYay.next.n} and start the clock`} onClick={() => toNextGate(true)}><GlyphLoadout size={20} /></button> : null}
          lead={gateYay.next ? <GateGlyph size={17} /> : null} />
      )}
      </div>
      <LumenPanel item={onGate({ kind: 'project', id: project.id, title: project.name, root: project.id, summary: project.description || '' }, gateView)} />
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
  // Board state of every promoted gate, for the card edges and the bands.
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
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2, cursor: 'pointer' }} onClick={() => onNavigate?.('main-missions', ['steps'])}>Proposed Steps</button>
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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: GREEN }}>Now</span><span style={{ flex: 1, height: 1, background: PANEL_BORDER }} /><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>a gate in the Loadout (green) or the Stash (gold)</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {nowBand.map(({ p, b }) => <ProjectCard key={p.id} project={p} onOpen={setDetailId} edge={EDGE[b]} />)}
          </div>
        </div>
      )}
      {steady.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 10 }}><span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }}>Steady</span><span style={{ flex: 1, height: 1, background: PANEL_BORDER }} /><span style={{ fontFamily: MONO, fontSize: 10, color: GRAY }}>standing, nothing on the Board</span></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {steady.map(({ p }) => <ProjectCard key={p.id} project={p} onOpen={setDetailId} compact edge={INK2} />)}
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
