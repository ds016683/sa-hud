/* global __HUD_BUILD__ */
// A new build is live but this tab still runs the old one (David 11/9, after a Workbench change hid
// behind a stale HUD tab for the second time): the bundle carries its build id, /build.json beside it
// names the live one, and this pill shows when they differ. The check runs every five minutes, once
// shortly after load, and when the tab comes back into view or focus (at most every 45 seconds).
// Reload is the one action, in gold; Later hides this build's notice for the tab session.
import { useEffect, useState, useCallback } from 'react'
import { INK, INK2, GOLD, PANEL_BORDER, MONO, alpha } from './river/canon'

const MINE = typeof __HUD_BUILD__ !== 'undefined' ? String(__HUD_BUILD__) : null
const EVERY = 5 * 60 * 1000
const AT_LEAST = 45 * 1000
const LATER = 'hud:build-later'
const fmtAt = (iso) => { try { return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) } catch { return '' } }

async function liveBuild() {
  const res = await fetch(`/build.json?cb=${Date.now()}`, { cache: 'no-store' })
  if (!res.ok) return null
  const d = await res.json()
  return d && d.id ? { id: String(d.id), at: d.at || null } : null
}

export default function BuildNotice() {
  const [live, setLive] = useState(null) // { id, at } once a newer build is seen
  const [hidden, setHidden] = useState(() => { try { return sessionStorage.getItem(LATER) } catch { return null } })
  const check = useCallback(async () => {
    if (!MINE) return
    try { const b = await liveBuild(); if (b && b.id !== MINE) setLive(b) } catch { /* offline or no stamp: stay quiet */ }
  }, [])
  useEffect(() => {
    let last = Date.now()
    const soon = setTimeout(check, 20 * 1000)
    const every = setInterval(check, EVERY)
    const wake = () => { if (document.visibilityState !== 'visible' || Date.now() - last < AT_LEAST) return; last = Date.now(); check() }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.__hudCheckBuild = check // a hand for a session verifying the notice
    return () => { clearTimeout(soon); clearInterval(every); document.removeEventListener('visibilitychange', wake); window.removeEventListener('focus', wake); delete window.__hudCheckBuild }
  }, [check])
  if (!live || hidden === live.id) return null
  const later = () => { try { sessionStorage.setItem(LATER, live.id) } catch { /* fine */ } setHidden(live.id) }
  const pill = { fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 999, cursor: 'pointer' }
  return (
    <div role="status" style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 8000, display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px 10px 18px', borderRadius: 999, background: 'var(--hud-surface-raised)', border: `1px solid ${alpha(GOLD, 45)}`, boxShadow: '0 18px 50px rgba(0,0,0,0.45)', color: INK, fontFamily: 'var(--font-label)', fontSize: 13, whiteSpace: 'nowrap' }}>
      <span style={{ width: 7, height: 7, borderRadius: 99, background: GOLD, flexShrink: 0 }} />
      <span>A New Build Is Live{live.at ? <span style={{ color: INK2 }}> · {fmtAt(live.at)} CT</span> : null}</span>
      <button onClick={() => location.reload()} style={{ ...pill, border: `1px solid ${GOLD}`, background: alpha(GOLD, 15), color: INK }}>Reload</button>
      <button onClick={later} style={{ ...pill, padding: '7px 12px', border: `1px solid ${PANEL_BORDER}`, background: 'transparent', color: INK2 }}>Later</button>
    </div>
  )
}
