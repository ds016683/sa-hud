// The door a built tab keeps its state through (11/21, after David's marks on the Revenue Markup tab were gone when
// he left it). A built page is framed through srcDoc in a sandbox with no same-origin: it has no storage of its own
// and nothing in the HUD heard it. So the page asks the page that frames it, and the frame answers:
//   from the page  { hud: 'build-state', op: 'load', slug }          answered by  { hud: 'build-state', op: 'state', slug, state }   (state null when nothing is stored)
//   from the page  { hud: 'build-state', op: 'save', slug, state }   answered by  { hud: 'build-state', op: 'saved', slug }
// The state is the page's own JSON, whole, kept at <root>/build/<slug>.state.json (lib/lumenPanel). The sandbox stays
// exactly as it is; the door is what lets it. The rules the door keeps:
//   - It is on only for a tab whose meta says the HUD keeps its state (state.kept, 11/22): the caller passes the slug
//     only then. A tab without it is framed exactly as before and is never answered, so a page that keeps its marks
//     somewhere else does not start a second copy here.
//   - It hears only the window it frames, and only that tab's slug. Any other window, and a page left over from the
//     tab before, is ignored. A page that never asks is framed exactly as before.
//   - A read that fails is not answered (the page stays on its own Not Saved light) and nothing is then written over
//     what could not be read.
//   - Saves land in the order they were sent, the newest replacing one still waiting, and a save still landing is
//     finished before the next read, so a tab left and reopened mid-save opens on what was just written.
//   - The page is not the only writer (11/22: Lumen's write_built_state, and a second window on the same tab). A save
//     never lays the page's whole state over what someone else wrote: the door reads what is kept, lays only what the
//     page changed since it last heard from the door over it (mergeState), writes that, and when the result is more
//     than the page sent, hands it back to the page as a new { op: 'state' } so the page shows both.
//   - When the Ledger says something changed (Lumen answered), the door looks at what is kept; if it moved, the page
//     is handed the new state the same way, so a change Lumen made shows on the open tab without a reload. A page that
//     keeps its state takes a { op: 'state' } at any time, not only as the answer to its load. If the kept state was
//     cleared, the frame is reloaded instead, since a page has no way to be told "nothing".
// Use: const frame = useBuildState(root, keeps ? slug : null, setMsg), then <iframe ref={frame} srcDoc=... />.
import { useEffect, useLayoutEffect, useRef } from 'react'
import { readBuildState, writeBuildState, LEDGER_EVENT } from '../../lib/lumenPanel'

const LEDGER = { read: readBuildState, write: writeBuildState }
const HUD = 'build-state'
const lines = new Map() // one line of reads and writes per page, shared by every frame of it
const inLine = (key, job) => { const p = (lines.get(key) || Promise.resolve()).then(job); lines.set(key, p.catch(() => {})); return p }
const wait = (ms) => new Promise(r => setTimeout(r, ms))
const text = (v) => JSON.stringify(v ?? null)
const isMap = (v) => v != null && typeof v === 'object' && !Array.isArray(v)
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k)

// What the page changed since `base` (the state it last heard from the door, or last sent), laid over `theirs` (what is
// kept now). An entry the page did not touch stays as theirs; one it set, changed or removed goes as the page has it;
// maps are merged entry by entry, anything else (a value, a list) is taken whole. With nothing kept, or a state that
// is not a map, the page's state goes as it is.
export function mergeState(base, mine, theirs) {
  if (!isMap(mine) || !isMap(theirs)) return mine
  const b = isMap(base) ? base : {}
  const out = { ...theirs }
  for (const k of new Set([...Object.keys(b), ...Object.keys(mine)])) {
    if (has(b, k) === has(mine, k) && text(b[k]) === text(mine[k])) continue
    if (!has(mine, k)) { delete out[k]; continue }
    out[k] = isMap(mine[k]) && isMap(theirs[k]) ? mergeState(b[k], mine[k], theirs[k]) : mine[k]
  }
  return out
}

export default function useBuildState(root, slug, onError = null, store = LEDGER) {
  const frame = useRef(null)
  const tell = useRef(onError)
  useEffect(() => { tell.current = onError }, [onError])
  // A layout effect: the listener is on before the framed page can run its first line and ask.
  useLayoutEffect(() => {
    if (!root || !slug) return undefined
    const key = `${root}/build/${slug}`
    // base: the state the page last heard from the door or last sent it, which is what the page believes is kept.
    let on = true, next = null, busy = false, blind = null, said = false, asked = false, base = null
    // A failure is said even after the tab is left (the save was his); a line is cleared only by the tab that wrote it.
    const here = () => on ? 'this tab' : `the tab ${slug}`
    const say = (words) => { if (!tell.current) return; if (words) { said = on; tell.current(words) } else if (said && on) { said = false; tell.current(null) } }
    const answer = (win, msg) => { if (on && frame.current?.contentWindow === win) win.postMessage({ hud: HUD, slug, ...msg }, '*') }
    // Hand the page a state it did not ask for: what is kept moved under it.
    const give = (win, state) => {
      if (!on || frame.current?.contentWindow !== win) return
      if (state == null) { const f = frame.current; asked = false; base = null; f.srcdoc = f.srcdoc; return } // eslint-disable-line no-self-assign
      base = state
      answer(win, { op: 'state', state })
    }
    const put = async (mine) => {
      for (let tries = 1; ; tries++) {
        try {
          const out = mergeState(base, mine, await store.read(root, slug))
          await store.write(root, slug, out)
          return out
        } catch (e) { if (tries >= 3 || e.final || next) throw e; await wait(1200 * tries) }
      }
    }
    const keep = async () => {
      while (next) {
        const { state, win } = next; next = null
        try {
          const out = await put(state)
          base = state
          if (!next) { if (text(out) !== text(state)) give(win, out); answer(win, { op: 'saved' }); say(null) }
        } catch (e) { if (!next) say(`Could not save what you entered on ${here()}: ${e.message}`) }
      }
      busy = false
    }
    const onMessage = (e) => {
      const win = frame.current?.contentWindow, m = e.data
      if (!win || e.source !== win || !m || typeof m !== 'object' || m.hud !== HUD || m.slug !== slug) return
      if (m.op === 'load') {
        inLine(key, () => store.read(root, slug)).then(
          state => { blind = null; asked = true; base = state ?? null; answer(win, { op: 'state', state: state ?? null }); say(null) },
          err => { blind = err; say(`Could not read what was saved on this tab: ${err.message}`) })
      } else if (m.op === 'save') {
        if (blind) { say(`Not saved, what is already kept for this tab could not be read: ${blind.message}`); return }
        next = { state: m.state, win }
        if (!busy) { busy = true; inLine(key, keep) }
      }
    }
    // Lumen answered, or a session wrote: if what is kept for this tab moved, the open page is handed it. A save on its
    // way is left alone; its own merge covers it.
    const onLedger = () => {
      if (!asked || blind || busy || next) return
      const win = frame.current?.contentWindow
      inLine(key, () => store.read(root, slug)).then(state => {
        if (!on || busy || next || !asked || frame.current?.contentWindow !== win) return
        if (text(state) !== text(base)) give(win, state ?? null)
      }, () => { /* the next save or load says so */ })
    }
    window.addEventListener('message', onMessage)
    window.addEventListener(LEDGER_EVENT, onLedger)
    // A save already taken is still written after the tab is left; only the answers stop.
    return () => { on = false; window.removeEventListener('message', onMessage); window.removeEventListener(LEDGER_EVENT, onLedger) }
  }, [root, slug, store])
  return frame
}
