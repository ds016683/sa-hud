// Dev harness: the Proposed Steps page (StepReview) on sample data, no sign-in and no Ledger.
// ?many shows 16 waiting, past the reminder line. Everything a click does happens in memory.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import StepReview from '../src/components/river/StepReview'

const MANY = new URLSearchParams(location.search).has('many')
const A = { id: 'p1', kind: 'Main Mission', title: 'Sample Client Renewal' }
const B = { id: 'o1', kind: 'Side Mission', title: 'Sample Board Deck' }
const at = (h) => new Date(Date.now() - h * 36e5).toISOString()
const base = [
  { id: 'email:1', source: 'email', at: at(30), basis: 'To Sample Person: Re: Renewal terms', text: 'Sent the revised terms to the client.', mission: A },
  { id: 'email:2', source: 'email', at: at(26), basis: 'To Sample Person, Second Person: Draft scope', text: 'Sent the draft scope for review.', mission: A },
  { id: 'session:x:4.2', source: 'session', at: at(20), basis: 'Session board Sample Deck Build: Rework slide 6 around the three numbers', text: 'Changed slide 6.', mission: B },
  { id: 'session:x:4.3', source: 'session', at: at(19), basis: 'Session board Sample Deck Build: Export the deck to PDF', text: 'Exported the deck to PDF.', mission: B },
  { id: 'email:3', source: 'email', at: at(8), basis: 'To Third Person: Intro call', text: 'Asked for an intro call on the partner program.', mission: null },
]
const extra = Array.from({ length: 11 }, (_, i) => ({ id: `email:9${i}`, source: 'email', at: at(7 - i * 0.5), basis: `To Sample Person: Thread ${i + 1}`, text: `Sent sample note ${i + 1} to the client.`, mission: i % 2 ? A : B }))
const store = { proposals: MANY ? [...base, ...extra] : base, skipped: [{ ref: 'email:s1', source: 'email', at: at(28), basis: 'To Sample Person: Re: Thanks' }, { ref: 'email:s2', source: 'email', at: at(9), basis: 'To Fourth Person: Re: Tuesday at 2' }], ran_at: at(2), rulings: { 'email:2': { verdict: 'reject', why: 'A draft for review is not a step. Only what went out.', at: at(1) } } }
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const api = {
  loadSteps: async () => { await wait(150); return JSON.parse(JSON.stringify(store)) },
  ruleStep: async (id, verdict, why) => { await wait(200); if (verdict) store.rulings[id] = { verdict, why, at: new Date().toISOString() }; else delete store.rulings[id]; return { ...store.rulings } },
  captureNow: async () => { await wait(900); store.ran_at = new Date().toISOString(); return { events: 0, added: 0, skipped: 0, pending: 0 } },
  openCard: (id) => { window.__opened = id },
}
createRoot(document.getElementById('root')).render(<StrictMode><div className="sa-dark sa-app" style={{ minHeight: '100vh', padding: '0 28px', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}><StepReview api={api} onNavigate={(page, segs) => { window.__nav = [page, ...(segs || [])].join('/') }} /></div></StrictMode>)
