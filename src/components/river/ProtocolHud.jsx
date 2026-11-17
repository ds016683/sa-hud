// The Protocol, as a game's status readout (David 11/17: "Do something fun and game nerdy for protocol").
// A targeting frame around one line: a radar scope that sweeps while something is on, the state and what
// it is on, and a live meter that fits the state:
//   In Run       an extraction timer: nine cells of five minutes draining, the time left ticking, red in the
//                last five and counting up in red once it is over
//   In Mission   the Loadout's two slots as pips (lit when filled, pulsing where the clock runs) and that clock
//   In Meeting, Split Focus, a Console button, Unplanned   the time on it, counting up
// It draws the state it is handed (see lib/protocol.js); the clock inside it ticks each second on its own.
import { useEffect, useState } from 'react'

const CELLS = 9, CELL_MS = 5 * 60000
const two = (n) => String(n).padStart(2, '0')
const clock = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}:${two(m)}:${two(s % 60)}` : `${two(m)}:${two(s % 60)}` }

export default function ProtocolHud({ proto }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  if (!proto) return <div className="proto-hud idle" title="Reading the Board"><span className="scope" /><b>Reading The Board</b></div>

  const on = proto.id !== 'off'
  const up = proto.since ? now - new Date(proto.since).getTime() : null
  let meter = null
  if (proto.id === 'run' && proto.ends) {
    const left = new Date(proto.ends).getTime() - now
    const lit = Math.max(0, Math.min(CELLS, Math.ceil(left / CELL_MS)))
    meter = (
      <>
        <span className={`cells${left > 0 && left <= CELL_MS ? ' low' : ''}`} aria-hidden="true">{Array.from({ length: CELLS }, (_, i) => <i key={i} className={i < lit ? 'on' : ''} />)}</span>
        <span className={`t${left <= 0 ? ' over' : left <= CELL_MS ? ' low' : ''}`}>{left < 0 ? '+' : ''}{clock(Math.abs(left))}</span>
      </>
    )
  } else if (proto.id === 'mission') {
    const slots = proto.slots || []
    meter = (
      <>
        <span className="pips" aria-hidden="true">{[0, 1].map(i => <i key={i} className={slots[i] ? (slots[i].live ? 'live' : 'on') : ''} />)}</span>
        {proto.live && up != null && <span className="t">{clock(up)}</span>}
      </>
    )
  } else if (on && up != null) meter = <span className="t">{clock(up)}</span>

  return (
    <div className={`proto-hud${on ? '' : ' idle'}${proto.blink ? ' alarm' : ''}`} style={{ '--c': proto.color }} title={`Protocol: ${proto.label}${proto.title ? ` · ${proto.title}` : ''}${proto.detail ? ` · ${proto.detail}` : ''}`}>
      <span className="scope" />
      <b>{proto.label}</b>
      {on && proto.title && <span className="what">{proto.title}</span>}
      {meter}
    </div>
  )
}
