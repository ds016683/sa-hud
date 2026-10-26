// Dev harness: the seven identities and the plan waterfall with the October 19 record, no sign-in.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waterfall, ItemModal } from '../src/components/ClientsPage'
import { DomainStrip, DomainsSurface, DomainFlowSurface } from '../src/components/river/PlanningCanvas'
import { MMA_DOMAINS, PLAN_LANES, PLAN_VIEWS } from '../src/constants/domains'
import seedDoc from '../public/plans/mma-2027-program-plan.json'

const client = { key: 'Client.MMA.Renewal', short: 'Plan', lanes: PLAN_LANES }
// ?d=N opens domain N's flow surface at the top (default 1, Data Production).
const DOM = MMA_DOMAINS[Math.max(0, Math.min(MMA_DOMAINS.length - 1, Number(new URLSearchParams(window.location.search).get('d') || 1) - 1))]
function App() {
  const [items, setItems] = useState(seedDoc.items)
  const [view, setView] = useState('strategy'); const [mode, setMode] = useState('simple'); const [pick, setPick] = useState(null); const [modal, setModal] = useState(null)
  const v = PLAN_VIEWS.find(x => x.id === view)
  const shown = pick ? items.filter(i => i.lane === pick || i.lane === 'Program') : items
  const pill = (on) => ({ padding: '5px 14px', borderRadius: 999, background: on ? '#A9C9E8' : 'transparent', color: on ? '#0E2336' : '#EAF1F8', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' })
  return (
    <div style={{ maxWidth: 1100, boxSizing: 'border-box', margin: '0 auto', padding: 24, color: '#EAF1F8', fontFamily: 'Instrument Sans, system-ui, sans-serif', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 14 }}>
      <DomainFlowSurface dom={DOM} data={(seedDoc.domains || {})[DOM.id] || {}} onSave={() => {}} busy={false} />
      <DomainsSurface domains={{}} onSave={() => {}} busy={false} />
      <DomainStrip counts={Object.fromEntries(MMA_DOMAINS.map(d => [d.id, items.filter(i => i.lane === d.id).length]))} active={pick} onPick={setPick} />
      <div style={{ display: 'flex', gap: 6 }}>{PLAN_VIEWS.map(x => <button key={x.id} onClick={() => setView(x.id)} style={pill(view === x.id)}>{x.label}</button>)}<span style={{ width: 12 }} />{['simple', 'detailed'].map(m => <button key={m} onClick={() => setMode(m)} style={pill(mode === m)}>{m}</button>)}</div>
      <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: 16 }}>
        <Waterfall client={client} items={shown} view={mode} subtitleOf={mode === 'detailed' ? (it) => it[v.field] || it.date_label : undefined} onOpen={(it) => setModal({ item: it })} onAdd={(lane) => setModal({ item: { lane } })} onMove={(it, patch) => setItems(prev => prev.map(i => i.id === it.id ? { ...i, ...patch } : i))} onDraft={(lane, start_date) => setModal({ item: { lane, start_date } })} />
      </div>
      {modal && <ItemModal client={client} item={modal.item} busy={false} extended onClose={() => setModal(null)} onSave={(d) => { setItems(prev => d.id ? prev.map(i => i.id === d.id ? { ...i, ...d } : i) : [...prev, { ...d, id: `n${prev.length}` }]); setModal(null) }} onDelete={(it) => { setItems(prev => prev.filter(i => i.id !== it.id)); setModal(null) }} />}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
export default App
