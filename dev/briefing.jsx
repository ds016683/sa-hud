// Dev harness: the Briefing's three reads (CardBriefing) on sample data, no sign-in and no Ledger.
// ?empty is a brand-new card: an empty path and nothing beside it. ?mythic has gates, so the
// Gates read shows. Everything a click does happens in memory; Lumen's question is canned.
import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import CardBriefing from '../src/components/river/CardBriefing'
import LumenPanel from '../src/components/river/LumenPanel'
import { S } from '../src/components/river/canon'
import { GlyphLoadout, GlyphHolster, GlyphStash, ExtractMarker } from '../src/components/river/glyphs'

// The card's place marks and its Extract, as ItemDetail lays them under the four tiles (mock, nothing moves).
const WHERE = (
  <div className="brf-where" role="group" aria-label="Where this card is">
    <button className="on" title="On the Loadout"><GlyphLoadout size={17} /></button>
    <button title="Holster · Back on the Mission Board"><GlyphHolster size={17} /></button>
    <button title="Stash · Held on the Board"><GlyphStash size={17} /></button>
    <ExtractMarker size={36} title="Extract · Close it, bank the miles" onClick={() => console.log('extract')} />
  </div>
)

const q = new URLSearchParams(location.search)
const EMPTY = q.has('empty'), MYTHIC = q.has('mythic')
const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString()
const OBJ = { id: '00000000-0000-0000-0000-000000000001', title: 'Sample Mission', state: 'active', captured_at: ago(20), north_star: MYTHIC ? 'The sample deck is in the reader\'s hands and they know what to do next.' : null }
let nextId = 10
// ?vetted: a card extracted with two steps still open, archived as vetted, and one done.
let psteps = new URLSearchParams(location.search).has('vetted') ? [
  { id: 'v1', text: 'Draft the sample outline', by: 'david', made_at: new Date(Date.now() - 3 * 3600e3).toISOString(), done: true, at: new Date(Date.now() - 2 * 3600e3).toISOString() },
  { id: 'v2', text: 'Update the sample figures with new tagging', by: 'david', made_at: new Date(Date.now() - 3 * 3600e3).toISOString(), done: false, vetted: true, at: new Date(Date.now() - 600e3).toISOString() },
  { id: 'v3', text: 'Put in the new sample model', by: 'david', made_at: new Date(Date.now() - 3 * 3600e3).toISOString(), done: false, vetted: true, at: new Date(Date.now() - 600e3).toISOString() },
] : []
let steps = EMPTY || MYTHIC ? [] : [
  { id: 1, text: 'Fill the blanks in the draft', done: false, done_at: null, position: 0, created_at: ago(19) },
  { id: 2, text: 'Get it on the letterhead', done: false, done_at: null, position: 1, created_at: ago(8) },
  { id: 3, text: 'Send it', done: false, done_at: null, position: 2, created_at: ago(7) },
]
const sources = { 1: { by: 'david', where: 'card', at: ago(19) }, 2: { by: 'david', where: 'lumen', quote: "let's clean it up and get it on a letterhead", at: ago(8) }, 3: { by: 'lumen', where: 'lumen', at: ago(7) } }
// ?gate: the card of a Main Mission's gate, with the mission's other gates behind it and ahead of it.
const GATE = new URLSearchParams(location.search).has('gate')
const HOURS = (h) => new Date(Date.now() - h * 36e5).toISOString()
const MISSION_GATES = GATE ? [
  { id: 't1', n: 1, text: 'Port the sample model', done: true, done_at: HOURS(200), objective_id: null, current: false },
  { id: 't2', n: 2, text: 'Sketch the week by week plan', done: true, done_at: HOURS(90), objective_id: 'o2', current: false },
  { id: 't3', n: 3, text: 'Six sample descriptions, finalized', done: false, done_at: null, objective_id: null, current: false },
  { id: 't4', n: 4, text: 'Relaunch the sample deck', details: 'INBOUND (sample date): the sample cost data is in, a full breakdown by quarter plus daily line items for the trend. A sample audit also found savings from resizing one sample machine. Both files are filed on this mission\'s page.', done: false, done_at: null, objective_id: 'o4', current: true },
  { id: 't5', n: 5, text: 'Develop a full list of sample targets', done: false, done_at: null, objective_id: 'o5', current: false },
] : []
const MISSION = GATE ? { id: 'p1', name: 'Sample Main Mission', polaris: 'A sample plan, fully documented.' } : null
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
  listLiveFiles: async () => ({ rows: EMPTY ? [] : [{ id: 'f8', name: 'Sample Lab', bucket: 'link', path: 'https://example.com/lab', source: 'session', note: 'Live demo for the sample dinner; the gate first, then the sample experience.', created_at: ago(60 * 30) }, { id: 'f9', name: 'Sample Lab Repo', bucket: 'link', path: 'https://example.com/repo', source: 'session', note: null, created_at: ago(60 * 29) }, { id: 'f1', name: 'Sample Job Description.docx', bucket: 'project-files', path: 'a/jd.docx', source: 'email', note: 'Email · Sample Sender · Oct 21, 2026, 5:56 PM · Re: A Sample Thread', created_at: ago(17) }] }),
  readPath: async () => ({ v: 1, sources, steps: psteps }),
  savePathSteps: async (_r, fn) => { psteps = fn(psteps); return { v: 1, sources, steps: psteps } },
  setStepOrder: async (ids) => { steps = ids.map(id => steps.find(x => x.id === id)).filter(Boolean) },
  noteSource: async (_r, id, src) => { sources[id] = { at: new Date().toISOString(), ...src } },
}
const lumenApi = {
  loadThread: async () => [], listHandoffs: async () => [], handToClaudeCode: async () => ({}),
  askLumen: async ({ event }) => { await new Promise(r => setTimeout(r, 900)); return event ? `You closed "${event.text}". What date did you give for the answer? I will set it as the follow-up on this card.` : 'A sample reply from the harness.' },
  readWorkbook: async () => ({ v: 1, captures: [], notes: '' }), listBuilds: async () => [],
}
const ITEM = { kind: 'objective', id: OBJ.id, title: OBJ.title, root: 'a' }
// ?mission: the same card drawn as a Main Mission page draws it (its gates as the stops, the lines its gates bring).
const MAIN = new URLSearchParams(location.search).has('mission')
const EXTRA = [
  { at: ago(60), kind: 'Gate Closed', text: 'An earlier sample gate', gate: true },
  { at: ago(6), kind: 'Happened', text: 'A Claude Code session added Sample Notes.md', of: { n: 2, text: 'Get it on the letterhead', objective_id: 'o2' } },
]

function App() {
  const [, bump] = useState(0)
  const [msg, setMsg] = useState(null)
  return (
    <div className="sa-dark sa-app" style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '32px 28px 120px' }}>
        <h1 style={{ ...S.h1, fontSize: 32 }}>{OBJ.title}</h1>
        <div style={{ marginTop: 24 }}>
          <CardBriefing obj={OBJ} root="a" sideFoot={WHERE} kindLabel={GATE ? 'Gate' : MYTHIC ? 'Mythic' : 'Bounty'} steps={GATE ? [] : steps} kids={KIDS} missionGates={MISSION_GATES} mission={MISSION} onOpenMission={GATE ? () => setMsg('Would open the mission') : undefined} boardItems={[]} loaded={{ equipped: true, minutes_today: 12 }} due={new Date().toLocaleDateString('en-CA')} onReload={async () => bump(n => n + 1)} onTab={(t) => setMsg(`Would open the ${t} pill`)} onOpenCard={(id) => setMsg(`Would open the card ${id}`)} say={setMsg} api={api}
            {...(MAIN ? {
              kindLabel: 'Main Mission', loaded: null, due: null, extraTrail: EXTRA, hereText: '0 of 3 gates closed. Next: Get it on the letterhead', nextStepId: 2,
              stopExtra: (st, h) => <><div className="src">Gate {st.id} · On The Board<button className="tool" onClick={() => setMsg('Would open its card')}>Open Its Card</button><button className="tool">Done When</button><button className="tool">Rename</button><button className="tool gone" onClick={h.takeOff}>Take It Off</button></div><div className="done-when">Done when: the sample is true, the sample is checked, and a long line of sample words runs on far enough to show how the done-when is held to two lines on the card before it is cut short with the rest behind the Done When button.</div></>,
              confirmClose: async () => true, onClosed: (st) => setMsg(`Would show the award for: ${st.text}`),
            } : {})} />
        </div>
        {msg && <div role="status" style={{ fontSize: 13, color: 'var(--hud-ink-2)', marginTop: 14 }}>{msg}</div>}
      </div>
      <LumenPanel item={ITEM} api={lumenApi} />
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
