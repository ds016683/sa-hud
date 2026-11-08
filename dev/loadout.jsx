// Dev harness: the Loadout card face (David 11/7): the clock strip and the verb grid, no sign-in. Three cards in the three
// states that matter: a Main Mission task holstered, a Contract running, a Bounty holstered at zero. Act is local only.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import { FilledSlot } from '../src/components/river/LoadoutPanel'

const base = { id: 'x', due_date: null, north_star: 'A tool that assesses short term cash needs and the short/medium term decisions required for business continuity.', steps: [], tags: [] }
const seed = [
  { ...base, id: 'a', kind: 'Main Mission', project: 'Company Finance Review', title: 'Company Finance Review', task_text: 'Publish and Circulate the Strategy Review and Disseminate to the Board', task_n: 12, task_total: 12, effort: 1, size: 'light', slots: 1, equipped: false, minutes_today: 0 },
  { ...base, id: 'b', kind: 'Side Mission', title: 'Rate Compass pricing memo', effort: 3, size: 'medium', slots: 2, equipped: true, minutes_today: 153, due_date: '2026-11-10' },
  { ...base, id: 'c', kind: 'Side Mission', title: 'Call Greg on the TKF SOW', effort: 1, size: 'light', slots: 1, equipped: false, minutes_today: 0, north_star: null },
]

function App() {
  const [items, setItems] = useState(seed)
  // local act: the message names the verb; Equip and Holster flip the running state here, nothing touches the Ledger
  const act = (fn, msg) => {
    const m = /^(Equipped|Holstered): (.*)$/.exec(msg)
    if (m) setItems(prev => prev.map(i => i.title === m[2] || (i.task_text && m[2] === i.title) ? { ...i, equipped: m[1] === 'Equipped' } : m[1] === 'Equipped' ? { ...i, equipped: false } : i))
    console.log(msg)
  }
  let n = 1
  return (
    <div className="sa-dark" style={{ minHeight: '100vh', background: 'var(--hud-surface, #0E2336)', padding: 24, color: 'var(--hud-ink, #EAF1F8)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}><div style={{ maxWidth: 1480, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, alignItems: 'stretch' }}>
        {items.map(it => { const at = n; n += it.slots; return <FilledSlot key={it.id} it={it} n={at} act={act} onOpen={() => {}} onExtract={() => console.log('extract')} onRecall={() => console.log('recall')} clips={it.id === 'a' ? 3 : 0} onFiles={() => console.log('files')} /> })}
      </div>
    </div></div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
