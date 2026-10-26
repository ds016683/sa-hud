// The door (10/26): the one page a logged-out tab shows. Same canon as every
// page behind it: navy surface, a raised panel, Lora title with an italic
// accent, Instrument Sans labels, the accent button. No fonts of its own.
import { useState } from 'react'
import { signIn } from '../lib/auth'
import { INK, LABEL, MONO, SERIF, RED, PANEL_BORDER, BLUE, NAVY_DEEP } from './river/canon'

const field = { width: '100%', boxSizing: 'border-box', background: 'var(--hud-surface-deep)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 8, padding: '11px 14px', color: INK, fontSize: 14.5, fontFamily: 'inherit', outline: 'none' }
const label = { display: 'block', fontFamily: MONO, fontSize: 10.5, letterSpacing: '1.6px', textTransform: 'uppercase', color: LABEL, marginBottom: 7 }

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focus, setFocus] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try { await signIn(email, password); onLogin() } catch (err) { setError(err.message) } finally { setLoading(false) }
  }
  const input = (name) => ({ ...field, borderColor: focus === name ? BLUE : PANEL_BORDER })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--hud-surface)', color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{'.hud-login input:-webkit-autofill{-webkit-text-fill-color:var(--hud-ink);-webkit-box-shadow:0 0 0 100px var(--hud-surface-deep) inset}'}</style>
      <div className="hud-login" style={{ background: 'var(--hud-surface-raised)', border: `1px solid ${PANEL_BORDER}`, borderRadius: 14, padding: '44px 40px 36px', width: 380, maxWidth: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
        <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '2px', textTransform: 'uppercase', color: LABEL, marginBottom: 10 }}>Personal Operating System</div>
        <h1 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 30, lineHeight: 1.1, letterSpacing: '-0.008em', color: INK, margin: '0 0 30px' }}>Sovereign <em style={{ color: BLUE, fontStyle: 'italic' }}>Architect</em></h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={label} htmlFor="hud-email">Email</label>
            <input id="hud-email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setFocus('email')} onBlur={() => setFocus(null)} required style={input('email')} />
          </div>
          <div style={{ marginBottom: 26 }}>
            <label style={label} htmlFor="hud-password">Password</label>
            <input id="hud-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} onFocus={() => setFocus('password')} onBlur={() => setFocus(null)} required style={input('password')} />
          </div>
          {error && <p style={{ color: RED, fontSize: 12.5, margin: '0 0 16px', lineHeight: 1.5 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', background: BLUE, border: 'none', borderRadius: 8, padding: '12px', color: NAVY_DEEP, fontFamily: MONO, fontSize: 11, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing In' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
