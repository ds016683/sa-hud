import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './sa-hud.css'
import App from './App.jsx'
import { supabase } from './lib/supabase'

// A blank page tells nobody anything. Any render crash shows its message on
// screen and is written to the Ledger (daily_logs, what 'hud-error') so it can
// be read from the other side.
function report(kind, err, info) {
  const message = String(err && (err.stack || err.message) || err).slice(0, 1800)
  try {
    supabase.from('daily_logs').insert({
      day: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), kind: 'note', what: 'hud-error',
      note: `${kind} · ${location.hash || '#/'} · ${navigator.userAgent.slice(0, 60)}\n${message}${info ? `\n${String(info).slice(0, 600)}` : ''}`, source: 'hud',
    }).then(() => {}, () => {})
  } catch { /* the report is best effort */ }
}
window.addEventListener('error', (e) => report('window.error', e.error || e.message))
window.addEventListener('unhandledrejection', (e) => report('unhandledrejection', e.reason))

class RootBoundary extends Component {
  constructor(p) { super(p); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { report('render', error, info && info.componentStack) }
  render() {
    if (!this.state.error) return this.props.children
    const e = this.state.error
    return (
      <div style={{ minHeight: '100vh', background: '#0A1B2B', color: '#EAF1F8', padding: '48px 32px', fontFamily: 'Instrument Sans, system-ui, sans-serif' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '1.6px', textTransform: 'uppercase', color: 'rgba(234,241,248,0.45)' }}>The HUD hit a wall</div>
        <div style={{ fontFamily: 'Lora, Georgia, serif', fontSize: 26, fontWeight: 500, marginTop: 8 }}>{String(e && e.message || e)}</div>
        <div style={{ fontSize: 12.5, color: 'rgba(234,241,248,0.7)', marginTop: 10 }}>Logged to the Ledger. Claude can read it. Reload to try again, or open another page from the address bar.</div>
        <pre style={{ marginTop: 18, fontSize: 11, lineHeight: 1.5, color: 'rgba(234,241,248,0.6)', whiteSpace: 'pre-wrap', maxWidth: 900 }}>{String(e && e.stack || '').slice(0, 1200)}</pre>
        <button onClick={() => { this.setState({ error: null }); location.reload() }} style={{ marginTop: 18, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#EAF1F8', cursor: 'pointer' }}>Reload</button>
      </div>
    )
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootBoundary>
      <App />
    </RootBoundary>
  </StrictMode>,
)
