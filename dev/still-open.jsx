// Dev harness: the Not Ready To Extract panel (StillOpen) on sample data, no sign-in and no
// Ledger. ?mythic adds open milestones. Everything a click does happens in memory.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import StillOpen from '../src/components/river/StillOpen'

const MYTHIC = new URLSearchParams(location.search).has('mythic')
const MISSION = { id: '00000000-0000-0000-0000-000000000001', title: 'Sample Mission' }
const OPEN = {
  steps: [{ id: 2, text: 'Attend the second sample session', done: false, position: 1 }, { id: 3, text: 'Scoping discussion with the sample client', done: false, position: 2 }],
  milestones: MYTHIC ? [{ id: 'k2', title: 'Pages 10 to 13 populated with the numbers', state: 'active' }] : [],
  total: 3, count: MYTHIC ? 3 : 2,   // three gates in all, one closed earlier
}
const api = {
  toggleStep: async (id, done) => { await new Promise(r => setTimeout(r, 200)); return { id, done } },
  stillOpen: async () => OPEN,
  openCard: (id) => { window.__opened = id },
}
function Harness() {
  const [said, setSaid] = useState('The panel is open.')
  const [shown, setShown] = useState(true)
  return (
    <div style={{ padding: 24, color: '#EAF1F8', fontSize: 14 }}>
      <div id="said">{said}</div>
      {!shown && <button onClick={() => { setShown(true); setSaid('The panel is open.') }} style={{ marginTop: 12 }}>Show The Panel Again</button>}
      {shown && <StillOpen mission={MISSION} open={OPEN} api={api} onClose={() => { setShown(false); setSaid(window.__opened ? `Closed, and the card ${window.__opened} was opened.` : 'Closed without extracting.') }} onReady={() => { setShown(false); setSaid('Carried on to the Extract.') }} />}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><Harness /></StrictMode>)
