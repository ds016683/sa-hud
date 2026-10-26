// Dev harness: the success hue (SUCCESS, the Main Mission medallion purple) beside the
// states that stay GREEN (running, live), with a session board rendered in place. No sign-in.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Check } from 'lucide-react'
import '../src/sa-hud.css'
import SessionBoard from '../src/components/river/SessionBoard'
import BadgeMedallion from '../src/components/BadgeArt'
import { INK, INK2, GRAY, GOLD, GREEN, SUCCESS, RED, MONO, SERIF, S, alpha } from '../src/components/river/canon'

const board = {
  id: 'h1', title: 'Company Finance Review · 10/25', updated_at: new Date().toISOString(),
  phases: [
    { title: '12 · HUD success hues to the medallion purple', tasks: [
      { id: '12.1', label: 'Find every success hue and the medallion purple', status: 'done', note: 'GREEN in 212 lines; the medallion is #B4A3E8' },
      { id: '12.2', label: 'Swap the success tokens to the purple', status: 'done' },
      { id: '12.3', label: 'Build, verify in the browser, push main', status: 'inmotion' },
      { id: '12.4', label: 'Record the change in the color canon; release the item', status: 'open' },
      { id: '12.5', label: 'Slide 2', status: 'blocked', note: 'waiting on David' },
    ] },
  ],
}

const Swatch = ({ color, label, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ width: 22, height: 22, borderRadius: 99, background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Check size={13} color="#0D1D2C" strokeWidth={3} /></span>
    <div><div style={{ fontSize: 13.5, color: INK }}>{label}</div><div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: INK2 }}>{sub}</div></div>
  </div>
)

function App() {
  return (
    <div style={{ background: 'var(--hud-surface)', minHeight: '100vh' }}>
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 28, color: INK, fontFamily: 'Instrument Sans, system-ui, sans-serif', display: 'grid', gap: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
        <BadgeMedallion id="main-mission" size={112} glow />
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ fontFamily: SERIF, fontSize: 22 }}>Success is the medallion purple</div>
          <Swatch color={SUCCESS} label="Done · closed · delivered · approved · achieved" sub="SUCCESS · var(--hud-success)" />
          <Swatch color={GREEN} label="Running · live · loaded · money up" sub="GREEN · var(--hud-pos), unchanged" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span style={S.chip(alpha(SUCCESS, 16), SUCCESS)}>closed Oct 25 · 10 mi</span>
            <span style={S.chip(alpha(SUCCESS, 16), SUCCESS)}>Complete</span>
            <span style={S.chip(alpha(SUCCESS, 16), SUCCESS)}>attended</span>
            <span style={S.chip(alpha(GREEN, 16), GREEN)}>on the board</span>
            <span style={S.chip(alpha(GREEN, 16), GREEN)}>running · 0:42</span>
            <span style={S.chip(alpha(GOLD, 16), GOLD)}>in motion</span>
            <span style={S.chip(alpha(RED, 16), RED)}>blocked</span>
          </div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.035)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12, padding: 16 }}>
        <SessionBoard board={board} />
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>dev harness · no sign-in · dev/success.html</div>
    </div>
    </div>
  )
}
createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)

export default App
