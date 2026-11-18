// Dev mock-up: the meeting notes rows on a card's Notes tab, with the lock and the red x, on made-up data.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import CardMeetingNotes from '../src/components/river/CardMeetingNotes'

const MEETINGS = [
  { id: 'm1', title: 'Sample pipeline and proposal updates', meeting_date: '2026-11-06', summary: 'A sample summary of the meeting.' },
  { id: 'm2', title: 'Sample workshop and data tool pilot', meeting_date: '2026-10-16', summary: null },
]
let store = { v: 1, hidden: {}, locked: { m3: true } }
const API = {
  readNotesIndex: async () => store,
  writeNotesIndex: async (_id, next) => { store = next },
  readMeetings: async (ids) => ids.map(id => ({ id, title: 'Sample older note held by its lock', meeting_date: '2026-08-02', summary: 'Held on the card.' })),
}
function Page() {
  const [msg, setMsg] = useState(null)
  return (
    <div className="sa-dark sa-app" style={{ minHeight: '100vh', padding: '28px 32px', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ fontSize: 13, color: 'var(--hud-ink-2)', marginBottom: 18 }}>Mock-up, made-up data.</div>
      <div style={{ maxWidth: 900 }}><CardMeetingNotes objectiveId="o1" meetings={MEETINGS} say={setMsg} api={API} empty={<div>No meeting notes.</div>} /></div>
      {msg && <div role="status" style={{ fontSize: 13, marginTop: 14 }}>{msg}</div>}
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><Page /></StrictMode>)
