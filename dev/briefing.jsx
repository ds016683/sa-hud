// Dev harness: the Briefing's three reads (CardBriefing) on sample data, no sign-in and no Ledger.
// ?empty is a brand-new card: an empty path and nothing beside it. ?mythic has milestones, so the
// Milestones read shows. Everything a click does happens in memory; Lumen's question is canned.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import CardBriefing from '../src/components/river/CardBriefing'
import LumenPanel from '../src/components/river/LumenPanel'
import { S } from '../src/components/river/canon'

const q = new URLSearchParams(location.search)
const EMPTY = q.has('empty'), MYTHIC = q.has('mythic')
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const OBJ = { id: '00000000-0000-0000-0000-000000000001', title: 'Sample Mission', state: 'active', captured_at: ago(20), north_star: MYTHIC ? 'The sample deck is in the reader\'s hands and they know what to do next.' : null }
let nextId = 10
let steps = EMPTY || MYTHIC ? [] : [
  { id: 1, text: 'Fill the blanks in the draft', done: false, done_at: null, position: 0, created_at: ago(19) },
  { id: 2, text: 'Get it on the letterhead', done: false, done_at: null, position: 1, created_at: ago(8) },
  { id: 3, text: 'Send it', done: false, done_at: null, position: 2, created_at: ago(7) },
]
const sources = { 1: { by: 'david', where: 'card', at: ago(19) }, 2: { by: 'david', where: 'lumen', quote: "let's clean it up and get it on a letterhead", at: ago(8) }, 3: { by: 'lumen', where: 'lumen', at: ago(7) } }
const KIDS = MYTHIC ? [
  { id: 'k1', title: 'Repo attached and the working branch cut', state: 'released', released_at: ago(30), due_date: null },
  { id: 'k2', title: 'Pages 10 to 13 populated with the numbers', state: 'active', due_date: new Date(Date.now() + 2 * 86400e3).toISOString().slice(0, 10) },
  { id: 'k3', title: 'PDF rendered from the branch and filed here', state: 'parked', due_date: null },
] : []
const api = {
  addStep: async (_o, text, position) => { const row = { id: nextId++, text, done: false, done_at: null, position, created_at: new Date().toISOString() }; steps = [...steps, row]; return row },
  toggleStep: async (id, done) => { await new Promise(r => setTimeout(r, 200)); steps = steps.map(s => s.id === id ? { ...s, done, done_at: done ? new Date().toISOString() : null } : s) },
  removeStep: async (id) => { steps = steps.filter(s => s.id !== id) },
  listPages: async () => EMPTY ? [] : [{ slug: 'draft', title: 'Sample Draft', words: 120, created_at: ago(18), updated_at: ago(2) }],
  readPage: async () => ({ title: 'Sample Draft', text: 'Subject: A sample\n\nFriend,\n\nThank you for bearing with me through this. Here is where things stand, in my own words, with [one blank] and [another blank] still to fill.\n\nMore follows.' }),
  listBuilds: async () => [],
  listLiveFiles: async () => ({ rows: EMPTY ? [] : [{ id: 'f1', name: 'Sample Job Description.docx', bucket: 'project-files', path: 'a/jd.docx', source: 'email', note: 'Email · Sample Sender · Oct 21, 2026, 5:56 PM · Re: A Sample Thread', created_at: ago(17) }] }),
  readPath: async () => ({ v: 1, sources }),
  noteSource: async (_r, id, src) => { sources[id] = { at: new Date().toISOString(), ...src } },
}
const lumenApi = {
  loadThread: async () => [], listHandoffs: async () => [], handToClaudeCode: async () => ({}),
  askLumen: async ({ event }) => { await new Promise(r => setTimeout(r, 900)); return event ? `You closed "${event.text}". What date did you give for the answer? I will set it as the follow-up on this card.` : 'A sample reply from the harness.' },
  readWorkbook: async () => ({ v: 1, captures: [], notes: '' }), listBuilds: async () => [],
}
const ITEM = { kind: 'objective', id: OBJ.id, title: OBJ.title, root: 'a' }

function App() {
  const [, bump] = useState(0)
  const [msg, setMsg] = useState(null)
  return (
    <div className="sa-dark sa-app" style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px 120px' }}>
        <h1 style={{ ...S.h1, fontSize: 32 }}>{OBJ.title}</h1>
        <div style={{ marginTop: 24 }}>
          <CardBriefing obj={OBJ} root="a" kindLabel={MYTHIC ? 'Mythic' : 'Bounty'} steps={steps} kids={KIDS} boardItems={[]} loaded={{ equipped: true, minutes_today: 12 }} due={new Date().toLocaleDateString('en-CA')} onReload={async () => bump(n => n + 1)} onTab={(t) => setMsg(`Would open the ${t} pill`)} onOpenCard={(id) => setMsg(`Would open the card ${id}`)} say={setMsg} api={api} />
        </div>
        {msg && <div role="status" style={{ fontSize: 13, color: 'var(--hud-ink-2)', marginTop: 14 }}>{msg}</div>}
      </div>
      <LumenPanel item={ITEM} api={lumenApi} />
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
