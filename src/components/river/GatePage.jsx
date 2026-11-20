// A gate's own page (David 11/19: "i'm trying to get to a gate's specific page so i can pull up lumen and work
// through each gate, in the gate's environment, while watching the mission play out on the main mission timeline
// and the gates own personal timeline"; on the mock-up: "all gates will look like this? wire it up and let me play
// with it live"). The mission's trail and the gate's own timeline across the top, the gate's own Workbench under
// them (its tabs live under <card root>/gates/<gate id>), and the card's Lumen framed on the gate while it is open.
// The Workbench pulls up full: the header and the two lines fold to one strip.
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, ArrowUp, ListTree, PenLine, FolderOpen } from 'lucide-react'
import CardFiles from './CardFiles'
import WorkbenchSheet from './WorkbenchSheet'
import { listPages, readPage, writePage, slugify } from '../../lib/workspace'
import { setGateView } from '../../lib/gateView'

export const GateGlyph = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20V10a7 7 0 0 1 14 0v10M3 20h18M9.5 20v-8M12 20V9M14.5 20v-8" /></svg>
export const LoadGlyph = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
export const ExtractGlyph = ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20V9M7 14l5-5 5 5M5 4h14" /></svg>

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
.gp-ln + .gp-ln .gp-tr, .gp-mini .st.own { opacity: .62; }
.gp-k { font: 500 16px 'Lora', Georgia, serif; } .gp-k small { display: block; font: 400 12.5px var(--font-sans, 'Instrument Sans', sans-serif); color: rgba(243,241,234,.7); margin-top: 3px; }
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

// gate: the step ({ id, text, n, done, done_at, created_at }); gates: every gate on the card, in order.
export default function GatePage({ benchRoot = null, tools = null, filesFor = null, onTrail = null, tone = null, gate, gates, root, missionTitle, up = [], source = null, onClose, onPick, onRename, onExtract, onLoad }) {
  const full = false   // the Workbench's own button takes it to full screen now
  const [view, setView] = useState('bench')   // 'bench' | 'files'
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
      if (on) { setTabs(pages); setReady(true) }
    }
    run()
    return () => { on = false }
  }, [groot, root, gate.id, gate.n, gate.text])
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
            {!tools && !gate.done && onExtract && <button className="gp-ic" title="Extract: Close This Gate" aria-label="Close this gate" onClick={() => onExtract(gate)}><ExtractGlyph size={18} /></button>}
          </div>
        </div>
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
              <div className="gp-tr">
                {gates.map((g, i) => <button key={g.id} className={`gp-nd${g.id === gate.id ? ' on' : g.done ? ' d' : ''}${g.done ? ' thru' : ''}`} onClick={() => g.id !== gate.id && onPick && onPick(g)} title={g.text}><b /><span>Gate {g.n != null ? g.n : i + 1}<small>{String(g.text).slice(0, 60)}</small></span></button>)}
                <div className="gp-nd" style={{ flex: '0 0 90px' }}><b /><span>Polaris</span></div>
              </div>
            </div>
            <div className="gp-ln">
              <div className="gp-k">Gate {n} Timeline<small>{gate.done ? `Closed ${stamp(gate.done_at)}` : (gate.created_at || source?.at) ? days(gate.created_at || source.at) : 'Open'}</small></div>
              <div className="gp-tr">
                {line.map((e, i) => <div key={i} className={`gp-nd${e.done ? ' d' : ''}${e.done && line[i + 1]?.done ? ' thru' : ''}`} style={i === line.length - 1 ? { flex: '0 0 90px' } : undefined}><b /><span>{e.text}<small>{stamp(e.at)}</small></span></div>)}
              </div>
            </div>
          </div>
        )}
        <div className="gp-bench">
          <div className="gp-benchhead">{view === 'files' ? 'Files' : 'Workbench'}
            <span style={{ order: 2, display: 'inline-flex', gap: 6 }}>
              {filesFor != null && <button className={`gp-sq${view === 'bench' ? ' on' : ''}`} title="Workbench" aria-label="Workbench" aria-pressed={view === 'bench'} onClick={() => setView('bench')}><PenLine size={15} /></button>}
              {filesFor != null && <button className={`gp-sq${view === 'files' ? ' on' : ''}`} title="Files" aria-label="Files" aria-pressed={view === 'files'} onClick={() => setView('files')}><FolderOpen size={15} /></button>}
              {onTrail && <button className="gp-sq" title="Trail, Steps And Notes" aria-label="The gate's trail, steps and notes" onClick={onTrail}><ListTree size={15} /></button>}
            </span>
          </div>
          {view === 'bench' && ready && <WorkbenchSheet key={groot} root={groot} scopes={filesFor != null ? [{ objectiveId: filesFor, label: null }] : []} />}
          {view === 'files' && filesFor != null && <CardFiles key={`gate-files:${filesFor}`} objectiveId={filesFor} />}
        </div>
      </div>
    </div>
  )
  return createPortal(page, host)
}
