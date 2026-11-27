// A gate's own page (David 11/19: "i'm trying to get to a gate's specific page so i can pull up lumen and work
// through each gate, in the gate's environment, while watching the mission play out on the main mission timeline
// and the gates own personal timeline"; on the mock-up: "all gates will look like this? wire it up and let me play
// with it live"). The mission's trail and the gate's own timeline across the top, the gate's own Workbench under
// them (its tabs live under <card root>/gates/<gate id>), and the card's Lumen framed on the gate while it is open.
// The Workbench pulls up full: the header and the two lines fold to one strip.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, ArrowUp, ListTree, PenLine, FolderOpen, Plus, Check, X as XMark, Sparkles, CalendarDays, Star, ChevronDown } from 'lucide-react'
import { readPath, savePathSteps, buildTrail, dueWords } from '../../lib/path'
import { listBuilds, processAndPost } from '../../lib/lumenPanel'
import { toggleStep } from '../../lib/objectives'
import { ExtractMarker } from './glyphs'
import { hudPrompt, hudConfirm } from '../../lib/dialog'
import { loadCommitments, ruleCommitment } from '../../lib/commitments'
import CatchTalk from './CatchTalk'
import CardFiles from './CardFiles'
import WorkbenchSheet from './WorkbenchSheet'
import { listPages, readPage, writePage, slugify } from '../../lib/workspace'
import { setGateView } from '../../lib/gateView'

export const GateGlyph = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20V10a7 7 0 0 1 14 0v10M3 20h18M9.5 20v-8M12 20V9M14.5 20v-8" /></svg>
export const LoadGlyph = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>

// One color per page (David 11/20, on my cleaner rule): the slot's color owns a loaded card, where you are is size
// and glow, the gate's own line is the same color at a lighter weight, and a card that is not loaded reads in ink.
const INK_TONE = 'rgba(243,241,234,.78)'
const gateRoot = (root, id) => `${root}/gates/${id}`
const stamp = (iso) => iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) : ''
const days = (iso) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5); return d < 1 ? 'Opened Today' : `Open ${d} ${d === 1 ? 'Day' : 'Days'}` }

const CSS = `
.gp { position: fixed; top: 0; left: 0; bottom: 0; right: var(--lumen-aside, 0px); z-index: 190; background: #0F2334; color: #F3F1EA; overflow-y: auto; font-family: var(--font-sans, 'Instrument Sans', system-ui, sans-serif); animation: gpin .2s ease both; }
@keyframes gpin { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
.gp-in { max-width: 1320px; margin: 0 auto; padding: 28px 44px 60px; }
.gp-crumb { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.gp-crumb button { font: inherit; color: var(--t); background: transparent; border: 0; padding: 0; cursor: pointer; }
.gp-crumb .up { display: inline-flex; align-items: center; gap: 5px; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; padding: 4px 10px; font-size: 12.5px; }
.gp-head { display: flex; align-items: center; gap: 16px; margin: 20px 0 24px; }
.gp-head h1 { font: 500 34px/1.15 'Lora', Georgia, serif; letter-spacing: -.012em; margin: 0; min-width: 0; }
.gp-head h1 span { color: var(--t); }
.gp.full .gp-head { margin: 0 0 14px; } .gp.full .gp-head h1 { font-size: 23px; } .gp.full .gp-in { padding-top: 18px; max-width: none; }
.gp-ic { width: 36px; height: 36px; border-radius: 99px; border: 1.5px solid var(--c, var(--t)); display: inline-grid; place-items: center; color: var(--c, var(--t)); background: transparent; flex-shrink: 0; cursor: pointer; padding: 0; transition: background .15s; }
button.gp-ic:hover { background: color-mix(in srgb, var(--c, var(--t)) 16%, transparent); }
.gp-ic.big { width: 52px; height: 52px; background: color-mix(in srgb, var(--t) 10%, transparent); cursor: default; }
.gp-ic.sm { width: 26px; height: 26px; border-width: 1.3px; }
.gp-pen { background: transparent; border: 0; color: rgba(243,241,234,.44); cursor: pointer; padding: 0 0 0 10px; vertical-align: middle; }
.gp-acts { display: flex; gap: 10px; margin-left: auto; align-items: center; }
.gp-lines { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #0D1D2C; padding: 6px 26px 2px; }
.gp-ln { display: grid; grid-template-columns: 160px 1fr; align-items: start; padding: 18px 0 14px; }
.gp-ln + .gp-ln { border-top: 1px solid rgba(255,255,255,.07); }
.gp-mini .st.own { opacity: .62; }
.gp-k { font: 500 16px 'Lora', Georgia, serif; display: flex; flex-direction: column; } .gp-k small { display: block; font: 400 12.5px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.7); margin-top: 3px; }
.gp-pick { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 4px 10px; border: 1px dashed rgba(255,255,255,.28); border-radius: 9px; font: 500 12.5px var(--font-sans, 'Instrument Sans', sans-serif); color: #F3F1EA; cursor: grab; user-select: none; width: fit-content; order: 3; }
.gp-pick i { width: 7px; height: 7px; border-radius: 99px; background: rgba(243,241,234,.6); }
.gp-pick:hover { border-color: var(--t); color: var(--t); }
.gp-pick:active { cursor: grabbing; }
.gp-snake.dropping { outline: 1px dashed color-mix(in srgb, var(--t) 45%, transparent); outline-offset: 6px; border-radius: 10px; }
.gp-ghost { animation: gpghost 1.2s ease-in-out infinite; }
@keyframes gpghost { 0%, 100% { opacity: .9 } 50% { opacity: .35 } }
.gp-two { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
@media (max-width: 900px) { .gp-two { grid-template-columns: 1fr; } }
.gp-card { border: 1px solid rgba(255,255,255,.12); border-radius: 14px; background: #0D1D2C; padding: 16px 20px; min-width: 0; }
.gp-ch { display: flex; align-items: center; gap: 10px; font: 500 18px 'Lora', Georgia, serif; margin-bottom: 8px; }
.gp-ch > button { margin-left: auto; }
.gp-st { display: flex; align-items: flex-start; gap: 11px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,.07); font-size: 14.5px; line-height: 1.4; }
.gp-st:first-of-type { border-top: 0; }
.gp-st > span { flex: 1; min-width: 0; }
.gp-st.done > span { color: rgba(243,241,234,.48); text-decoration: line-through; text-decoration-color: rgba(243,241,234,.3); }
.gp-o { width: 17px; height: 17px; margin-top: 1px; border-radius: 99px; border: 1.5px solid rgba(243,241,234,.5); background: transparent; color: #0D1D2C; display: grid; place-items: center; cursor: pointer; padding: 0; flex-shrink: 0; }
.gp-o:hover { border-color: var(--t); }
.gp-st.done .gp-o { background: var(--t); border-color: var(--t); }
.gp-x { background: transparent; border: 0; color: rgba(243,241,234,.4); cursor: pointer; padding: 2px; opacity: 0; transition: opacity .15s; }
.gp-due { flex: none; background: transparent; border: 0; padding: 1px 2px; font: 500 13px/1.4 inherit; font-family: inherit; color: rgba(243,241,234,.62); cursor: pointer; white-space: nowrap; }
.gp-due:not(.set) { opacity: 0; transition: opacity .15s; } .gp-st:hover .gp-due:not(.set) { opacity: 1; }
.gp-due:hover:not(:disabled) { color: var(--t); } .gp-due.late { color: #DE7E6E; } .gp-due:disabled { cursor: default; color: rgba(243,241,234,.38); }
.gp-st:hover .gp-x { opacity: 1; } .gp-x:hover { color: #DE7E6E; }
.gp-notes { width: 100%; box-sizing: border-box; font: 400 15px/1.6 'Lora', Georgia, serif; color: #F3F1EA; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 10px 12px; resize: vertical; outline: none; }
.gp-notes:focus { border-color: var(--t); }
.gp-mt { display: flex; align-items: baseline; gap: 10px; width: 100%; text-align: left; background: transparent; border: 0; border-top: 1px solid rgba(255,255,255,.07); padding: 8px 0; color: #F3F1EA; font: 500 14.5px 'Lora', Georgia, serif; cursor: pointer; }
.gp-mt small { margin-left: auto; font: 400 12.5px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.5); white-space: nowrap; }
.gp-mt:hover { color: var(--t); }
.gp-posted { font-size: 14px; line-height: 1.45; color: var(--t); margin: 10px 0 2px; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--t) 40%, transparent); border-radius: 10px; background: color-mix(in srgb, var(--t) 8%, transparent); animation: gpslide .35s ease both; transition: opacity .6s; }
.gp-posted b { font-weight: 600; } .gp-posted small { display: block; color: rgba(243,241,234,.72); font-size: 13px; margin-top: 3px; }
.gp-posted.faded { opacity: .6; }
@keyframes gpslide { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: none } }
.gp-ic.on { background: color-mix(in srgb, var(--c, var(--t)) 22%, transparent); }
.gp-catches { margin-top: 16px; }
.gp-cn { font: 600 12.5px var(--font-sans, 'Instrument Sans', sans-serif); color: var(--t); border: 1px solid color-mix(in srgb, var(--t) 45%, transparent); border-radius: 99px; padding: 1px 9px; }
.gp-catch { flex: 1; min-width: 0; cursor: pointer; } .gp-catch:hover { color: var(--t); }
.gp-catch small { display: block; font-size: 12.5px; color: rgba(243,241,234,.58); margin-top: 2px; }
.gp-busy { animation: gpghost 1.2s ease-in-out infinite; }
.gp-msg { font-size: 13px; color: #DE7E6E; margin-top: 8px; }
.gp-snake { position: relative; width: 100%; min-width: 0; }
.gp-sn { position: absolute; display: block; text-align: center; font: inherit; font-size: 13px; line-height: 1.3; color: rgba(243,241,234,.7); background: transparent; border: 0; padding: 0; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; }
button.gp-sn { cursor: pointer; } button.gp-sn:hover { color: #F3F1EA; }
.gp-sn.on { color: #F3F1EA; font-weight: 600; }
.gp-sn small { display: block; font-size: 12px; color: rgba(243,241,234,.48); margin-top: 2px; font-weight: 400; }
.gp-tr { display: flex; position: relative; align-items: flex-start; }
.gp-tr::before { content: ""; position: absolute; left: 8px; right: 8px; top: 9px; height: 1.5px; background: rgba(255,255,255,.12); }
.gp-nd { display: block; flex: 1; position: relative; min-width: 0; background: transparent; border: 0; padding: 0; text-align: left; font: inherit; color: inherit; }
button.gp-nd { cursor: pointer; }
.gp-nd b { display: block; width: 13px; height: 13px; border-radius: 99px; border: 1.5px solid rgba(243,241,234,.44); background: #0D1D2C; margin: 3px 0 9px 2px; position: relative; }
.gp-nd.d b { background: var(--c); border-color: var(--c); }
.gp-nd.thru::after { content: ""; position: absolute; left: 12px; right: -4px; top: 9px; height: 1.5px; background: var(--c); }
.gp-nd:last-child::after { display: none; }
.gp-nd.on b { width: 19px; height: 19px; margin: 0 0 6px -1px; background: var(--t); border-color: var(--t); box-shadow: 0 0 0 6px color-mix(in srgb, var(--t) 22%, transparent); }
.gp-nd span { display: block; font-size: 13px; line-height: 1.3; color: rgba(243,241,234,.7); padding-right: 14px; overflow: hidden; text-overflow: ellipsis; }
.gp-nd.on span { color: #F3F1EA; font-weight: 600; }
.gp-nd small { display: block; font-size: 12px; color: rgba(243,241,234,.44); margin-top: 2px; font-weight: 400; }
.gp-mini { display: flex; align-items: center; gap: 22px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; background: #0D1D2C; padding: 10px 18px; margin-bottom: 14px; }
.gp-mini .k { font: 500 13.5px 'Lora', Georgia, serif; white-space: nowrap; }
.gp-mini .st { flex: 1; display: flex; align-items: center; }
.gp-mini .st i { flex: 1; height: 1.5px; background: rgba(255,255,255,.12); } .gp-mini .st i.d { background: var(--c); }
.gp-mini .st b { width: 10px; height: 10px; border-radius: 99px; border: 1.5px solid rgba(243,241,234,.44); flex-shrink: 0; } .gp-mini .st b.d { background: var(--c); border-color: var(--c); }
.gp-mini .st b.on { width: 14px; height: 14px; background: var(--t); border-color: var(--t); box-shadow: 0 0 0 4px color-mix(in srgb, var(--t) 22%, transparent); }
.gp-bench { margin-top: 26px; } .gp.full .gp-bench { margin-top: 0; }
.gp-benchhead { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; font: 500 20px 'Lora', Georgia, serif; }
.gp-benchhead::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,.12); order: 1; } .gp-benchhead button { order: 2; }
.gp-sq { width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); display: inline-grid; place-items: center; color: rgba(243,241,234,.7); background: transparent; cursor: pointer; }
.gp-sq:hover, .gp-sq.on { color: var(--t); border-color: var(--t); }
`

// A line of stops that folds back on itself when there are more than fit (David 11/21, on a mission of 34 gates
// running off the page: "we should find a way to make this fit, curving the line or something. fine if it takes a bit
// more real estate"). Rows run left to right, then right to left, joined by a half circle at the end. A few stops
// sit on one straight row, as before.
// nodes: [{ key, label, sub, state: 'done' | 'on' | 'open', onClick }]
const ROW_H = 118, CELL = 150
// onDrop(i): a step dragged onto the line lands before node i (1 to n - 1: after the first, before the last).
function SnakeLine({ nodes, dim = false, onDrop = null }) {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  const [over, setOver] = useState(null)        // the gap a dragged step would land in
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return undefined
    const on = () => setW(el.clientWidth)
    on(); const ro = new ResizeObserver(on); ro.observe(el); return () => ro.disconnect()
  }, [])
  const n = nodes.length
  // One straight row whenever the stops still get a decent width each; fold only when they truly do not fit.
  const fitsOne = n <= 1 || (w - 20) / (n - 1) >= 112
  const per = !w || fitsOne ? n : Math.max(3, Math.floor((w - 120) / CELL) + 1)
  const rows = Math.max(1, Math.ceil(n / per)), snake = rows > 1
  const pad = snake ? 64 : 10, span = Math.max(1, (snake ? per : n) - 1)
  const pos = nodes.map((_, i) => { const r = Math.floor(i / per), k = i % per, x = pad + (w - 2 * pad) * (n === 1 ? 0 : k / span); return { x: r % 2 ? w - x : x, y: 10 + r * ROW_H, r } })
  const gap = (w - 2 * pad) / span, cellW = Math.min(150, Math.max(60, gap - 8))
  // A label at a bend sits between its node and its neighbor's label, so the two never overlap.
  const endW = Math.max(60, gap - cellW / 2 + 8)
  const seg = (a, b) => a.r === b.r ? `M${a.x},${a.y} L${b.x},${b.y}` : `M${a.x},${a.y} A${ROW_H / 2},${ROW_H / 2} 0 0 ${a.r % 2 ? 0 : 1} ${b.x},${b.y}`
  const ink = 'rgba(255,255,255,.14)'
  // The gap nearest the pointer, kept off the first and last stops.
  const gapAt = (e) => {
    const r = ref.current.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top
    let best = 1, bd = Infinity
    for (let i = 1; i < pos.length; i++) { const mx = (pos[i - 1].x + pos[i].x) / 2, my = (pos[i - 1].y + pos[i].y) / 2, d = (mx - x) ** 2 + (my - y) ** 2; if (d < bd) { bd = d; best = i } }
    return best
  }
  const drag = onDrop ? {
    onDragOver: (e) => { if (![...e.dataTransfer.types].includes('text/x-hud-step')) return; e.preventDefault(); setOver(gapAt(e)) },
    onDragLeave: (e) => { if (!ref.current.contains(e.relatedTarget)) setOver(null) },
    onDrop: (e) => { if (![...e.dataTransfer.types].includes('text/x-hud-step')) return; e.preventDefault(); const i = gapAt(e); setOver(null); onDrop(i) },
  } : {}
  const ghost = over != null && pos[over] ? (() => { const a = pos[over - 1], b = pos[over]; return a.r === b.r ? { x: (a.x + b.x) / 2, y: a.y } : { x: a.r % 2 ? a.x - ROW_H / 2 : a.x + ROW_H / 2, y: (a.y + b.y) / 2 } })() : null
  return (
    <div ref={ref} className={`gp-snake${over != null ? ' dropping' : ''}`} style={{ height: w ? (rows - 1) * ROW_H + 96 : 96, opacity: dim && over == null ? 0.62 : 1 }} {...drag}>
      {w > 0 && <svg width={w} height={(rows - 1) * ROW_H + 30} aria-hidden="true" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
        {pos.slice(1).map((b, i) => { const a = pos[i], lit = nodes[i].state === 'done' && nodes[i + 1].state !== 'open'; return <path key={i} d={seg(a, b)} fill="none" stroke={lit ? 'var(--c)' : ink} strokeWidth="1.5" /> })}
        {pos.map((p, i) => { const st = nodes[i].state; return st === 'on'
          ? <g key={i}><circle cx={p.x} cy={p.y} r="15" fill="color-mix(in srgb, var(--t) 22%, transparent)" /><circle cx={p.x} cy={p.y} r="9.5" fill="var(--t)" /></g>
          : <circle key={i} cx={p.x} cy={p.y} r="6.5" fill={st === 'done' ? 'var(--c)' : '#0D1D2C'} stroke={st === 'done' ? 'var(--c)' : 'rgba(243,241,234,.44)'} strokeWidth="1.5" /> })}
        {ghost && <g><circle cx={ghost.x} cy={ghost.y} r="12" fill="none" stroke="var(--t)" strokeWidth="1.5" className="gp-ghost" /><circle cx={ghost.x} cy={ghost.y} r="4.5" fill="var(--t)" /></g>}
      </svg>}
      {w > 0 && nodes.map((nd, i) => {
        // At a bend the label leans inward, so the half circle never runs through it.
        const p = pos[i], atRight = n > 1 && p.x >= w - pad - 1, atLeft = n > 1 && p.x <= pad + 1
        const lw = atRight || atLeft ? endW : cellW
        const left = atRight ? p.x - lw + 14 : atLeft ? p.x - 14 : Math.max(0, Math.min(w - lw, p.x - lw / 2))
        const Tag = nd.onClick ? 'button' : 'div'
        return <Tag key={nd.key} type={nd.onClick ? 'button' : undefined} className={`gp-sn${nd.state === 'on' ? ' on' : ''}`} title={nd.title || undefined} onClick={nd.onClick || undefined} style={{ left, top: p.y + 18, width: lw, textAlign: atRight ? 'right' : atLeft ? 'left' : 'center' }}>{nd.label}{nd.sub && <small>{nd.sub}</small>}</Tag>
      })}
    </div>
  )
}

// gate: the step ({ id, text, n, done, done_at, created_at }); gates: every gate on the card, in order.
// card (a gate with its own card): { obj, stops, files, meetings, onSaveNotes, onOpenNotes, onChanged }. With it the
// page carries the gate's steps, its notes and a timeline of everything that happened on it (David 11/21, Gate 35).
// filesNote (11/23): a gate with no card of its own keeps no files; the Files button still shows and says where they are.
export default function GatePage({ card = null, benchRoot = null, tools = null, filesFor = null, filesNote = null, onTrail = null, tone = null, gate, gates, root, missionTitle, up = [], source = null, polaris = null, polarisLabel = 'Polaris', doneWhen = null, details = null, onEditPolaris = null, onClose, onPick, onRename, onExtract, onLoad }) {
  const [more, setMore] = useState(false)   // the gate's details, folded until asked for
  const full = false   // the Workbench's own button takes it to full screen now
  const [view, setView] = useState('bench')   // 'bench' | 'files'
  const [psteps, setPsteps] = useState([])     // steps set by hand on the gate's line (path.json)
  const [builds, setBuilds] = useState([])
  const [notes, setNotes] = useState(card?.obj?.notes || '')
  const [stepMsg, setStepMsg] = useState(null)
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState(null)   // { summary, n, at } after Process And Post
  const [catches, setCatches] = useState([])    // open catches from this gate
  const [talk, setTalk] = useState(null)
  const cardId = card?.obj?.id || null
  const loadCatches = async () => { if (!cardId) return; try { setCatches((await loadCommitments()).filter(c => c.state === 'open' && c.item && c.item.id === cardId)) } catch { /* the list stays as it was */ } }
  useEffect(() => { if (!cardId) return; let on = true; loadCommitments().then(xs => { if (on) setCatches(xs.filter(c => c.state === 'open' && c.item && c.item.id === cardId)) }).catch(() => {}); return () => { on = false } }, [cardId])
  // The page sits in the same layer as the card's Lumen panel, so the pill and the panel stay above it.
  const [host] = useState(() => document.querySelector('aside[aria-label="Lumen"]')?.parentElement || document.querySelector('.sa-app') || document.body)
  const [tabs, setTabs] = useState([])
  const [ready, setReady] = useState(false)
  // A gate that has its own card works on that card's Workbench: one Workbench per gate, never two (David 11/20).
  const groot = benchRoot || gateRoot(root, gate.id)
  const n = gate.n != null ? gate.n : gates.findIndex(g => g.id === gate.id) + 1
  useEffect(() => { setGateView({ id: gate.id, n, text: gate.text }); return () => setGateView(null) }, [gate.id, n, gate.text])
  useEffect(() => { const k = (e) => { if (e.key === 'Escape' && !e.defaultPrevented && !document.querySelector('.sa-app.lumen-open')) onClose() }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [full, onClose])
  // The gate's tabs. A tab made for this gate on the card's Workbench before the gate had a page comes along, once.
  useEffect(() => {
    let on = true
    const run = async () => {
      let pages = await listPages(groot).catch(() => [])
      if (!pages.length && !benchRoot) {
        const old = slugify(`gate-${gate.n != null ? gate.n : ''}-${String(gate.text || 'Gate').slice(0, 80)}`)
        const doc = await readPage(root, old).catch(() => null)
        if (doc) { await writePage(groot, old, doc).catch(() => {}); pages = await listPages(groot).catch(() => []) }
      }
      const [pd, bs] = card ? await Promise.all([readPath(groot).catch(() => ({ steps: [] })), listBuilds(groot).catch(() => [])]) : [{ steps: [] }, []]
      if (on) { setTabs(pages); setReady(true); setPsteps(pd.steps || []); setBuilds(bs) }
    }
    run()
    return () => { on = false }
  }, [groot, root, gate.id, gate.n, gate.text])
  // With a card, the gate's line is everything that happened on it: opened, steps done, tabs and pages, files, closed.
  const cardLine = useMemo(() => {
    if (!card) return null
    const done = (card.stops || []).filter(x => x.done && x.done_at).map(x => ({ id: `s${x.id}`, text: x.text, done: true, at: x.done_at }))
    const ev = buildTrail({ obj: card.obj, kindLabel: 'Gate', steps: [], files: card.files || [], tabs, builds, psteps: [...psteps, ...done] })
    const label = (e) => e.kind === 'Step' || e.kind === 'Step Vetted' ? e.text : /^Opened as/.test(e.text) ? 'Opened' : e.text.replace(/^Tab on the Workbench: /, 'Tab: ').replace(/^Page built on the Workbench: /, 'Built: ')
    const nodes = ev.map((e, i) => ({ key: `e${i}`, label: label(e).slice(0, 80), sub: stamp(e.at), title: e.note || e.text, state: 'done', at: e.at }))
    // Steps still to do sit ahead on the line, in their order, before the close (David 11/21: "step should match on the timeline").
    const ahead = [...(card.stops || []).filter(x => !x.done).map(x => ({ key: `os${x.id}`, label: String(x.text).slice(0, 80), title: x.text, state: 'open' })),
      ...psteps.filter(x => !x.done && !x.vetted && !x.note).map(x => ({ key: `op${x.id}`, label: String(x.text).slice(0, 80), sub: x.due ? new Date(`${x.due}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : undefined, title: x.text, state: 'open' }))]
    return [...nodes, ...ahead, gate.done ? null : { key: 'close', label: 'Close', state: 'open' }].filter(Boolean)
  }, [card, tabs, builds, psteps, gate.done])
  // The gate's own line: where it came from, what was written on it, and its close.
  const line = useMemo(() => {
    const ev = []
    const opened = gate.created_at || source?.at
    if (opened) ev.push({ at: opened, text: 'Opened', done: true })
    for (const t of [...tabs].sort((a, b) => String(a.updated_at || '').localeCompare(String(b.updated_at || ''))).slice(-3)) ev.push({ at: t.updated_at, text: t.title || 'Tab', done: true })
    ev.push(gate.done ? { at: gate.done_at, text: 'Closed', done: true } : { at: null, text: 'Close', done: false })
    return ev
  }, [gate, source, tabs])
  const closedN = gates.filter(g => g.done).length
  // Steps: the card's own (objective_steps) and the ones set by hand on its line, one list, open first.
  const stepRows = card ? [
    ...(card.stops || []).map(x => ({ key: `s${x.id}`, kind: 'stop', id: x.id, text: x.text, done: !!x.done })),
    ...psteps.filter(x => !x.vetted && !x.note).map(x => ({ key: `p${x.id}`, kind: 'path', id: x.id, text: x.text, done: !!x.done, due: x.due || null })),
  ].sort((a, b) => Number(a.done) - Number(b.done)) : []
  // A step's target date sits on or before the gate's own (David 11/22).
  const gateDue = (gate.due_date || card?.obj?.due_date || '').slice(0, 10) || null
  const shortDay = (d) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const stepAsk = (o, due = null) => hudPrompt({ ...o, date: { value: due, max: gateDue, maxWords: gateDue ? shortDay(gateDue) : null } })
  const savePs = async (fn) => { const doc = await savePathSteps(groot, fn); setPsteps(doc.steps || []) }
  const addStepHere = async () => {
    const a = await stepAsk({ title: 'A Step On This Gate', placeholder: 'What is to be done' })
    const t = String(a?.text || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (!t) return
    try { await savePs(list => [...list, { id: `p${Date.now().toString(36)}`, text: t, by: 'david', made_at: new Date().toISOString(), done: false, at: null, due: a.date || null }]) } catch (e) { setStepMsg(`Could not add it: ${e.message}`) }
  }
  // A step dragged onto the gate's line (David 11/21: "i should be able to drag a step to the timeline (like the mission
  // page) where the modal opens"). Dropped among what happened, it is a step done then; dropped ahead, a step to do there.
  const dropOnLine = async (i) => {
    if (!cardLine) return
    const done = cardLine.filter(nd => nd.state === 'done'), past = i < done.length   // gap i sits before node i: inside the history, or after it
    const a = past ? { text: await hudPrompt({ title: 'A Step On The Trail', placeholder: 'What you did' }) } : await stepAsk({ title: 'A Step On This Gate', placeholder: 'What is to be done' })
    const t = String(a?.text || '').replace(/\s+/g, ' ').trim().slice(0, 300)
    if (!t) return
    const now = new Date().toISOString(), row = { id: `p${Date.now().toString(36)}`, text: t, by: 'david', made_at: now, ...(past ? {} : { due: a.date || null }) }
    try {
      if (past) {
        const tt = (nd) => new Date(nd.at).getTime(), prev = done[i - 1], next = done[i]
        const at = new Date(prev && prev.at && next && next.at ? (tt(prev) + tt(next)) / 2 : Date.now()).toISOString()
        await savePs(list => [...list, { ...row, done: true, at }])
      } else {
        // Among the steps ahead: after the card's own open steps, the hand-set ones keep their order in path.json.
        const openStops = (card.stops || []).filter(x => !x.done).length, k = Math.max(0, i - done.length - openStops)
        await savePs(list => { const open = list.filter(x => !x.done && !x.vetted), at = open[k] ? list.indexOf(open[k]) : list.length; const out = [...list]; out.splice(at, 0, { ...row, done: false, at: null }); return out })
      }
    } catch (e) { setStepMsg(`Could not add it: ${e.message}`) }
  }
  // Process And Post (David 11/21): Lumen reads the notes, posts a line on this gate's timeline, and catches what needs a follow-up.
  const process = async () => {
    const t = notes.trim(); if (!t || posting) return
    setPosting(true); setStepMsg(null); setPosted(null)
    try {
      if (t !== String(card.obj?.notes || '').trim()) card.onSaveNotes && card.onSaveNotes(t)
      const r = await processAndPost({ text: t, where: `Gate ${n} · ${gate.text}`, root: groot, item: { kind: 'objective', id: card.obj.id }, title: gate.text })
      setPosted({ summary: r.summary, n: (r.catches || []).length, at: Date.now() })
      loadCatches()
      setTimeout(() => setPosted(p => (p && Date.now() - p.at >= 5500 ? { ...p, faded: true } : p)), 6000)
      const pd = await readPath(groot).catch(() => null); if (pd) setPsteps(pd.steps || [])
    } catch (e) { setStepMsg(`Lumen could not process it: ${e.message}`) } finally { setPosting(false) }
  }
  const flipStep = async (r) => {
    try {
      if (r.kind === 'stop') { await toggleStep(r.id, !r.done); card.onChanged && card.onChanged() }
      else await savePs(list => list.map(x => x.id === r.id ? { ...x, done: !r.done, at: !r.done ? new Date().toISOString() : null } : x))
    } catch (e) { setStepMsg(`Could not mark it: ${e.message}`) }
  }
  // Click a step's date to set or move it; the same cap holds.
  const dateStep = async (r) => {
    const a = await stepAsk({ title: 'When Is This Step Due?', value: r.text }, r.due)
    if (!a) return
    const t = String(a.text || '').replace(/\s+/g, ' ').trim().slice(0, 300) || r.text
    try { await savePs(list => list.map(x => x.id === r.id ? { ...x, text: t, due: a.date || null } : x)) } catch (e) { setStepMsg(`Could not set the date: ${e.message}`) }
  }
  const dropStep = async (r) => {
    if (r.kind !== 'path' || !await hudConfirm({ title: 'Take This Step Off?', message: r.text, confirm: 'Take It Off', danger: true })) return
    try { await savePs(list => list.filter(x => x.id !== r.id)) } catch (e) { setStepMsg(`Could not take it off: ${e.message}`) }
  }
  const page = (
    <div className={`gp${full ? ' full' : ''}`} style={{ '--t': tone || INK_TONE, '--c': tone || INK_TONE }} role="dialog" aria-label={`Gate ${n}: ${gate.text}`}>
      <style>{CSS}</style>
      <div className="gp-in">
        {!full && <div className="gp-crumb"><button className="up" onClick={onClose}><ArrowUp size={12} /> Up</button>{up.map((u, i) => <span key={i} style={{ display: 'inline-flex', gap: 10 }}>{i > 0 && <span style={{ color: 'rgba(243,241,234,.44)' }}>›</span>}<button onClick={u.onClick || onClose}>{u.label}</button></span>)}{up.length > 0 && <span style={{ color: 'rgba(243,241,234,.44)' }}>›</span>}<button onClick={onClose}>{missionTitle}</button></div>}
        <div className="gp-head">
          <span className={`gp-ic${full ? '' : ' big'}`}><GateGlyph size={full ? 17 : 26} /></span>
          <h1><span>Gate {n} ·</span> {gate.text}{onRename && <button className="gp-pen" title="Rename" aria-label="Rename" onClick={() => onRename(gate)}><Pencil size={full ? 14 : 17} /></button>}</h1>
          <div className="gp-acts">
            {tools}
            {!tools && onLoad && <button className="gp-ic" title="Load The Mission" aria-label="Load the mission" onClick={onLoad}><LoadGlyph size={18} /></button>}
            {!tools && !gate.done && onExtract && <ExtractMarker size={44} color={tone || '#B4A3E8'} title="Extract · Close This Gate, Bank The Miles" onClick={() => onExtract(gate)} />}
          </div>
        </div>
        {/* What the gate is for (David 11/26, on a gate page that opened with only its name: "no polaris, or context. is
            this the right one?"): its done-when and what came in with it, and the mission's Polaris beside it. */}
        {!full && (doneWhen || details || polaris || onEditPolaris) && (
          <div style={{ display: 'grid', gridTemplateColumns: (doneWhen || details) && (polaris || onEditPolaris) ? 'minmax(0, 1.25fr) minmax(0, 1fr)' : '1fr', gap: 44, margin: '6px 0 26px', alignItems: 'start' }}>
            {(doneWhen || details) && (
              <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--t)', marginBottom: 7 }}>{doneWhen ? 'Done When' : 'This Gate'}</div>
                {doneWhen && <div style={{ font: "400 17px/1.5 'Lora', Georgia, serif", color: '#F3F1EA', whiteSpace: 'pre-wrap' }}>{doneWhen}</div>}
                {details && (doneWhen ? (
                  <>
                    <button type="button" onClick={() => setMore(m => !m)} aria-expanded={more} title={more ? 'Fold The Details' : 'What Came In With It'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: 0, background: 'none', border: 'none', color: 'rgba(243,241,234,.7)', font: 'inherit', fontSize: 13.5, cursor: 'pointer' }}><ChevronDown size={15} style={{ transform: more ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />What Came In With It</button>
                    {more && <div style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(243,241,234,.82)', whiteSpace: 'pre-wrap', marginTop: 8 }}>{details}</div>}
                  </>
                ) : <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(243,241,234,.86)', whiteSpace: 'pre-wrap' }}>{details}</div>)}
              </div>
            )}
            {(polaris || onEditPolaris) && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 600, color: '#8ACAFF', marginBottom: 7 }}><Star size={15} fill="#8ACAFF" />{polarisLabel}{onEditPolaris && <button className="gp-pen" style={{ paddingLeft: 4 }} title="Change The Polaris" aria-label="Change the Polaris" onClick={onEditPolaris}><Pencil size={14} /></button>}</div>
                {polaris && <div style={{ font: "italic 400 17px/1.5 'Lora', Georgia, serif", color: '#F3F1EA' }}>{polaris}</div>}
              </div>
            )}
          </div>
        )}
        {full ? (
          <div className="gp-mini">
            <span className="k">Mission Trail</span>
            <div className="st">{gates.map((g, i) => [i > 0 && <i key={`i${g.id}`} className={gates[i - 1].done ? 'd' : ''} />, <b key={g.id} className={g.id === gate.id ? 'on' : g.done ? 'd' : ''} />])}<i /><b /></div>
            <span className="k">Gate {n} Timeline</span>
            <div className="st own">{line.map((e, i) => [i > 0 && <i key={`i${i}`} className={line[i - 1].done && e.done ? 'd' : ''} />, <b key={i} className={e.done ? 'd' : ''} />])}</div>
          </div>
        ) : (
          <div className="gp-lines">
            <div className="gp-ln">
              <div className="gp-k">Mission Trail<small>{closedN} Of {gates.length} Closed</small></div>
              <SnakeLine nodes={[
                ...gates.map((g, i) => ({ key: g.id, label: `Gate ${g.n != null ? g.n : i + 1}`, sub: String(g.text).slice(0, 70), title: g.text, state: g.id === gate.id ? 'on' : g.done ? 'done' : 'open', onClick: g.id !== gate.id && onPick ? () => onPick(g) : null })),
                { key: 'polaris', label: 'Polaris', state: 'open' },
              ]} />
            </div>
            <div className="gp-ln">
              <div className="gp-k">Gate {n} Timeline{card && !gate.done && <span className="gp-pick" draggable onDragStart={e => { e.dataTransfer.setData('text/x-hud-step', 'step'); e.dataTransfer.effectAllowed = 'copy' }} onClick={addStepHere} role="button" tabIndex={0} title="Drag A Step Onto The Line, Or Click To Add One" aria-label="Add a step, or drag it onto the line"><Plus size={12} /><i />Step</span>}<small>{gate.done ? `Closed ${stamp(gate.done_at)}` : (gate.created_at || source?.at) ? days(gate.created_at || source.at) : 'Open'}</small></div>
              <SnakeLine dim onDrop={card && !gate.done ? dropOnLine : null} nodes={cardLine || line.map((e, i) => ({ key: `l${i}`, label: e.text, sub: stamp(e.at), state: e.done ? 'done' : 'open' }))} />
            </div>
          </div>
        )}
        {card && (
          <div className="gp-two">
            <div className="gp-card">
              <div className="gp-ch">Steps<button type="button" className="gp-ic sm" title="Add A Step" aria-label="Add a step" onClick={addStepHere}><Plus size={14} /></button></div>
              {stepRows.map(r => (
                <div key={r.key} className={`gp-st${r.done ? ' done' : ''}`}>
                  <button type="button" className="gp-o" title={r.done ? 'Done · Click To Reopen' : 'Click When It Is Done'} aria-label={`${r.done ? 'Reopen' : 'Mark done'}: ${r.text}`} onClick={() => flipStep(r)}>{r.done && <Check size={11} />}</button>
                  <span>{r.text}</span>
                  {r.kind === 'path' && (r.due || !r.done) && (() => { const w = r.due ? dueWords(r.due) : null, over = r.due && gateDue && r.due > gateDue; return <button type="button" className={`gp-due${r.due ? ' set' : ''}${!r.done && (w?.late || over) ? ' late' : ''}`} title={over ? `After The Gate's Target, ${shortDay(gateDue)}` : r.due ? 'Move The Date' : 'Set A Target Date'} aria-label={r.due ? `Target ${r.due}, move it` : 'Set a target date'} disabled={r.done} onClick={() => dateStep(r)}>{r.due ? shortDay(r.due) : <CalendarDays size={13} />}</button> })()}
                  {r.kind === 'path' && !r.done && <button type="button" className="gp-x" title="Take It Off" aria-label={`Take off: ${r.text}`} onClick={() => dropStep(r)}><XMark size={13} /></button>}
                </div>
              ))}
              {stepMsg && <div className="gp-msg">{stepMsg}</div>}
            </div>
            <div className="gp-card">
              <div className="gp-ch">Notes<button type="button" className={`gp-ic sm${posting ? ' gp-busy' : ''}${posted && !posted.faded ? ' on' : ''}`} style={{ marginLeft: 'auto' }} title="Process And Post" aria-label="Process and post: Lumen summarizes this on the timeline and catches what needs a follow-up" onClick={process} disabled={posting || !notes.trim()}>{posted && !posted.faded ? <Check size={14} /> : <Sparkles size={14} />}</button>{(card.meetings || []).length > 0 && <button type="button" className="gp-ic sm" title="Meeting Notes" aria-label="Open the meeting notes" style={{ marginLeft: 0 }} onClick={() => card.onOpenNotes && card.onOpenNotes()}><ListTree size={14} /></button>}</div>
              <textarea className="gp-notes" rows={4} value={notes} onChange={e => setNotes(e.target.value)} onBlur={() => { const v = notes.trim(); if (v !== String(card.obj?.notes || '').trim()) card.onSaveNotes && card.onSaveNotes(v || null) }} aria-label="Notes on this gate" />
              {posted && <div className={`gp-posted${posted.faded ? ' faded' : ''}`}><b>Posted To The Timeline</b> · {posted.n ? `${posted.n} Caught` : 'Nothing To Catch'}<small>{posted.summary}</small></div>}
              {(card.meetings || []).slice(0, 4).map(m => <button type="button" key={m.id} className="gp-mt" onClick={() => card.onOpenNotes && card.onOpenNotes()}>{m.title}<small>{m.meeting_date ? new Date(`${String(m.meeting_date).slice(0, 10)}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</small></button>)}
            </div>
          </div>
        )}
        {card && catches.length > 0 && (
          <div className="gp-card gp-catches">
            <div className="gp-ch">Items<span className="gp-cn">{catches.length}</span></div>
            {catches.map(c => (
              <div key={c.id} className="gp-st">
                <span className="gp-catch" role="button" tabIndex={0} title="Reconcile It With Lumen" onClick={() => setTalk(c)} onKeyDown={e => { if (e.key === 'Enter') setTalk(c) }}>{c.what}<small>{[c.heard, c.by ? `Due ${new Date(`${c.by}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : null].filter(Boolean).join(' · ')}</small></span>
                <button type="button" className="gp-ic sm" title="Done" aria-label={`Done: ${c.what}`} onClick={async () => { await ruleCommitment(c.id, 'done'); loadCatches() }}><Check size={13} /></button>
                <button type="button" className="gp-ic sm" style={{ '--c': '#DE7E6E' }} title="Close As Irrelevant" aria-label={`Close as irrelevant: ${c.what}`} onClick={async () => { const why = await hudPrompt({ title: 'Why Is It Irrelevant?', placeholder: 'A few words; Lumen learns from it' }); if (why !== null) { await ruleCommitment(c.id, 'dropped', why || null); loadCatches() } }}><XMark size={13} /></button>
              </div>
            ))}
          </div>
        )}
        {talk && <CatchTalk c={talk} onClose={() => setTalk(null)} onRuled={() => { setTalk(null); loadCatches() }} />}
        <div className="gp-bench">
          <div className="gp-benchhead">{view === 'files' ? 'Files' : 'Workbench'}
            <span style={{ order: 2, display: 'inline-flex', gap: 6 }}>
              {(filesFor != null || filesNote) && <button className={`gp-sq${view === 'bench' ? ' on' : ''}`} title="Workbench" aria-label="Workbench" aria-pressed={view === 'bench'} onClick={() => setView('bench')}><PenLine size={15} /></button>}
              {(filesFor != null || filesNote) && <button className={`gp-sq${view === 'files' ? ' on' : ''}`} title="Files" aria-label="Files" aria-pressed={view === 'files'} onClick={() => setView('files')}><FolderOpen size={15} /></button>}
              {onTrail && <button className="gp-sq" title="Trail, Steps And Notes" aria-label="The gate's trail, steps and notes" onClick={onTrail}><ListTree size={15} /></button>}
            </span>
          </div>
          {view === 'bench' && ready && <WorkbenchSheet key={groot} root={groot} scopes={filesFor != null ? [{ objectiveId: filesFor, label: null }] : []} />}
          {view === 'files' && filesFor != null && <CardFiles key={`gate-files:${filesFor}`} objectiveId={filesFor} />}
          {view === 'files' && filesFor == null && filesNote && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '18px 2px', fontSize: 14.5, lineHeight: 1.6, color: 'rgba(243,241,234,.72)' }}>
              <span>{filesNote.text}</span>
              {filesNote.go && <button className="gp-sq" style={{ width: 'auto', padding: '0 12px', gap: 7, display: 'inline-flex', alignItems: 'center' }} title={filesNote.label} aria-label={filesNote.label} onClick={filesNote.go}><FolderOpen size={14} />{filesNote.label}</button>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
  return createPortal(page, host)
}
