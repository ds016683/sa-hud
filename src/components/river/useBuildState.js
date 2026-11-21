// The door a built tab keeps its state through (11/21, after David's marks on the Revenue Markup tab were gone when
// he left it). A built page is framed through srcDoc in a sandbox with no same-origin: it has no storage of its own
// and nothing in the HUD heard it. So the page asks the page that frames it, and the frame answers:
//   from the page  { hud: 'build-state', op: 'load', slug }          answered by  { hud: 'build-state', op: 'state', slug, state }   (state null when nothing is stored)
//   from the page  { hud: 'build-state', op: 'save', slug, state }   answered by  { hud: 'build-state', op: 'saved', slug }
// The state is the page's own JSON, whole, kept at <root>/build/<slug>.state.json (lib/lumenPanel). The sandbox stays
// exactly as it is; the door is what lets it. Three rules the door keeps:
//   - It hears only the window it frames, and only that tab's slug. Any other window, and a page left over from the
//     tab before, is ignored. A page that never asks is framed exactly as before.
//   - A read that fails is not answered (the page stays on its own Not Saved light) and nothing is then written over
//     what could not be read.
//   - Saves land in the order they were sent, the newest replacing one still waiting, and a save still landing is
//     finished before the next read, so a tab left and reopened mid-save opens on what was just written.
// Use: const frame = useBuildState(root, slug, setMsg), then <iframe ref={frame} srcDoc=... />.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { readBuildState, writeBuildState } from '../../lib/lumenPanel'

const LEDGER = { read: readBuildState, write: writeBuildState }
const HUD = 'build-state'
const lines = new Map() // one line of reads and writes per page, shared by every frame of it
const inLine = (key, job) => { const p = (lines.get(key) || Promise.resolve()).then(job); lines.set(key, p.catch(() => {})); return p }
const wait = (ms) => new Promise(r => setTimeout(r, ms))

export default function useBuildState(root, slug, onError = null, store = LEDGER) {
  const frame = useRef(null)
  const tell = useRef(onError)
  useEffect(() => { tell.current = onError }, [onError])
  // A layout effect: the listener is on before the framed page can run its first line and ask.
  useLayoutEffect(() => {
    if (!root || !slug) return undefined
    const key = `${root}/build/${slug}`
    let on = true, next = null, busy = false, blind = null, said = false
    // A failure is said even after the tab is left (the save was his); a line is cleared only by the tab that wrote it.
    const here = () => on ? 'this tab' : `the tab ${slug}`
    const say = (text) => { if (!tell.current) return; if (text) { said = on; tell.current(text) } else if (said && on) { said = false; tell.current(null) } }
    const answer = (win, msg) => { if (on && frame.current?.contentWindow === win) win.postMessage({ hud: HUD, slug, ...msg }, '*') }
    const put = async (state) => {
      for (let tries = 1; ; tries++) {
        try { return await store.write(root, slug, state) } catch (e) { if (tries >= 3 || e.final || next) throw e; await wait(1200 * tries) }
      }
    }
    const keep = async () => {
      while (next) {
        const { state, win } = next; next = null
        try { await put(state); if (!next) { answer(win, { op: 'saved' }); say(null) } } catch (e) { if (!next) say(`Could not save what you entered on ${here()}: ${e.message}`) }
      }
      busy = false
    }
    const onMessage = (e) => {
      const win = frame.current?.contentWindow, m = e.data
      if (!win || e.source !== win || !m || typeof m !== 'object' || m.hud !== HUD || m.slug !== slug) return
      if (m.op === 'load') {
        inLine(key, () => store.read(root, slug)).then(
          state => { blind = null; answer(win, { op: 'state', state: state ?? null }); say(null) },
          err => { blind = err; say(`Could not read what was saved on this tab: ${err.message}`) })
      } else if (m.op === 'save') {
        if (blind) { say(`Not saved, what is already kept for this tab could not be read: ${blind.message}`); return }
        next = { state: m.state, win }
        if (!busy) { busy = true; inLine(key, keep) }
      }
    }
    window.addEventListener('message', onMessage)
    // A save already taken is still written after the tab is left; only the answers stop.
    return () => { on = false; window.removeEventListener('message', onMessage) }
  }, [root, slug, store])
  return frame
}
