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
      {/* the item card's own overlay, as ItemDetail draws it: fixed, scrolling, its right edge yielding to the panel */}
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, right: 'var(--lumen-aside, 0px)', transition: 'right 220ms ease', zIndex: 240, overflowY: 'auto', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)' }}>
        <div style={{ padding: 24, height: 2600 }}>
          <div style={{ fontFamily: 'Lora, serif', fontSize: 22 }}>The item card overlay (tall, scrolls on its own)</div>
        </div>
        <LumenPanel item={item} />
      </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
