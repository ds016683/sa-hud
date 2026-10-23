import { useState, useEffect, useCallback } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { readArtifact, writeArtifact } from '../../lib/artifacts'
import { Waterfall, ItemModal } from '../ClientsPage'
import { MMA_DOMAINS, PROGRAM_LANE, PLAN_LANES, PLAN_VIEWS } from '../../constants/domains'
import { INK, INK2, GRAY, LABEL, MUTED, NAVY_DEEP, PANEL_BORDER, BLUE, RED, MONO, SERIF, SubLabel } from './canon'

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
          <button key={d.id} onClick={() => onPick && onPick(on ? null : d.id)} title={d.line} style={{ textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 10, padding: '10px 11px', background: on ? `${d.color}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? d.color : PANEL_BORDER}`, borderTop: `3px solid ${d.color}`, color: INK, display: 'grid', gap: 6 }}>
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

export default function PlanningCanvas({ project }) {
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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
  const saveItem = (d) => persist(d.id ? items.map(i => i.id === d.id ? { ...i, ...d, updated_at: new Date().toISOString() } : i) : [...items, { ...d, position: items.length }])
  const deleteItem = (it) => persist(items.filter(i => i.id !== it.id))
  const moveItem = (it, patch) => persist(items.map(i => i.id === it.id ? { ...i, ...patch } : i))
  const shown = pick ? items.filter(i => i.lane === pick || i.lane === PROGRAM_LANE.id) : items
  const counts = Object.fromEntries(MMA_DOMAINS.map(d => [d.id, items.filter(i => i.lane === d.id).length]))
  const v = PLAN_VIEWS.find(x => x.id === view)
  const subtitle = (it) => (it[v.field] ? it[v.field] : (view === 'strategy' ? it.date_label : ''))

  return (
    <div style={{ display: 'grid', gap: 14 }}>
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
    </div>
  )
}
