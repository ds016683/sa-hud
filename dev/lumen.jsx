// Dev harness: the Lumen panel on a tall page, no sign-in (David 11/7: a wheel over the panel must never move the page).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import LumenPanel from '../src/components/river/LumenPanel'

// Sample doors: a short thread with a hand-off waiting, one answered, and one reply not yet handed over.
const row = (id, direction, body, meta = {}) => ({ id, at: new Date(Date.now() - (20 - id) * 60000).toISOString(), direction, kind: 'text', body, meta })
const THREAD = [
  row(1, 'in', 'bring this into a draft in outlook'),
  row(2, 'out', 'I checked everywhere, and it turns out I cannot do either of these myself.\n\n1. A way for write_file to start from an existing .docx as a template.\n2. A draft tool that creates a message in your Outlook Drafts.'),
  row(3, 'out', 'Claude Code: Both hands are yours now. write_file takes a letterhead, and draft_email puts a message in Outlook Drafts with the files attached.', { from: 'claude-code' }),
  row(4, 'in', 'can you see the logo now?'),
  row(5, 'out', 'Yes. The file carries one picture, the Third Horizon logo, in the first-page header and the footer.'),
  row(6, 'in', 'pull the board minutes from SharePoint'),
  row(7, 'out', 'I have no hand on SharePoint. A tool would need to read a document library by path.'),
]
let HANDED = [{ id: 'ho-1', at: new Date().toISOString(), status: 'answered', message_id: 2 }]
const api = {
  loadThread: async () => THREAD,
  listHandoffs: async () => HANDED,
  handToClaudeCode: async ({ message_id }) => { await new Promise(r => setTimeout(r, 500)); const h = { id: `ho-${message_id}`, at: new Date().toISOString(), status: 'open', message_id }; HANDED = [...HANDED, h]; return h },
  askLumen: async () => 'A sample reply from the harness.',
  readWorkbook: async () => ({ v: 1, captures: [], notes: '' }),
  listBuilds: async () => [],
}
const item = { kind: 'objective', id: '00000000-0000-0000-0000-000000000000', title: 'Read: Safety net hospital index article (Health Affairs Scholar)', root: 'Side Missions' }
function App() {
  return (
    <div className="sa-dark" style={{ minHeight: '100vh', background: 'var(--hud-surface, #0E2336)', color: 'var(--hud-ink, #EAF1F8)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ padding: 24, height: 3200 }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: 24 }}>A tall page behind the panel</div>
        <div id="marker" style={{ marginTop: 2800, fontSize: 13 }}>If you can read this without scrolling the page, the page moved.</div>
      </div>
      {/* the item card's own overlay, as ItemDetail draws it: fixed, scrolling, its right edge yielding to the panel */}
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 'var(--lumen-aside, 0px)', transition: 'right 220ms ease', zIndex: 240, overflowY: 'auto', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)' }}>
        <div style={{ padding: 24, height: 2600 }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: 22 }}>The item card overlay (tall, scrolls on its own)</div>
        </div>
        <LumenPanel item={item} api={api} />
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
