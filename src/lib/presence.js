// HUD presence (David 11/22, on the clock stopping while he read a tab: "the idle stop counts HUD activity, not just
// chat"). While he moves, types, clicks or scrolls in a visible HUD tab, write presence/hud.json at most once a minute.
// The session idle stop (~/.claude/hud-board/idle-stop.py) and api/clock-watch.mjs read it as his latest sign of life.
import { supabase } from './supabase'

const EVERY = 60e3
export function startPresence() {
  let sent = 0, busy = false
  const beat = () => {
    if (busy || document.visibilityState !== 'visible' || Date.now() - sent < EVERY) return
    busy = true; sent = Date.now()
    const body = new Blob([JSON.stringify({ at: new Date().toISOString() })], { type: 'application/json' })
    supabase.storage.from('project-files').upload('presence/hud.json', body, { upsert: true, contentType: 'application/json' })
      .catch(() => {}).finally(() => { busy = false })
  }
  const evs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll', 'visibilitychange']
  evs.forEach(e => window.addEventListener(e, beat, { passive: true, capture: true }))
  const onMsg = (e) => { if (e.data === PULSE) beat() }
  window.addEventListener('message', onMsg)
  beat()
  return () => { evs.forEach(e => window.removeEventListener(e, beat, { capture: true })); window.removeEventListener('message', onMsg) }
}

// A built tab renders in a sandboxed frame, whose events never reach the HUD. This relay rides in its HTML and posts a
// pulse up on movement, so reading a tab counts too.
const PULSE = 'hud-presence'
const RELAY = `<script>(function(){var t=0;function p(){var n=Date.now();if(n-t<20000)return;t=n;try{parent.postMessage('${PULSE}','*')}catch(e){}}['pointermove','pointerdown','keydown','wheel','scroll'].forEach(function(e){addEventListener(e,p,{passive:true,capture:true})})})()</script>`
export const withPresence = (html) => {
  const h = String(html || '')
  return /<\/body>/i.test(h) ? h.replace(/<\/body>/i, `${RELAY}</body>`) : h + RELAY
}
