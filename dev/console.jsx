// Dev mock-up: the Console's buttons (Instrument) at rest, lit, running and done, on made-up data.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Sunrise, Moon, Check, Square, MessageSquare, Brain, Plane } from 'lucide-react'
import '../src/sa-hud.css'
import { Instrument, InstrumentGroup } from '../src/components/river/Instrument'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <div className="sa-dark sa-app" style={{ minHeight: '100vh', padding: '28px 32px', background: 'linear-gradient(180deg, var(--hud-surface) 0%, var(--hud-surface-deep) 100%)', color: 'var(--hud-ink)', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
      <div style={{ fontSize: 13, color: 'var(--hud-ink-2)', marginBottom: 18 }}>Mock-up, made-up data.</div>
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start' }}>
        <InstrumentGroup label="Protocols">
          <Instrument label="Morning" title="Morning Protocol · the window is open (5:00 to 6:30)" icon={<Sunrise size={24} />} tone="var(--hud-gold)" light={{ level: 'green' }} />
          <Instrument label="Evening" title="Evening Protocol · from 6:00 PM" icon={<Moon size={24} />} disabled />
          <Instrument label="Morning" sub="6:12 AM · 22m" title="Morning Protocol · done" icon={<Check size={24} />} tone="var(--hud-pos)" />
        </InstrumentGroup>
        <InstrumentGroup label="Tending" divider>
          <Instrument label="E-mail Refresh" title="something is being overlooked" reading={170} unit="unread" light={{ level: 'red', blink: true }} />
          <Instrument label="Slack Review" sub="12m today" title="maintenance" reading={12} unit="unread" light={{ level: 'gold' }} />
          <Instrument label="Text Review" icon={<MessageSquare size={24} />} />
        </InstrumentGroup>
        <InstrumentGroup label="Timers" divider>
          <Instrument label="Thinking" icon={<Square size={24} />} running clock="14m" />
          <Instrument label="Thinking" sub="40m today" icon={<Brain size={24} />} />
          <Instrument label="Travel" sub="7:10 AM leg" icon={<Plane size={24} />} light={{ level: 'gold' }} />
        </InstrumentGroup>
      </div>
    </div>
  </StrictMode>,
)
