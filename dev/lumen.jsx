// Dev harness: the Lumen panel on a tall page, no sign-in (David 11/7: a wheel over the panel must never move the page).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import LumenPanel from '../src/components/river/LumenPanel'

const item = { kind: 'objective', id: '00000000-0000-0000-0000-000000000000', title: 'Read: Safety net hospital index article (Health Affairs Scholar)', root: 'Side Missions' }
function App() {
  return (
    <div className="sa-dark" style={{ minHeight: '100vh', background: 'var(--hud-surface, #0E2336)', color: 'var(--hud-ink, #EAF1F8)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ padding: 24, height: 3200 }}>
        <div style={{ fontFamily: 'Lora, serif', fontSize: 24 }}>A tall page behind the panel</div>
        <div id="marker" style={{ marginTop: 2800, fontSize: 13 }}>If you can read this without scrolling the page, the page moved.</div>
      </div>
      <LumenPanel item={item} />
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
