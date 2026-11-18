// Dev mock-up: the Protocol readout (ProtocolHud) in each of its states, on made-up data.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../src/sa-hud.css'
import ProtocolHud from '../src/components/river/ProtocolHud'

const min = (m) => new Date(Date.now() + m * 60000).toISOString()
const GREEN = 'var(--hud-pos)', BLUE = 'var(--hud-accent)', PURPLE = 'var(--hud-purple)'
const STATES = [
  { id: 'run', label: 'In Run', color: GREEN, title: 'Run 3', since: min(-8), ends: min(37.4) },
  { id: 'run', label: 'In Run', color: GREEN, title: 'Run 3', since: min(-42), ends: min(3.2) },
  { id: 'run', label: 'In Run', color: GREEN, title: 'Run 3', since: min(-48), ends: min(-3.1) },
  { id: 'mission', label: 'In Mission', color: GREEN, title: 'Sample Gate + 1 more', since: min(-77), live: true, slots: [{ live: false }, { live: true }] },
  { id: 'meeting', label: 'In Meeting', color: BLUE, title: 'Sample Team Meeting', since: min(-21) },
  { id: 'split', label: 'In Meeting / Split Focus', color: BLUE, title: 'Sample Team Meeting', since: min(-21) },
  { id: 'console', label: 'E-mail Refresh', color: GREEN, title: '12m on the clock', since: min(-12) },
  { id: 'console', label: 'Gaming', color: PURPLE, title: '95m on the clock', since: min(-95) },
  { id: 'off', label: 'Off Protocol', color: 'rgba(234,241,248,0.35)', title: 'No clock running' },
]
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="sa-dark sa-app" style={{ minHeight: '100vh', padding: '28px 32px', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ fontSize: 13, color: 'var(--hud-ink-2)', marginBottom: 18 }}>Mock-up, made-up data.</div>
      <div style={{ display: 'grid', gap: 16, justifyItems: 'start' }}>{STATES.map((p, i) => <ProtocolHud key={i} proto={p} />)}<ProtocolHud proto={null} /></div>
    </div>
  </StrictMode>
)
