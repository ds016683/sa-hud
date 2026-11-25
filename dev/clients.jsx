// Dev harness: the client's program timeline (a tab on the Client card's Workbench) and the item modal with the MMA
// baseline, no sign-in. The Client card itself reads the Ledger, so it is seen on the real HUD (#/clients).
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Waterfall, ItemModal, TimelinePill } from '../src/components/river/ClientTimeline'
import { CLIENTS } from '../src/constants/clients'
import { BASELINE } from '../src/lib/clientTimeline'

const client = CLIENTS[0]
const seed = BASELINE[client.key].map((b, i) => ({ id: `h${i}`, notes: '', links: [], position: i, updated_at: new Date().toISOString(), ...b }))

function App() {
  const [items, setItems] = useState(seed)
  const [modal, setModal] = useState(null)
  const [view, setView] = useState('simple')
  const save = async (d) => { setItems(prev => d.id ? prev.map(i => i.id === d.id ? { ...i, ...d } : i) : [...prev, { ...d, id: `n${prev.length}` }]); setModal(null) }
  return (
    <div style={{ maxWidth: 1480, margin: '0 auto', padding: 24, color: '#EAF1F8', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>{['simple', 'detailed'].map(v => <TimelinePill key={v} active={view === v} onClick={() => setView(v)}>{v === 'simple' ? 'Simple' : 'Detailed'}</TimelinePill>)}</div>
        <Waterfall client={client} items={items} view={view} onOpen={(it) => setModal({ item: it })} onAdd={(lane) => setModal({ item: { lane } })} onMove={(it, patch) => setItems(prev => prev.map(i => i.id === it.id ? { ...i, ...patch } : i))} onDraft={(lane, start_date) => setModal({ item: { lane, start_date } })} />
      </div>
      {modal && <ItemModal client={client} item={modal.item} busy={false} onClose={() => setModal(null)} onSave={save} onDelete={(it) => { setItems(prev => prev.filter(i => i.id !== it.id)); setModal(null) }} />}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

export default App
