// Dev harness: the Client card, the waterfall, and the item modal with the MMA baseline, no sign-in.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ClientCard, Waterfall, ItemModal } from '../src/components/ClientsPage'
import { CLIENTS } from '../src/constants/clients'
import { BASELINE } from '../src/lib/clientTimeline'

const client = CLIENTS[0]
const seed = BASELINE[client.key].map((b, i) => ({ id: `h${i}`, notes: '', links: [], position: i, updated_at: new Date().toISOString(), ...b }))
const anchor = { id: 'x', key: client.key, description: 'Marsh McLennan Agency engagement: Schedule E DaaS, Schedule F innovation, NetNav 2.0, Master Tracker', last_activity_at: new Date().toISOString() }
const missions = [{ id: 'm1', name: 'MMA Strategy and Contract Renewal', key: 'Client.MMA.Renewal', tasks: [{ id: 't1', text: '1 · October 19th Meeting', status: 'promoted', objective_id: 'o' }, { id: 't2', text: '2 · Strategic Plan', status: 'open' }] }, { id: 'm2', name: 'Client.MMA', key: 'Client.MMA', tasks: [{ id: 't3', text: 'Order lunch', status: 'open' }, { id: 't4', text: 'Done thing', status: 'done' }] }]

function App() {
  const [items, setItems] = useState(seed)
  const [modal, setModal] = useState(null)
  const [view, setView] = useState('simple')
  const save = async (d) => { setItems(prev => d.id ? prev.map(i => i.id === d.id ? { ...i, ...d } : i) : [...prev, { ...d, id: `n${prev.length}` }]); setModal(null) }
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24, color: '#EAF1F8', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}><ClientCard client={client} anchor={anchor} missions={missions} items={items} onOpen={() => {}} /></div>
      <div style={{ marginTop: 24, background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>{['simple', 'detailed'].map(v => <button key={v} onClick={() => setView(v)} style={{ padding: '5px 14px', borderRadius: 999, background: view === v ? '#A9C9E8' : 'transparent', color: view === v ? '#0E2336' : '#EAF1F8', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer' }}>{v}</button>)}</div>
        <Waterfall client={client} items={items} view={view} onOpen={(it) => setModal({ item: it })} onAdd={(lane) => setModal({ item: { lane } })} />
      </div>
      {modal && <ItemModal client={client} item={modal.item} busy={false} onClose={() => setModal(null)} onSave={save} onDelete={(it) => { setItems(prev => prev.filter(i => i.id !== it.id)); setModal(null) }} />}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

export default App
