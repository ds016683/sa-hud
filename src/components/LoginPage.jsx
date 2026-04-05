import { useState } from 'react'
import { signIn } from '../lib/auth'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      onLogin()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#002C77', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#002C77', border: '1px solid rgba(0, 157, 224,0.3)', borderRadius: '12px', padding: '48px 40px', width: '360px' }}>
        <h1 style={{ fontFamily: 'Cinzel, serif', color: '#F59E0B', fontSize: '20px', textAlign: 'center', marginBottom: '8px', letterSpacing: '4px' }}>
          SOVEREIGN ARCHITECT
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textAlign: 'center', fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '32px' }}>
          PERSONAL OPERATING SYSTEM
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '6px' }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 157, 224,0.4)', borderRadius: '6px', padding: '10px 14px', color: 'white', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '10px', fontFamily: 'monospace', letterSpacing: '2px', marginBottom: '6px' }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 157, 224,0.4)', borderRadius: '6px', padding: '10px 14px', color: 'white', fontSize: '14px', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>
          {error && <p style={{ color: '#EF4444', fontSize: '12px', fontFamily: 'monospace', marginBottom: '16px' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#009DE0', border: 'none', borderRadius: '6px', padding: '12px', color: 'white', fontSize: '12px', fontFamily: 'monospace', letterSpacing: '2px', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'SIGNING IN...' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  )
}