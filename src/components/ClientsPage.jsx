// Clients (David 11/25): "a client page needs to be a bit different than a gate. The landing page should have the
// clients where I'm personally tracking things for. Each client should have files and workbench and some place to
// link Harvest and Mission work. Mission work is still mission work, but a mission can tie to a client or client
// initiative. The client page should show what, if any mission work is in play, in addition to being a container for
// everything else." The landing page lists the clients he tracks himself, each with its live state. The Client card
// is a container, not a gate: Missions (the Main Missions tied to the client and their open gates), Harvest (the
// client's hours from the Ledger's time_entries), Files (its own Live Files), a Workbench of tabs (the same canon as
// every card; the program timeline rides it as a tab), and Legacy Resources: a shelf of tabs and files carried over
// from finished gates, read-only, reachable from the card but never on the tab strip. The ties are in
// src/lib/clients.js (and sql/2026-11-25-clients.sql for the Ledger).
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { ArrowUpRight, RefreshCw, X, Briefcase, Clock, Eye, EyeOff, Archive, Undo2, FileText, LayoutTemplate, PenLine, FolderOpen, ArrowDownToLine, Check } from 'lucide-react'
import useProjects from '../hooks/useProjects'
import { loadClients, setTracked, missionsOf, gatesOf, isOpenGate, gateText, harvestFor, clientFilesApi, clientRoot, readLegacy, legacySources, moveTabToLegacy, moveBuildToLegacy, moveFileToLegacy, returnFromLegacy, readLegacyTab, readLegacyBuild, newestClientFile } from '../lib/clients'
import { clientByKey as lanesFor } from '../constants/clients'
import CardFiles from './river/CardFiles'
import WorkbenchSheet from './river/WorkbenchSheet'
import LumenPanel from './river/LumenPanel'
import KindMark from './river/KindMark'
import { GateGlyph } from './river/GatePage'
import { openCard } from '../lib/card'
import { paint } from './river/Workspace'
import { fireLedgerChanged } from '../lib/lumenPanel'
import { listLiveFiles, readFileIndex, writeFileIndex, putLiveFile, requestLiveFile, addLiveLink, openLiveFile, downloadLiveFile, draftMail, pinEvidence, removeLiveRow, fileSynopsis, fmtSize } from '../lib/livefiles'
import { pdfUrl } from '../lib/cabinet'
import { INK, INK2, GRAY, LABEL, BLUE, SUCCESS, GREEN, PANEL_BORDER, PANEL_BG, SERIF, SectionTag, Trail, KIND_COLOR } from './river/canon'
import { Waterfall, ItemModal, useClientTimeline, TimelinePill } from './river/ClientTimeline'
import { hudConfirm } from '../lib/dialog'

const FILES_API = clientFilesApi({ listLiveFiles, readFileIndex, writeFileIndex, putLiveFile, requestLiveFile, addLiveLink, openLiveFile, downloadLiveFile, draftMail, pinEvidence, removeLiveRow, fileSynopsis, pdfUrl })
const day = (iso) => iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
const stamp = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''
const hrs = (n) => (Math.round((Number(n) || 0) * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })

const CSS = `
.cl { max-width: 1180px; margin: 0 auto; padding: 20px 24px 80px; color: ${INK}; --line: ${PANEL_BORDER}; }
.cl h1 { font: 500 34px/1.15 ${SERIF}; letter-spacing: -.012em; margin: 0; min-width: 0; }
.cl .cl-sub { font-size: 14px; color: ${INK2}; margin-top: 6px; }
.cl-head { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; margin-top: 18px; }
.cl-star { font: italic 400 16px/1.55 ${SERIF}; color: ${INK}; margin: 8px 0 0; max-width: 76ch; }
.cl-facts { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line); margin-top: 22px; }
.cl-fact { padding: 16px 0 6px 20px; border-left: 1px solid var(--line); min-width: 0; }
.cl-fact:first-child { border-left: 0; padding-left: 0; }
.cl-fact b { display: block; font: 500 30px/1.05 ${SERIF}; letter-spacing: -.012em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cl-fact span { display: block; font-size: 13.5px; color: ${INK2}; margin-top: 6px; }
.cl-sec { margin-top: 38px; }
.cl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 14px; margin-top: 22px; }
.cl-tile { text-align: left; font: inherit; color: ${INK}; background: ${PANEL_BG}; border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px 16px; cursor: pointer; display: flex; flex-direction: column; gap: 12px; min-height: 190px; transition: border-color .15s; }
.cl-tile:hover { border-color: ${BLUE}; }
.cl-tile h2 { font: 500 19px/1.25 ${SERIF}; margin: 0; letter-spacing: -.01em; }
.cl-tile .cl-desc { font-size: 13px; line-height: 1.5; color: ${INK2}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cl-live { display: grid; gap: 7px; margin-top: auto; font-size: 13px; }
.cl-live > div { display: flex; align-items: flex-start; gap: 9px; min-width: 0; }
.cl-live svg { flex: none; margin-top: 2px; color: ${LABEL}; }
.cl-live span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-live b { font-weight: 600; }
.cl-live .off { color: ${GRAY}; }
.cl-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-top: 1px solid var(--line); }
.cl-row:first-child { border-top: 0; }
.cl-row .cl-name { flex: 1; min-width: 0; font: 500 16.5px/1.3 ${SERIF}; color: ${INK}; background: transparent; border: 0; padding: 0; text-align: left; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; }
.cl-row .cl-name:hover { color: ${BLUE}; }
.cl-gates { padding: 0 0 6px 46px; display: grid; gap: 4px; }
.cl-gate { display: flex; align-items: flex-start; gap: 9px; font-size: 14px; line-height: 1.4; color: ${INK}; background: transparent; border: 0; padding: 4px 0; text-align: left; cursor: pointer; font-family: inherit; }
.cl-gate:hover { color: ${BLUE}; }
.cl-gate svg { flex: none; margin-top: 2px; color: ${INK2}; }
.cl-gate small { color: ${INK2}; font-size: 13px; margin-right: 4px; }
.cl-chip { border: 1px solid var(--line); border-radius: 999px; padding: 5px 12px; font-size: 13px; color: ${INK}; white-space: nowrap; background: ${PANEL_BG}; font-family: inherit; display: inline-flex; align-items: center; gap: 7px; cursor: default; }
button.cl-chip { cursor: pointer; } button.cl-chip:hover { border-color: ${BLUE}; }
.cl-chip.on { color: ${GREEN}; border-color: color-mix(in srgb, ${GREEN} 50%, transparent); }
.cl-tbl { width: 100%; border-collapse: collapse; font-size: 14px; }
.cl-tbl th { text-align: left; font-weight: 600; font-size: 13px; color: ${LABEL}; padding: 6px 0 10px; border-bottom: 1px solid var(--line); }
.cl-tbl td { padding: 9px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
.cl-tbl th.n, .cl-tbl td.n { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; padding-left: 18px; }
.cl-tbl tr.tot td { font-weight: 600; border-bottom: 0; }
.cl-people { display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 13px; color: ${INK2}; margin-top: 14px; }
.cl-people b { color: ${INK}; font-weight: 600; }
.cl-empty { display: grid; place-items: center; padding: 34px 0 18px; color: ${GRAY}; }
.cl-shelf { display: grid; gap: 0; border: 1px dashed var(--line); border-radius: 14px; padding: 6px 18px; }
.cl-item { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-top: 1px solid var(--line); background: transparent; border-left: 0; border-right: 0; border-bottom: 0; width: 100%; text-align: left; font: inherit; color: ${INK}; cursor: pointer; }
.cl-item:first-child { border-top: 0; }
.cl-item:hover .cl-it { color: ${BLUE}; }
.cl-item svg { flex: none; color: ${LABEL}; }
.cl-it { flex: 1; min-width: 0; font: 500 15px/1.3 ${SERIF}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-src { font-size: 13px; color: ${INK2}; white-space: nowrap; }
.cl-ic { width: 32px; height: 32px; border-radius: 99px; border: 1.5px solid ${BLUE}; display: inline-grid; place-items: center; color: ${BLUE}; background: transparent; cursor: pointer; padding: 0; flex: none; }
.cl-ic:hover { background: color-mix(in srgb, ${BLUE} 16%, transparent); }
.cl-ic.sm { width: 26px; height: 26px; border-width: 1.2px; }
.cl-over { position: fixed; inset: 0; background: rgba(5,16,28,.8); display: grid; place-items: center; z-index: 200; padding: 18px; }
.cl-sheet { background: #0F2334; border: 1px solid var(--line); border-radius: 16px; width: min(1100px, 96vw); max-height: 92vh; overflow: auto; padding: 22px 26px 24px; display: grid; gap: 14px; color: ${INK}; }
.cl-sheet h3 { font: 500 24px/1.2 ${SERIF}; margin: 0; letter-spacing: -.01em; }
.cl-sheet .cl-src { white-space: normal; }
.cl-pick h4 { font: 500 16px/1.3 ${SERIF}; margin: 18px 0 6px; color: ${INK}; }
.cl-pick h4 small { font: 400 13px var(--font-sans, 'Instrument Sans', sans-serif); color: ${INK2}; margin-left: 8px; }
.cl-pk { display: flex; align-items: center; gap: 10px; padding: 7px 0; font-size: 14px; border-top: 1px solid var(--line); cursor: pointer; }
.cl-pk svg { flex: none; color: ${INK2}; }
.cl-pk span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cl-pk small { color: ${INK2}; font-size: 12.5px; white-space: nowrap; }
.cl-box { width: 17px; height: 17px; border-radius: 5px; border: 1.5px solid rgba(243,241,234,.5); display: grid; place-items: center; color: #0D1D2C; flex: none; }
.cl-pk.on .cl-box { background: ${BLUE}; border-color: ${BLUE}; }
.cl-btn { display: inline-flex; align-items: center; gap: 7px; font: 600 13px var(--font-sans, 'Instrument Sans', sans-serif); color: #0D1D2C; background: ${BLUE}; border: 0; border-radius: 9px; padding: 8px 14px; cursor: pointer; }
.cl-btn:disabled { opacity: .5; cursor: default; }
.cl-ghost { display: inline-flex; align-items: center; gap: 7px; font: 500 13px var(--font-sans, 'Instrument Sans', sans-serif); color: ${INK}; background: transparent; border: 1px solid var(--line); border-radius: 9px; padding: 7px 12px; cursor: pointer; }
.cl-ghost:hover { border-color: ${BLUE}; }
.cl-read { background: rgba(255,255,255,.04); border: 1px solid var(--line); border-radius: 12px; position: relative; overflow: hidden; }
.cl-read pre { font: 400 16px/1.65 ${SERIF}; white-space: pre-wrap; word-break: break-word; margin: 0; padding: 18px 22px; color: ${INK}; }
.cl-read canvas { position: absolute; inset: 0; pointer-events: none; }
.cl-msg { font-size: 13px; color: #DE7E6E; }
@media (max-width: 760px) { .cl-facts { grid-template-columns: repeat(2, 1fr); } .cl-fact:nth-child(3) { border-left: 0; padding-left: 0; } }
`

// ---------------------------------------------------------------------------------------------------------------
// The live state of one client, read once for a tile and again on the card.
// ---------------------------------------------------------------------------------------------------------------
function useClientState(client, missions) {
  const [st, setSt] = useState(null)
  const key = `${client?.id}:${missions.map(m => `${m.id}:${(m.tasks || []).filter(isOpenGate).length}`).join(',')}`
  useEffect(() => {
    let on = true
    if (!client) return undefined
    Promise.all([harvestFor(client), newestClientFile(client.id).catch(() => null)])
      .then(([h, f]) => { if (on) setSt({ harvest: h, newest: f }) })
      .catch(() => { if (on) setSt({ harvest: null, newest: null }) })
    return () => { on = false }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  const open = missions.flatMap(m => gatesOf(m).filter(({ t }) => isOpenGate(t)).map(g => ({ ...g, mission: m })))
  const now = open.find(g => g.t.objective_id) || open[0] || null
  return { ...(st || {}), ready: st !== null, open, now }
}

function ClientTile({ client, missions, onOpen }) {
  const live = useClientState(client, missions)
  const h = live.harvest
  return (
    <button className="cl-tile" onClick={() => onOpen(client)}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>{client.name}</h2>
          {client.description && <div className="cl-desc">{client.description}</div>}
        </div>
        <Briefcase size={18} color={LABEL} style={{ flexShrink: 0, marginTop: 3 }} />
      </div>
      <div className="cl-live">
        <div><KindMark kind="Main Mission" size={15} ring={false} color={LABEL} />
          {live.now
            ? <span><b>{live.open.length} Open {live.open.length === 1 ? 'Gate' : 'Gates'}</b> · Gate {live.now.n} · {gateText(live.now.t)}</span>
            : <span className={missions.length ? '' : 'off'}>{missions.length ? <><b>{missions.length} {missions.length === 1 ? 'Mission' : 'Missions'}</b> · Every Gate Closed</> : 'No Mission Work Tied'}</span>}
        </div>
        <div><Clock size={15} />
          {!live.ready ? <span className="off">·</span> : h && h.last
            ? <span><b>{hrs(h.mtd)} Hours</b> This Month · Last Entry {day(h.last)}</span>
            : <span className="off">No Harvest Hours This Year</span>}
        </div>
        <div><FileText size={15} />
          {!live.ready ? <span className="off">·</span> : live.newest
            ? <span><b>{live.newest.name}</b> · {stamp(live.newest.created_at)}</span>
            : <span className="off">No Files Yet</span>}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Missions: the Main Missions tied to the client, each with its open gates. A gate with a card opens the card.
// ---------------------------------------------------------------------------------------------------------------
function Missions({ missions, onNavigate }) {
  const sorted = [...missions].sort((a, b) => (a.status === 'completed') - (b.status === 'completed') || String(a.name).localeCompare(String(b.name)))
  if (!sorted.length) return <div className="cl-empty"><KindMark kind="Main Mission" size={64} color={GRAY} /></div>
  return (
    <div>
      {sorted.map(m => {
        const gates = gatesOf(m), open = gates.filter(({ t }) => isOpenGate(t))
        return (
          <div key={m.id}>
            <div className="cl-row">
              <KindMark kind="Main Mission" size={34} color={m.status === 'completed' ? SUCCESS : KIND_COLOR['Main Mission']} />
              <button className="cl-name" onClick={() => onNavigate && onNavigate('main-missions', [m.id])}>{m.name}<ArrowUpRight size={14} color={INK2} /></button>
              <span className="cl-src">{gates.length - open.length} of {gates.length} Gates Closed</span>
              {m.status === 'completed' ? <span className="cl-chip" style={{ color: SUCCESS }}>Complete</span> : open.length ? <span className="cl-chip on">In Play</span> : null}
            </div>
            {open.length > 0 && (
              <div className="cl-gates">
                {open.map(({ t, n }) => (
                  <button key={t.id} className="cl-gate" onClick={() => t.objective_id ? openCard(t.objective_id) : onNavigate && onNavigate('main-missions', [m.id])} title={t.objective_id ? 'Open the gate' : 'Open the mission'}>
                    <GateGlyph size={15} /><span><small>Gate {n} ·</small>{gateText(t)}{t.due_date ? <small style={{ marginLeft: 8 }}>Due {day(t.due_date)}</small> : null}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Harvest: the client's hours by project from time_entries (month to date, year to date, last entry), then by person.
// ---------------------------------------------------------------------------------------------------------------
function Harvest({ h }) {
  if (!h) return <div className="cl-empty" style={{ color: INK2 }}>Reading Harvest</div>
  if (h.none || !h.byProject.length) return <div className="cl-empty"><Clock size={64} /></div>
  const month = new Date(`${h.month}-15T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  return (
    <div>
      <table className="cl-tbl">
        <thead><tr><th>Project</th><th className="n">{month}</th><th className="n">{h.year} To Date</th><th className="n">Last Entry</th></tr></thead>
        <tbody>
          {h.byProject.map(p => <tr key={p.name}><td>{p.name}</td><td className="n">{p.mtd ? hrs(p.mtd) : <span style={{ color: GRAY }}>·</span>}</td><td className="n">{hrs(p.ytd)}</td><td className="n">{day(p.last)}</td></tr>)}
          <tr className="tot"><td>All Projects</td><td className="n">{hrs(h.mtd)}</td><td className="n">{hrs(h.ytd)}</td><td className="n">{day(h.last)}</td></tr>
        </tbody>
      </table>
      <div className="cl-people">{h.byPerson.filter(p => p.mtd > 0).map(p => <span key={p.name}><b>{p.name}</b> {hrs(p.mtd)}</span>)}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// Legacy Resources: the shelf, its reader, and the picker that carries work over from a gate.
// ---------------------------------------------------------------------------------------------------------------
const ItemGlyph = ({ kind, size = 17 }) => kind === 'tab' ? <PenLine size={size} /> : kind === 'build' ? <LayoutTemplate size={size} /> : <FileText size={size} />

function LegacyReader({ clientId, item, onClose, onReturned }) {
  const [doc, setDoc] = useState(null)
  const [html, setHtml] = useState(null)
  const [msg, setMsg] = useState(null)
  const canvas = useRef(null)
  useEffect(() => {
    let on = true
    if (item.kind === 'tab') readLegacyTab(clientId, item.source.slug).then(d => { if (on) setDoc(d) }).catch(e => { if (on) setMsg(e.message) })
    if (item.kind === 'build') readLegacyBuild(clientId, item.source.slug).then(h => { if (on) setHtml(h) }).catch(e => { if (on) setMsg(e.message) })
    return () => { on = false }
  }, [clientId, item])
  useEffect(() => { const c = canvas.current; if (!c || !doc) return; const w = c.parentElement.clientWidth, hgt = Math.max(doc.height || 720, c.parentElement.clientHeight); const dpr = window.devicePixelRatio || 1; c.width = w * dpr; c.height = hgt * dpr; c.style.width = `${w}px`; c.style.height = `${hgt}px`; paint(c, doc.strokes, null) }, [doc])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const openFile = async () => {
    const tab = window.open('', '_blank')
    try { const url = await openLiveFile({ bucket: item.source.bucket, path: item.source.path, name: item.title, id: item.source.file_id }); if (tab) { tab.opener = null; tab.location.replace(url) } }
    catch (e) { tab?.close(); setMsg(e.message) }
  }
  const back = async () => {
    if (!await hudConfirm(`Return "${item.title}" to ${item.source.label}? It leaves this shelf.`)) return
    try { await returnFromLegacy(clientId, item); fireLedgerChanged({ legacy: true }); onReturned() } catch (e) { setMsg(e.message) }
  }
  return (
    <div className="cl-over" onClick={onClose}>
      <div className="cl-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <ItemGlyph kind={item.kind} size={22} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{item.title}</h3>
            <div className="cl-src" style={{ marginTop: 4 }}>From {item.source.label}{item.source.mission_id && item.mission ? ` · ${item.mission}` : ''} · Carried Over {stamp(item.moved_at)} · Read Only</div>
          </div>
          <button className="cl-ghost" onClick={back} title="Return it to where it came from"><Undo2 size={13} /> Return</button>
          <button className="cl-ic sm" onClick={onClose} aria-label="Close" style={{ borderColor: 'rgba(255,255,255,.3)', color: INK2 }}><X size={13} /></button>
        </div>
        {item.kind === 'tab' && (doc
          ? <div className="cl-read" style={{ minHeight: Math.max(doc.height || 720, 240) }}><pre>{doc.text}</pre><canvas ref={canvas} /></div>
          : !msg && <div className="cl-src">Opening the tab</div>)}
        {item.kind === 'build' && (html !== null
          ? <iframe title={item.title} srcDoc={html} sandbox="allow-scripts allow-popups allow-forms allow-modals" style={{ display: 'block', width: '100%', height: 'min(1000px, 72vh)', minHeight: 480, border: `1px solid ${PANEL_BORDER}`, borderRadius: 10, background: '#0F2334' }} />
          : !msg && <div className="cl-src">Opening the page</div>)}
        {item.kind === 'file' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <FolderOpen size={44} color={LABEL} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 14 }}>{item.title}{item.size ? <span className="cl-src"> · {fmtSize(item.size)}</span> : null}</div></div>
            <button className="cl-btn" onClick={openFile}><ArrowUpRight size={13} /> Open</button>
            <button className="cl-ghost" onClick={async () => { try { const a = document.createElement('a'); a.href = await downloadLiveFile({ bucket: item.source.bucket, path: item.source.path, name: item.title, id: item.source.file_id }); a.download = item.title; document.body.appendChild(a); a.click(); a.remove() } catch (e) { setMsg(e.message) } }}><ArrowDownToLine size={13} /> Download</button>
          </div>
        )}
        {msg && <div className="cl-msg">{msg}</div>}
      </div>
    </div>
  )
}

function BringIn({ client, missions, onClose, onMoved }) {
  const [sources, setSources] = useState(null)
  const [picked, setPicked] = useState({})   // key -> { source, kind, slug?, row? , title }
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  useEffect(() => { let on = true; legacySources(missions).then(s => { if (on) setSources(s) }).catch(e => { if (on) { setSources([]); setMsg(e.message) } }); return () => { on = false } }, [missions])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [onClose])
  const toggle = (key, v) => setPicked(p => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = v; return n })
  const n = Object.keys(picked).length
  const move = async () => {
    setBusy(true); setMsg(null)
    let moved = 0
    try {
      for (const v of Object.values(picked)) {
        const s = v.source, meta = { label: s.label, mission_id: s.mission_id, gate: s.gate }
        if (v.kind === 'tab') await moveTabToLegacy(client.id, { root: s.root, slug: v.slug, ...meta })
        else if (v.kind === 'build') await moveBuildToLegacy(client.id, { root: s.root, slug: v.slug, title: v.title, ...meta })
        else await moveFileToLegacy(client.id, v.row, meta)
        moved++
      }
      fireLedgerChanged({ legacy: true })
      onMoved(moved)
    } catch (e) { setMsg(`${moved} moved, then: ${e.message}`) } finally { setBusy(false) }
  }
  return (
    <div className="cl-over" onClick={onClose}>
      <div className="cl-sheet" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ width: 'min(820px, 96vw)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Archive size={22} color={LABEL} />
          <div style={{ flex: 1, minWidth: 0 }}><h3>Bring In Legacy Resources</h3><div className="cl-src" style={{ marginTop: 4 }}>Tabs and files from {client.short || client.name}'s missions and gates. What you pick is carried to this shelf, read only, and leaves its strip.</div></div>
          <button className="cl-ic sm" onClick={onClose} aria-label="Close" style={{ borderColor: 'rgba(255,255,255,.3)', color: INK2 }}><X size={13} /></button>
        </div>
        <div className="cl-pick">
          {sources === null && <div className="cl-src">Reading the missions and their gates</div>}
          {sources !== null && !sources.length && <div className="cl-empty"><Archive size={56} /></div>}
          {(sources || []).map(s => (
            <div key={s.root}>
              <h4>{s.label}<small>{s.gate != null ? s.mission : 'The mission itself'}{s.done ? ' · Closed' : ''}</small></h4>
              {s.tabs.map(t => { const k = `${s.root}:${t.kind}:${t.slug}`; return <div key={k} className={`cl-pk${picked[k] ? ' on' : ''}`} onClick={() => toggle(k, { source: s, kind: t.kind, slug: t.slug, title: t.title })}><span className="cl-box">{picked[k] && <Check size={12} strokeWidth={3} />}</span><ItemGlyph kind={t.kind} size={15} /><span>{t.title}</span><small>{t.kind === 'build' ? 'Built Tab' : 'Blank Tab'} · {stamp(t.at)}</small></div> })}
              {s.files.map(f => { const k = `${s.root}:file:${f.id}`; return <div key={k} className={`cl-pk${picked[k] ? ' on' : ''}`} onClick={() => toggle(k, { source: s, kind: 'file', row: f, title: f.name })}><span className="cl-box">{picked[k] && <Check size={12} strokeWidth={3} />}</span><FileText size={15} /><span>{f.name}</span><small>File · {stamp(f.created_at)}</small></div> })}
            </div>
          ))}
        </div>
        {msg && <div className="cl-msg">{msg}</div>}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="cl-btn" disabled={!n || busy} onClick={move}><Archive size={13} /> {busy ? 'Carrying Over' : `Carry ${n || ''} To Legacy Resources`.replace('  ', ' ')}</button>
          <button className="cl-ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Legacy({ client, missions }) {
  const [shelf, setShelf] = useState(null)
  const [reading, setReading] = useState(null)
  const [picking, setPicking] = useState(false)
  const [tick, setTick] = useState(0)
  useEffect(() => { let on = true; readLegacy(client.id).then(s => { if (on) setShelf(s.items) }).catch(() => { if (on) setShelf([]) }); return () => { on = false } }, [client.id, tick])
  const byMission = useMemo(() => Object.fromEntries(missions.map(m => [m.id, m.name])), [missions])
  const items = [...(shelf || [])].sort((a, b) => String(b.moved_at).localeCompare(String(a.moved_at)))
  return (
    <section className="cl-sec">
      <SectionTag name="Legacy Resources"><span>{items.length ? `${items.length} Carried Over` : null}</span><button className="cl-ic" onClick={() => setPicking(true)} title="Bring in from a gate or mission" aria-label="Bring in legacy resources"><Archive size={15} /></button></SectionTag>
      {shelf === null ? null : !items.length
        ? <div className="cl-shelf"><div className="cl-empty"><Archive size={56} /></div></div>
        : <div className="cl-shelf">{items.map(it => (
          <button key={it.id} className="cl-item" onClick={() => setReading({ ...it, mission: byMission[it.source?.mission_id] || null })}>
            <ItemGlyph kind={it.kind} />
            <span className="cl-it">{it.title}</span>
            <span className="cl-src">{it.source?.label}{it.source?.mission_id && byMission[it.source.mission_id] ? ` · ${byMission[it.source.mission_id]}` : ''} · {day(it.moved_at)}</span>
          </button>
        ))}</div>}
      {reading && <LegacyReader clientId={client.id} item={reading} onClose={() => setReading(null)} onReturned={() => { setReading(null); setTick(t => t + 1) }} />}
      {picking && <BringIn client={client} missions={missions} onClose={() => setPicking(false)} onMoved={() => { setPicking(false); setTick(t => t + 1) }} />}
    </section>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// The Client card
// ---------------------------------------------------------------------------------------------------------------
function TimelineTab({ client, anchor }) {
  const lanes = lanesFor(client.key)
  const tl = useClientTimeline(lanes, anchor)
  const [view, setView] = useState('simple')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const persist = async (items) => { setBusy(true); setErr(null); try { await tl.save(items); setModal(null) } catch (e) { setErr(e.message) } finally { setBusy(false) } }
  const saveItem = (d) => persist(d.id ? tl.items.map(i => i.id === d.id ? { ...i, ...d, updated_at: new Date().toISOString() } : i) : [...tl.items, { ...d, position: tl.items.length }])
  if (!lanes) return null
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <TimelinePill active={view === 'simple'} onClick={() => setView('simple')}>Simple</TimelinePill>
        <TimelinePill active={view === 'detailed'} onClick={() => setView('detailed')}>Detailed</TimelinePill>
        <span style={{ flex: 1 }} />
        <button className="cl-ghost" onClick={tl.reload} title="Read the timeline again"><RefreshCw size={12} /></button>
        <button className="cl-btn" onClick={() => setModal({ item: { lane: lanes.lanes[0].id } })}>Add A Timeline Item</button>
      </div>
      {(err || tl.error) && <div className="cl-msg" style={{ marginBottom: 8 }}>{err || tl.error}</div>}
      {!tl.loading && tl.items.length === 0 && <div className="cl-empty"><Clock size={56} /></div>}
      {!tl.loading && tl.items.length > 0 && <Waterfall client={lanes} items={tl.items} view={view} onOpen={(it) => setModal({ item: it })} onAdd={(lane) => setModal({ item: { lane } })} onMove={(it, patch) => persist(tl.items.map(i => i.id === it.id ? { ...i, ...patch, updated_at: new Date().toISOString() } : i))} onDraft={(lane, start_date) => setModal({ item: { lane, start_date } })} />}
      {modal && <ItemModal client={lanes} item={modal.item} busy={busy} onClose={() => setModal(null)} onSave={saveItem} onDelete={(it) => persist(tl.items.filter(i => i.id !== it.id))} />}
    </div>
  )
}

function ClientPage({ client, missions, projects, onBack, onNavigate, onTracked }) {
  const live = useClientState(client, missions)
  const anchor = projects.find(p => p.key === client.key) || missions[0] || null
  const [fileCount, setFileCount] = useState(null)
  const [tick, setTick] = useState(0)
  useEffect(() => { try { window.history.replaceState(window.history.state, '', `#/clients/${encodeURIComponent(client.key)}`) } catch { /* no-op */ } }, [client.key])
  useEffect(() => { let on = true; FILES_API.listLiveFiles({ objectiveId: client.id }).then(r => { if (on) setFileCount(r.rows.filter(f => !f.filed_at).length) }).catch(() => {}); return () => { on = false } }, [client.id, tick])
  const h = live.harvest
  const extra = useMemo(() => lanesFor(client.key) && anchor ? [{ id: 'timeline', label: 'Timeline', render: () => <TimelineTab client={client} anchor={anchor} /> }] : [], [client, anchor])
  const lumenItem = useMemo(() => ({ kind: 'client', id: client.id, title: client.name, root: clientRoot(client.id), summary: [client.description, missions.length ? `Mission work tied to this client: ${missions.map(m => m.name).join('; ')}.` : null].filter(Boolean).join('\n\n') }), [client, missions])
  return (
    <div className="cl">
      <style>{CSS}</style>
      <Trail nodes={[{ label: 'Clients', onClick: onBack }]} />
      <div className="cl-head">
        <h1 style={{ flex: 1, minWidth: 260 }}>{client.name}</h1>
        <span style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 6 }}>
          <span className="cl-chip"><Briefcase size={13} color={LABEL} />Client</span>
          {client.short && <span className="cl-chip">{client.short}</span>}
          <button className={`cl-chip${client.tracked ? ' on' : ''}`} onClick={() => onTracked(client, !client.tracked)} title={client.tracked ? 'You track this client: it shows on the Clients page. Click to stop.' : 'Not on the Clients page. Click to track it yourself.'}>{client.tracked ? <Eye size={13} /> : <EyeOff size={13} />}{client.tracked ? 'Tracked' : 'Not Tracked'}</button>
        </span>
      </div>
      {client.description && <p className="cl-star">{client.description}</p>}
      <div className="cl-facts">
        <div className="cl-fact"><b>{live.open.length}</b><span>Open {live.open.length === 1 ? 'Gate' : 'Gates'} Across {missions.length} {missions.length === 1 ? 'Mission' : 'Missions'}</span></div>
        <div className="cl-fact"><b>{h ? hrs(h.mtd) : '·'}</b><span>Harvest Hours This Month</span></div>
        <div className="cl-fact"><b>{h ? (h.last ? day(h.last) : '·') : '·'}</b><span>Last Harvest Entry</span></div>
        <div className="cl-fact"><b>{fileCount === null ? '·' : fileCount}</b><span>{fileCount === 1 ? 'File' : 'Files'} On The Card</span></div>
      </div>

      <section className="cl-sec">
        <SectionTag name="Missions"><span>{missions.length ? `${missions.length} Tied` : null}</span><button className="cl-ic" onClick={() => onNavigate && onNavigate('main-missions')} title="Main Missions" aria-label="Open Main Missions"><ArrowUpRight size={15} /></button></SectionTag>
        <Missions missions={missions} onNavigate={onNavigate} />
      </section>

      <section className="cl-sec">
        <SectionTag name="Harvest">{h && !h.none ? <span>{hrs(h.ytd)} Hours {h.year} To Date</span> : null}</SectionTag>
        <Harvest h={live.ready ? h : null} />
      </section>

      <section className="cl-sec">
        <SectionTag name="Files" />
        <CardFiles key={tick} objectiveId={client.id} api={FILES_API} onChanged={() => setTick(t => t + 1)} />
      </section>

      <section className="cl-sec">
        <SectionTag name="Workbench" />
        <WorkbenchSheet root={clientRoot(client.id)} scopes={[]} extra={extra} />
      </section>

      <Legacy client={client} missions={missions} />
      <LumenPanel item={lumenItem} />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------------------
// The page: the tracked clients, or one client's card.
// ---------------------------------------------------------------------------------------------------------------
export default function ClientsPage({ deepLink = [], onNavigate } = {}) {
  const api = useProjects()
  const { loading, projects } = api
  const [reg, setReg] = useState(null)
  const [openKey, setOpenKey] = useState(deepLink[0] || null)
  const [seenLink, setSeenLink] = useState(deepLink[0] || null)
  if ((deepLink[0] || null) !== seenLink) { setSeenLink(deepLink[0] || null); if (deepLink[0]) setOpenKey(deepLink[0]) }
  const reload = useCallback(() => { loadClients().then(setReg).catch(() => setReg({ clients: [], ties: {} })) }, [])
  useEffect(() => { reload() }, [reload])
  const onTracked = async (client, on) => { try { setReg(await setTracked(reg, client.id, on)) } catch (e) { console.warn('tracked', e.message) } }

  if ((loading && !projects.length) || reg === null) return <div className="cl"><style>{CSS}</style><div className="cl-empty" style={{ color: INK2 }}>Reading the Ledger</div></div>

  const open = openKey ? reg.clients.find(c => c.key === openKey || c.id === openKey) : null
  if (open) {
    return <ClientPage key={open.id} client={open} missions={missionsOf(open, projects, reg)} projects={projects} onNavigate={onNavigate} onTracked={onTracked}
      onBack={() => { setOpenKey(null); try { window.history.replaceState(window.history.state, '', '#/clients') } catch { /* no-op */ } }} />
  }
  const tracked = reg.clients.filter(c => c.tracked)
  const others = reg.clients.filter(c => !c.tracked)
  return (
    <div className="cl">
      <style>{CSS}</style>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1>Clients</h1>
          <div className="cl-sub">{tracked.length} {tracked.length === 1 ? 'Client' : 'Clients'} You Track Yourself</div>
        </div>
        <button className="cl-ic" style={{ marginTop: 6 }} onClick={() => { api.refresh(); reload() }} title="Read again" aria-label="Refresh"><RefreshCw size={14} /></button>
      </div>
      {!tracked.length && <div className="cl-empty" style={{ padding: '70px 0' }}><Briefcase size={72} /></div>}
      <div className="cl-grid">
        {tracked.map(c => <ClientTile key={c.id} client={c} missions={missionsOf(c, projects, reg)} onOpen={(cl) => setOpenKey(cl.key)} />)}
      </div>
      {others.length > 0 && (
        <section className="cl-sec">
          <SectionTag name="Not Tracked"><span>{others.length}</span></SectionTag>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{others.map(c => <button key={c.id} className="cl-chip" onClick={() => setOpenKey(c.key)}><EyeOff size={13} />{c.name}</button>)}</div>
        </section>
      )}
    </div>
  )
}
