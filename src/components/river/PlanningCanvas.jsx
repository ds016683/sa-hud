import { Fragment, useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw, Save, ChevronRight, X } from 'lucide-react'
import { readArtifact, writeArtifact } from '../../lib/artifacts'
import { Waterfall, ItemModal } from '../ClientsPage'
import { MMA_DOMAINS, PROGRAM_LANE, PLAN_LANES, PLAN_VIEWS } from '../../constants/domains'
import { INK, INK2, GRAY, LABEL, MUTED, NAVY_DEEP, PANEL_BORDER, BLUE, GREEN, RED, MONO, SERIF, SubLabel, alpha } from './canon'

// =============================================================================
// Planning (David, 10/23): the strategy planning waterfall on the Mission Card,
// one canvas that toggles between Strategy, Ops, and Budget views. Lanes are
// the seven domains plus the Program lane. Items live in the mission's
// program-plan artifact; the artifact ports back to the Master Tracker later.
// =============================================================================
const SLUG = 'program-plan'
const btnPrimary = { background: BLUE, color: NAVY_DEEP, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }
const btnGhost = { background: 'rgba(255,255,255,0.05)', color: INK, border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }
const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)

function Pill({ active, children, onClick, title }) {
  return <button onClick={onClick} title={title} style={{ padding: '5px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', background: active ? BLUE : 'transparent', color: active ? NAVY_DEEP : INK2, border: active ? `1px solid ${BLUE}` : `1px solid ${PANEL_BORDER}` }}>{children}</button>
}

// The seven identities, as a strip above the canvas.
export function DomainStrip({ counts = {}, active, onPick }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
      {MMA_DOMAINS.map(d => {
        const Icon = d.icon; const on = active === d.id
        return (
          <button key={d.id} onClick={() => onPick && onPick(on ? null : d.id)} title={d.line} style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 10, padding: '10px 11px', background: on ? `${alpha(d.color, 13)}` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? d.color : PANEL_BORDER}`, borderTop: `3px solid ${d.color}`, color: INK, display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 26, height: 26, borderRadius: 7, background: d.color, color: NAVY_DEEP, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={14} /></span>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: d.color }}>{d.code} · {d.n}</span>
              <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10, color: MUTED }}>{counts[d.id] || 0}</span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{d.id}</div>
          </button>
        )
      })}
    </div>
  )
}

// 2027 Domains (David, 10/24): the first surface. Each domain with its chosen
// iconography, its name, its definition, and a place for the TH Lead and the
// MMA Lead. Definitions and leads are saved on the plan artifact (doc.domains).
export function DomainsSurface({ domains = {}, onSave, busy, onOpen }) {
  const [d, setD] = useState(domains)
  const [dirty, setDirty] = useState(false)
  useEffect(() => { let on = true; Promise.resolve().then(() => { if (on) { setD(domains); setDirty(false) } }); return () => { on = false } }, [domains])
  const get = (id, k, fallback = '') => (d[id] && d[id][k] != null ? d[id][k] : fallback)
  const set = (id, k) => (e) => { setD(prev => ({ ...prev, [id]: { ...(prev[id] || {}), [k]: e.target.value } })); setDirty(true) }
  const input = { width: '100%', minWidth: 0, padding: '7px 9px', borderRadius: 7, border: `1px solid ${PANEL_BORDER}`, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', color: INK }
  const eyebrow = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <SubLabel style={{ marginBottom: 2 }}>2027 Domains</SubLabel>
          <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>The seven domains of the 2027 work: the construct for the contract and for how the work is managed. Iconography, name, definition, and the lead on each side.</div>
        </div>
        <button onClick={() => onSave(d)} disabled={!dirty || busy} style={{ ...btnPrimary, opacity: dirty ? 1 : 0.5 }}><Save size={13} /> {busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
      </div>
      <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '56px minmax(150px, 1.1fr) minmax(240px, 2.2fr) minmax(130px, 1fr) minmax(130px, 1fr)', gap: 0, border: `1px solid ${PANEL_BORDER}`, borderRadius: 12, overflow: 'hidden', minWidth: 760 }}>
        {['', 'Domain', 'Definition', 'TH Lead', 'MMA Lead'].map((h, i) => <div key={i} style={{ ...eyebrow, padding: '10px 12px', background: 'rgba(255,255,255,0.04)', borderBottom: `1px solid ${PANEL_BORDER}` }}>{h}</div>)}
        {MMA_DOMAINS.map((dom, i) => {
          const Icon = dom.icon; const last = i === MMA_DOMAINS.length - 1
          const cell = { padding: '12px 12px', minWidth: 0, borderBottom: last ? 'none' : `1px solid ${PANEL_BORDER}`, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'flex-start' }
          return (
            <Fragment key={dom.id}>
              <button onClick={() => onOpen && onOpen(dom.id)} title={`Open ${dom.id}`} style={{ ...cell, alignItems: 'center', justifyContent: 'center', borderLeft: `3px solid ${dom.color}`, background: 'none', border: 'none', borderBottom: cell.borderBottom, cursor: 'pointer' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: dom.color, color: NAVY_DEEP, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon size={17} /></span>
              </button>
              <button onClick={() => onOpen && onOpen(dom.id)} title={`Open ${dom.id}`} style={{ ...cell, background: 'none', border: 'none', borderBottom: cell.borderBottom, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: dom.color }}>{dom.code} · {dom.n}</span>
                <span style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 500, color: INK, lineHeight: 1.2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>{dom.id} <ChevronRight size={14} color={MUTED} /></span>
              </button>
              <div style={cell}>
                <textarea value={get(dom.id, 'definition', dom.line)} onChange={set(dom.id, 'definition')} rows={3} style={{ ...input, resize: 'vertical', lineHeight: 1.45 }} />
              </div>
              <div style={cell}><input value={get(dom.id, 'th_lead')} onChange={set(dom.id, 'th_lead')} placeholder="Name" style={input} /></div>
              <div style={cell}><input value={get(dom.id, 'mma_lead')} onChange={set(dom.id, 'mma_lead')} placeholder="Name" style={input} /></div>
            </Fragment>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// A domain's flow (David, 10/24): one Polaris statement for the domain; the
// key things that need to be true by different times in the year (the
// strategy, a lexicon for the work); under each truth, the big things that
// have to happen for it to be true, each with one accountable person; and
// how we measure the thing being true. The Operations view explodes each big
// thing into a little project planner: tasks, people, data-related costs.
// The Budget face comes later.
const blankTruth = () => ({ id: newId(), anchor: '', label: '', text: '', measure: '', big: [] })
const blankBig = () => ({ id: newId(), text: '', accountable: '', people: '', data_costs: '', tasks: [] })
const blankTask = () => ({ id: newId(), text: '', owner: '', due: '', done: false })
const FLOW_VIEWS = [{ id: 'strategy', label: 'Strategy' }, { id: 'ops', label: 'Operations' }]

export function DomainFlowSurface({ dom, data = {}, onSave, busy }) {
  const [polaris, setPolaris] = useState(data.polaris || '')
  const [truths, setTruths] = useState(data.truths || [])
  const [dirty, setDirty] = useState(false)
  const [anchor, setAnchor] = useState('all')
  const [view, setView] = useState('strategy')
  const [open, setOpen] = useState({})   // big thing id -> expanded in Operations
  useEffect(() => { let on = true; Promise.resolve().then(() => { if (on) { setTruths(data.truths || []); setPolaris(data.polaris || ''); setDirty(false) } }); return () => { on = false } }, [data.truths, data.polaris])
  const patch = (fn) => { setTruths(prev => fn(prev)); setDirty(true) }
  const setT = (id, k, v) => patch(prev => prev.map(t => t.id === id ? { ...t, [k]: v } : t))
  const setB = (tid, bid, k, v) => patch(prev => prev.map(t => t.id === tid ? { ...t, big: t.big.map(b => b.id === bid ? { ...b, [k]: v } : b) } : t))
  const setK = (tid, bid, kid, k, v) => patch(prev => prev.map(t => t.id === tid ? { ...t, big: t.big.map(b => b.id === bid ? { ...b, tasks: b.tasks.map(x => x.id === kid ? { ...x, [k]: v } : x) } : b) } : t))
  const input = { width: '100%', minWidth: 0, padding: '6px 8px', borderRadius: 7, border: `1px solid ${PANEL_BORDER}`, fontSize: 12.5, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', color: INK }
  const eyebrow = { fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL }
  const labels = [...new Set(truths.map(t => t.label).filter(Boolean))]
  const shown = truths.filter(t => anchor === 'all' || t.label === anchor).sort((a, b) => String(a.anchor || '9999').localeCompare(String(b.anchor || '9999')))
  const Icon = dom.icon
  const ops = view === 'ops'
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ width: 38, height: 38, borderRadius: 10, background: dom.color, color: NAVY_DEEP, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Icon size={19} /></span>
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: dom.color }}>{dom.code} · {dom.n}</div>
          <div style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 500, color: INK, lineHeight: 1.2 }}>{dom.id}</div>
          <div style={{ ...eyebrow, marginTop: 8 }}>Polaris Objective</div>
          <textarea value={polaris} onChange={e => { setPolaris(e.target.value); setDirty(true) }} rows={2} placeholder="At the end of 2027, Third Horizon will have…" style={{ ...input, fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.4, resize: 'vertical', marginTop: 4 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <button onClick={() => patch(prev => [...prev, blankTruth()])} style={btnGhost}><Plus size={12} /> Truth</button>
          <button onClick={() => onSave({ ...data, polaris, truths })} disabled={!dirty || busy} style={{ ...btnPrimary, opacity: dirty ? 1 : 0.5 }}><Save size={13} /> {busy ? 'Saving…' : dirty ? 'Save' : 'Saved'}</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {FLOW_VIEWS.map(x => <Pill key={x.id} active={view === x.id} onClick={() => setView(x.id)}>{x.label}</Pill>)}
        <span style={{ width: 1, height: 18, background: PANEL_BORDER, margin: '0 4px' }} />
        <span style={{ ...eyebrow, marginRight: 2 }}>By When</span>
        <Pill active={anchor === 'all'} onClick={() => setAnchor('all')}>All · {truths.length}</Pill>
        {labels.map(l => <Pill key={l} active={anchor === l} onClick={() => setAnchor(l)}>{l}</Pill>)}
      </div>
      {shown.length === 0 && <div style={{ fontSize: 12.5, color: GRAY, padding: '14px 0' }}>No truths yet. Add the first one: a thing that will be verifiably true by a time in the year.</div>}
      {shown.map(t => (
        <div key={t.id} style={{ border: `1px solid ${PANEL_BORDER}`, borderLeft: `3px solid ${dom.color}`, borderRadius: 10, padding: '12px 14px', display: 'grid', gap: 10, background: 'rgba(255,255,255,0.025)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '150px minmax(0, 1fr) auto', gap: 10, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={eyebrow}>By When</span>
              <input value={t.label} onChange={e => setT(t.id, 'label', e.target.value)} placeholder="e.g. By Nov 30" style={{ ...input, fontFamily: MONO, fontSize: 11, letterSpacing: '0.6px', color: dom.color }} />
              <input type="date" value={t.anchor || ''} onChange={e => setT(t.id, 'anchor', e.target.value)} style={{ ...input, fontSize: 11 }} />
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
              <span style={eyebrow}>What Must Be True</span>
              <textarea value={t.text} onChange={e => setT(t.id, 'text', e.target.value)} rows={2} placeholder="One sentence, verifiable" style={{ ...input, fontFamily: SERIF, fontSize: 15, lineHeight: 1.35, resize: 'vertical' }} />
              <span style={{ ...eyebrow, marginTop: 4 }}>How We Measure It Being True</span>
              <input value={t.measure} onChange={e => setT(t.id, 'measure', e.target.value)} placeholder="The evidence that settles it" style={input} />
            </div>
            <button onClick={() => patch(prev => prev.filter(x => x.id !== t.id))} title="Remove this truth" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 4 }}><X size={14} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: ops ? '20px minmax(220px, 2fr) minmax(130px, 1fr) 24px' : 'minmax(220px, 2fr) minmax(130px, 1fr) 24px', gap: 8, alignItems: 'center' }}>
            {ops && <span />}<span style={eyebrow}>The Big Things That Have To Happen</span><span style={eyebrow}>Accountable</span><span />
            {(t.big || []).map(b => (
              <Fragment key={b.id}>
                {ops && <button onClick={() => setOpen(o => ({ ...o, [b.id]: !o[b.id] }))} title={open[b.id] ? 'Fold' : 'Explode into tasks'} style={{ background: 'none', border: 'none', color: dom.color, cursor: 'pointer', padding: 0, transform: open[b.id] ? 'rotate(90deg)' : 'none', transition: 'transform 120ms' }}><ChevronRight size={14} /></button>}
                <input value={b.text} onChange={e => setB(t.id, b.id, 'text', e.target.value)} placeholder="A big thing, in one line" style={input} />
                <input value={b.accountable} onChange={e => setB(t.id, b.id, 'accountable', e.target.value)} placeholder="One name" style={input} />
                <button onClick={() => patch(prev => prev.map(x => x.id === t.id ? { ...x, big: x.big.filter(y => y.id !== b.id) } : x))} title="Remove" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                {ops && open[b.id] && (
                  <div style={{ gridColumn: '1 / -1', marginLeft: 28, padding: '10px 12px', borderRadius: 8, border: `1px dashed ${PANEL_BORDER}`, display: 'grid', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 8 }}>
                      <label style={{ display: 'grid', gap: 3 }}><span style={eyebrow}>People</span><input value={b.people || ''} onChange={e => setB(t.id, b.id, 'people', e.target.value)} placeholder="Who works it, how much of them" style={input} /></label>
                      <label style={{ display: 'grid', gap: 3 }}><span style={eyebrow}>Data-Related Costs</span><input value={b.data_costs || ''} onChange={e => setB(t.id, b.id, 'data_costs', e.target.value)} placeholder="Sources, compute, licenses" style={input} /></label>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) minmax(110px, 1fr) 128px 24px 22px', gap: 6, alignItems: 'center' }}>
                      <span style={eyebrow}>Task</span><span style={eyebrow}>Who</span><span style={eyebrow}>Due</span><span style={{ ...eyebrow, textAlign: 'center' }}>Done</span><span />
                      {(b.tasks || []).map(k => (
                        <Fragment key={k.id}>
                          <input value={k.text} onChange={e => setK(t.id, b.id, k.id, 'text', e.target.value)} placeholder="The task" style={{ ...input, opacity: k.done ? 0.6 : 1, textDecoration: k.done ? 'line-through' : 'none' }} />
                          <input value={k.owner} onChange={e => setK(t.id, b.id, k.id, 'owner', e.target.value)} placeholder="Name" style={input} />
                          <input type="date" value={k.due || ''} onChange={e => setK(t.id, b.id, k.id, 'due', e.target.value)} style={{ ...input, fontSize: 11 }} />
                          <input type="checkbox" checked={!!k.done} onChange={e => setK(t.id, b.id, k.id, 'done', e.target.checked)} style={{ justifySelf: 'center', accentColor: dom.color }} />
                          <button onClick={() => patch(prev => prev.map(x => x.id === t.id ? { ...x, big: x.big.map(y => y.id === b.id ? { ...y, tasks: y.tasks.filter(z => z.id !== k.id) } : y) } : x))} title="Remove" style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', padding: 2 }}><X size={12} /></button>
                        </Fragment>
                      ))}
                      <button onClick={() => patch(prev => prev.map(x => x.id === t.id ? { ...x, big: x.big.map(y => y.id === b.id ? { ...y, tasks: [...(y.tasks || []), blankTask()] } : y) } : x))} style={{ ...btnGhost, padding: '3px 8px', fontSize: 11, justifySelf: 'start', gridColumn: '1 / -1' }}><Plus size={11} /> Task</button>
                    </div>
                  </div>
                )}
              </Fragment>
            ))}
            <button onClick={() => patch(prev => prev.map(x => x.id === t.id ? { ...x, big: [...(x.big || []), blankBig()] } : x))} style={{ ...btnGhost, padding: '4px 9px', fontSize: 11, justifySelf: 'start', gridColumn: '1 / -1' }}><Plus size={11} /> Big Thing</button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PlanningCanvas({ project }) {
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [surface, setSurface] = useState('domains')
  const [view, setView] = useState('strategy')
  const [mode, setMode] = useState('simple')
  const [pick, setPick] = useState(null)
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState(false)
  const client = { key: project.key, short: 'Plan', lanes: PLAN_LANES }

  const load = useCallback(async () => {
    await Promise.resolve()   // off the effect's synchronous path
    setLoading(true); setError(null)
    try { const d = await readArtifact(project.id, SLUG); setDoc(d); setItems(Array.isArray(d?.items) ? d.items : []) }
    catch (e) { if (/not found|404|400/i.test(String(e.message))) { setDoc(null); setItems([]) } else setError(e.message) }
    finally { setLoading(false) }
  }, [project.id])
  useEffect(() => { load() }, [load])

  const persist = async (next) => {
    setBusy(true); setError(null)
    try {
      const d = { ...(doc || {}), title: 'Program Plan', kind: 'plan', lanes: PLAN_LANES.map(l => l.id), items: next.map((it, i) => ({ position: i, notes: '', links: [], ...it, id: it.id || newId() })) }
      await writeArtifact(project.id, SLUG, d); setDoc(d); setItems(d.items); setModal(null)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const saveDomains = async (domains) => {
    setBusy(true); setError(null)
    try { const d = { ...(doc || {}), title: 'Program Plan', kind: 'plan', lanes: PLAN_LANES.map(l => l.id), items, domains }; await writeArtifact(project.id, SLUG, d); setDoc(d) }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const saveItem = (d) => persist(d.id ? items.map(i => i.id === d.id ? { ...i, ...d, updated_at: new Date().toISOString() } : i) : [...items, { ...d, position: items.length }])
  const deleteItem = (it) => persist(items.filter(i => i.id !== it.id))
  const moveItem = (it, patch) => persist(items.map(i => i.id === it.id ? { ...i, ...patch } : i))
  const shown = pick ? items.filter(i => i.lane === pick || i.lane === PROGRAM_LANE.id) : items
  const counts = Object.fromEntries(MMA_DOMAINS.map(d => [d.id, items.filter(i => i.lane === d.id).length]))
  const openDom = surface.startsWith('domain:') ? MMA_DOMAINS.find(d => d.id === surface.slice(7)) || null : null
  const v = PLAN_VIEWS.find(x => x.id === view)
  const subtitle = (it) => (it[v.field] ? it[v.field] : (view === 'strategy' ? it.date_label : ''))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      {/* Surfaces: tabs for the work we take somewhere else (David, 10/24). */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${PANEL_BORDER}` }}>
        <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1.4px', textTransform: 'uppercase', color: LABEL, marginRight: 6 }}>Surfaces</span>
        <Pill active={surface === 'domains'} onClick={() => setSurface('domains')}>2027 Domains</Pill>
        <Pill active={surface === 'plan'} onClick={() => setSurface('plan')}>Program Plan</Pill>
        {openDom && <Pill active={surface === `domain:${openDom.id}`} onClick={() => setSurface(`domain:${openDom.id}`)}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 2, background: openDom.color, marginRight: 6, verticalAlign: '1px' }} />{openDom.id}</Pill>}
      </div>
      {error && surface !== 'plan' && <div style={{ fontSize: 12.5, color: RED }}>{error}</div>}
      {surface === 'domains' && <DomainsSurface domains={doc?.domains || {}} onSave={saveDomains} busy={busy} onOpen={(id) => setSurface(`domain:${id}`)} />}
      {openDom && surface === `domain:${openDom.id}` && <DomainFlowSurface dom={openDom} data={(doc?.domains || {})[openDom.id] || {}} busy={busy} onSave={(d) => saveDomains({ ...(doc?.domains || {}), [openDom.id]: d })} />}
      {surface === 'plan' && (<>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <SubLabel style={{ marginBottom: 2 }}>Program Plan</SubLabel>
          <div style={{ fontSize: 12.5, color: INK2, lineHeight: 1.5 }}>One waterfall, three views. Strategy reads each item's objective, Ops who runs it and how often, Budget what it costs. Lanes are the seven domains plus the Program lane. Click a domain to focus it; drag an item to move its day or lane; double-click empty space to draft one.</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={load} style={btnGhost} title="Read the plan again"><RefreshCw size={12} /></button>
          <button onClick={() => setModal({ item: { lane: pick || MMA_DOMAINS[0].id } })} style={btnPrimary}><Plus size={13} /> Add A Plan Item</button>
        </div>
      </div>
      <DomainStrip counts={counts} active={pick} onPick={setPick} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {PLAN_VIEWS.map(x => <Pill key={x.id} active={view === x.id} onClick={() => setView(x.id)} title={x.hint}>{x.label}</Pill>)}
        <span style={{ width: 1, height: 18, background: PANEL_BORDER, margin: '0 4px' }} />
        <Pill active={mode === 'simple'} onClick={() => setMode('simple')}>Simple</Pill>
        <Pill active={mode === 'detailed'} onClick={() => setMode('detailed')}>Detailed</Pill>
        {pick && <span style={{ marginLeft: 8, fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: LABEL, textTransform: 'uppercase' }}>Focused on {pick} · Program lane kept</span>}
      </div>
      {error && <div style={{ fontSize: 12.5, color: RED }}>{error}</div>}
      {loading && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1.4px', color: GRAY }}>READING THE PLAN…</div>}
      {!loading && items.length === 0 && (
        <div style={{ textAlign: 'center', padding: '26px 0 18px', border: `1px dashed ${PANEL_BORDER}`, borderRadius: 12 }}>
          <div style={{ fontFamily: SERIF, fontSize: 15, color: INK, marginBottom: 6 }}>The canvas is empty.</div>
          <div style={{ fontSize: 12.5, color: GRAY }}>Add the first item, or a session loads the October 19 record onto it.</div>
        </div>
      )}
      {!loading && items.length > 0 && (
        <Waterfall client={client} items={shown} view={mode} subtitleOf={mode === 'detailed' ? subtitle : undefined} onOpen={(it) => setModal({ item: it })} onAdd={(lane) => setModal({ item: { lane } })} onMove={moveItem} onDraft={(lane, start_date) => setModal({ item: { lane, start_date } })} />
      )}
      {modal && <ItemModal client={client} item={modal.item} busy={busy} extended onClose={() => setModal(null)} onSave={saveItem} onDelete={deleteItem} />}
      </>)}
    </div>
  )
}
