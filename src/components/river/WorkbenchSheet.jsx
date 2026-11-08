// The Workbench sheet (David 11/7): "i want a blank canvas where i can put
// whatever i want. tabs at the top, with the labels for whatever i'm doing
// there." One surface on every card, Main Mission, Side Mission or Milestone,
// with an Excel vibe: a strip of tabs across the top, each tab one Workspace
// page (type on it, draw over it; src/lib/workspace.js, the session's hand is
// ~/.claude/hud-board/workspace.py), the head of a tab saying when it was
// created and last updated, nothing embedded. A protocol live on the item
// (Editing, Briefing) is listed first and always gets a tab of its own, and a
// Live Protocols line between the pills and the tabs says On or Off. Marks,
// boards, sessions and the files in play left this surface the same day; the
// files in play read under Files.
import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { listPages, readPage, writePage, blankPage, slugify } from '../../lib/workspace'
import { PROTOCOLS, protocolOf, isOpenRow } from '../../lib/protocols'
import { LEDGER_EVENT } from '../../lib/lumenPanel'
import { Page } from './Workspace'
import ProtocolsTab from './Protocols'
import PlanningCanvas from './PlanningCanvas'
import { readArtifact } from '../../lib/artifacts'
import { INK, INK2, GRAY, GREEN, PANEL_BORDER, PANEL_BG, MONO, Label } from './canon'
import { hudPrompt } from '../../lib/dialog'

const fmt = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''
const mono = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }
const remember = (root) => `hud:sheet:${root}`
// The MMA Planning canvas is a tab too, only on the MMA missions or one that already carries a program plan (it used to render everywhere).
const isMMA = (project) => /^Client\.MMA/i.test(String(project?.key || ''))

// The protocols live on the item (or on a mission's milestones): one tab each.
async function loadProtocols(scopes) {
  const ids = scopes.map(s => s.objectiveId).filter(Boolean)
  if (!ids.length) return []
  const { data, error } = await supabase.from('edit_punchlist').select('id,objective_id,protocol,status,created_at,updated_at').in('objective_id', ids).order('seq')
  if (error) return []
  const out = []
  for (const r of data || []) {
    const key = `${r.objective_id}:${protocolOf(r)}`
    let g = out.find(x => x.key === key)
    if (!g) { const sc = scopes.find(s => s.objectiveId === r.objective_id); g = { key, objectiveId: r.objective_id, protocol: protocolOf(r), scope: sc?.label || null, open: 0, created_at: r.created_at, updated_at: r.updated_at }; out.push(g) }
    if (isOpenRow(r)) g.open++
    if (r.created_at < g.created_at) g.created_at = r.created_at
    if (r.updated_at > g.updated_at) g.updated_at = r.updated_at
  }
  // Live first, then the finished ones; a protocol with no open row is history and keeps its tab.
  return out.sort((a, b) => (b.open > 0) - (a.open > 0) || String(b.updated_at).localeCompare(String(a.updated_at)))
}

function Tab({ active, live = false, onClick, onDoubleClick, children, title }) {
  return (
    <button onClick={onClick} onDoubleClick={onDoubleClick} title={title} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', marginBottom: -1, fontSize: 12.5, fontWeight: active ? 600 : 500, letterSpacing: '0.1px', color: active ? INK : INK2, background: active ? PANEL_BG : 'transparent', border: `1px solid ${active ? PANEL_BORDER : 'transparent'}`, borderBottomColor: active ? PANEL_BG : 'transparent', borderRadius: '9px 9px 0 0', cursor: 'pointer', whiteSpace: 'nowrap', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis' }}>
      {live && <span style={{ width: 6, height: 6, borderRadius: 99, background: GREEN, flexShrink: 0 }} />}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>
    </button>
  )
}

export default function WorkbenchSheet({ root, scopes = [], project = null }) {
  const [pages, setPages] = useState(null)
  const [planning, setPlanning] = useState(() => isMMA(project) ? project : null)
  const [protocols, setProtocols] = useState([])
  const [sel, setSel] = useState(() => { try { return localStorage.getItem(remember(root)) } catch { return null } })
  const [open, setOpen] = useState(null) // { slug, doc }
  const [msg, setMsg] = useState(null)
  const [tick, setTick] = useState(0)
  const scopeKey = scopes.map(s => s.objectiveId).join(',')
  const byCreated = (a, b) => String(a.created_at || a.updated_at || '').localeCompare(String(b.created_at || b.updated_at || ''))

  useEffect(() => { let on = true; if (!project || isMMA(project)) return; readArtifact(project.id, 'program-plan').then(d => { if (on && d) setPlanning(project) }).catch(() => {}); return () => { on = false } }, [project])
  // The tabs: the pages under this root and the protocols on its scopes; reread on a Ledger event (Lumen or a session wrote here).
  useEffect(() => {
    let on = true
    Promise.all([
      listPages(root).then(r => [...r].sort(byCreated)).catch(e => { if (on) setMsg(`Could not read: ${e.message}`); return [] }),
      loadProtocols(scopes),
    ]).then(([pg, pr]) => { if (on) { setPages(pg); setProtocols(pr) } })
    return () => { on = false }
  }, [root, scopeKey, tick]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const on = () => setTick(t => t + 1); window.addEventListener(LEDGER_EVENT, on); return () => window.removeEventListener(LEDGER_EVENT, on) }, [])

  const tabs = [
    ...protocols.map(g => ({ id: `protocol:${g.key}`, kind: 'protocol', label: `${(PROTOCOLS[g.protocol] || { label: `${g.protocol} protocol` }).label}${g.scope ? ` · ${g.scope}` : ''}`, live: g.open > 0, g })),
    ...(pages || []).map(p => ({ id: `page:${p.slug}`, kind: 'page', label: p.title, page: p })),
    ...(planning ? [{ id: 'planning', kind: 'planning', label: 'Planning' }] : []),
  ]
  const current = tabs.find(t => t.id === sel) || tabs[0] || null
  const currentId = current?.id || null
  const currentSlug = current?.kind === 'page' ? current.page.slug : null
  useEffect(() => { if (currentId) { try { localStorage.setItem(remember(root), currentId) } catch { /* fine */ } } }, [currentId, root])

  // Open the page under the current tab (a stale page under another tab is harmless; the render checks the slug).
  useEffect(() => {
    if (!currentSlug) return
    let on = true
    readPage(root, currentSlug).then(doc => { if (on) setOpen({ slug: currentSlug, doc }) }).catch(e => { if (on) setMsg(`Could not open: ${e.message}`) })
    return () => { on = false }
  }, [currentSlug, root])

  const add = async () => {
    const n = (pages || []).length + 1
    const title = `Tab ${n}`
    const slug = `${slugify(title)}-${Date.now().toString(36).slice(-4)}`
    try {
      const doc = await writePage(root, slug, blankPage(title))
      setPages(p => [...(p || []), { slug, title, created_at: doc.created_at, updated_at: doc.updated_at, words: 0, strokes: 0 }].sort(byCreated))
      setSel(`page:${slug}`)
    } catch (e) { setMsg(`Could not add a tab: ${e.message}`) }
  }
  const rename = async (t) => {
    const title = await hudPrompt('Name the tab', t.page.title)
    if (!title?.trim() || title.trim() === t.page.title) return
    const name = title.trim()
    try {
      const doc = await readPage(root, t.page.slug)
      await writePage(root, t.page.slug, { ...doc, title: name })
      setPages(p => (p || []).map(x => x.slug === t.page.slug ? { ...x, title: name } : x))
    } catch (e) { setMsg(`Could not rename: ${e.message}`) }
  }
  const removed = () => { setOpen(null); setSel(null); setTick(t => t + 1) }

  const live = protocols.filter(g => g.open > 0)
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <Label style={{ marginBottom: 0 }}>Live Protocols</Label>
        <span style={{ ...mono, color: live.length ? GREEN : GRAY, fontWeight: live.length ? 700 : 500 }}>{live.length ? 'On' : 'Off'}</span>
        {live.map(g => <span key={g.key} style={{ ...mono, color: INK2 }}>{(PROTOCOLS[g.protocol] || { label: g.protocol }).label}{g.scope ? ` · ${g.scope}` : ''} · {g.open} open</span>)}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, borderBottom: `1px solid ${PANEL_BORDER}`, overflowX: 'auto', paddingLeft: 2 }}>
        {tabs.map(t => <Tab key={t.id} active={current?.id === t.id} live={t.live} onClick={() => setSel(t.id)} onDoubleClick={t.kind === 'page' ? () => rename(t) : undefined} title={t.kind === 'page' ? 'Double-click to rename' : t.label}>{t.label}</Tab>)}
        <button onClick={add} title="New tab" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 32, marginBottom: -1, color: INK2, background: 'transparent', border: '1px solid transparent', borderRadius: '9px 9px 0 0', cursor: 'pointer' }}><Plus size={13} /></button>
      </div>
      {pages === null && <div style={{ ...mono, padding: '14px 2px' }}>Reading the Ledger</div>}
      {pages !== null && !current && (
        <div style={{ border: `1px solid ${PANEL_BORDER}`, borderTop: 'none', borderRadius: '0 10px 10px 10px', background: PANEL_BG, padding: '28px 18px', fontSize: 13, color: GRAY }}>A blank sheet. The plus above opens the first tab; type on it, draw over it, name it what you are doing there.</div>
      )}
      {current?.kind === 'protocol' && (
        <div style={{ border: `1px solid ${PANEL_BORDER}`, borderTop: 'none', borderRadius: '0 10px 10px 10px', background: PANEL_BG, padding: '12px 14px 14px' }}>
          <div style={{ ...mono, marginBottom: 10 }}>Created {fmt(current.g.created_at)} · Updated {fmt(current.g.updated_at)}</div>
          <ProtocolsTab key={current.g.key} objectiveId={current.g.objectiveId} only={current.g.protocol} bare />
        </div>
      )}
      {current?.kind === 'planning' && (
        <div style={{ border: `1px solid ${PANEL_BORDER}`, borderTop: 'none', borderRadius: '0 10px 10px 10px', background: PANEL_BG, padding: '12px 14px 14px', minWidth: 0, overflow: 'hidden' }}><PlanningCanvas project={planning} /></div>
      )}
      {current?.kind === 'page' && (open && open.slug === current.page.slug
        ? <Page key={open.slug} root={root} slug={open.slug} doc={open.doc} embedded title={current.page.title} onRemoved={removed} />
        : <div style={{ border: `1px solid ${PANEL_BORDER}`, borderTop: 'none', borderRadius: '0 10px 10px 10px', background: PANEL_BG, padding: '28px 18px', ...mono }}>Opening the tab</div>)}
      {msg && <div style={{ ...mono, color: INK2, marginTop: 10 }}>{msg}</div>}
    </div>
  )
}
