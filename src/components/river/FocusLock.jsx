// The Board under a Focused Run (David 11/18: "only one thing is allowed on the board ... the rest of what's
// on the board changes. There is some visual cue that i need to lock down"). Whatever it wraps is set back,
// drained of color and out of reach while the lock is on, under one line that says why.
import { Lock } from 'lucide-react'
import { MUTED, PANEL_BORDER } from './canon'

export default function FocusLock({ on = false, label = 'Locked For The Focused Run', children }) {
  if (!on) return children
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: MUTED, margin: '0 0 10px' }}>
        <Lock size={14} /> {label}
        <span style={{ flex: 1, height: 1, background: PANEL_BORDER }} />
      </div>
      <div aria-hidden="true" inert style={{ opacity: 0.32, filter: 'grayscale(0.85)', pointerEvents: 'none', userSelect: 'none', transition: 'opacity .3s ease, filter .3s ease' }}>{children}</div>
    </div>
  )
}
