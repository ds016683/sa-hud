// The Run's results (David 11/17): "when it hit extract, let's have it come up with a percentage gauge
// showing the progress in "Analyzing Run Results" then some type of cool animation that brings up a Yay
// page that fits the run.... what happened, what was accomplished, how many miles were earned, including
// the run itself."
//
// Two faces on one veil. While Extract is in flight (pending) the gauge climbs; the server answers once,
// so the percent is paced on the usual time and only reaches 100 when the report is really back. Then
// the medallion lands and the page rises: Lumen's headline, the counts, what happened, what was
// accomplished and the miles line by line. Opened later from the Run Complete badge it skips the gauge.
//
// The debrief lives here too (David 11/17: "the run debrief should just stay in the pop up and not take me
// back to the Board to close out the run. then, when done with the report, it should go ahead and reset the
// whole thing, with the run captured on the surface"). While the run waits on its report the page carries
// Where The Time Went, Your Word and File The Report, and it does not close until the report is filed.
// This is a face only: it draws the run it is handed. dev/run.html runs it on sample data.
import { useEffect, useRef, useState } from 'react'
import { INK, INK2, MUTED, PANEL_BORDER, SUCCESS, LABEL, RED, SERIF, alpha } from './canon'
import { AwardYay } from './AwardYay'
import { holdYay, releaseYay } from '../../lib/yay'

const RUN_MINUTES = 45
const mmss = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
// The order the server works in at Extract (see extractRun in api/_run.mjs).
const STAGES = [[0, 'Taking One Last Look'], [14, 'Reading The Run Log'], [38, 'Lumen Is Writing The Report'], [84, 'Counting The Miles']]
const stageAt = (pct) => ([...STAGES].reverse().find(([from]) => pct >= from) || STAGES[0])[1]

function Dial({ frac, color, size, children }) {
  const r = (size - 14) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(234,241,248,0.10)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} style={{ transition: 'stroke-dashoffset .25s linear, stroke .3s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{children}</div>
    </div>
  )
}

// run: the extracted run (null while pending). pending: Extract is still in flight. busy: File is in flight.
// A run in its debrief is filed from here (onFile(word)); a filed one only closes (onClose).
export default function RunResults({ run, pending = false, busy = false, error = null, closeLabel = 'Done', onClose, onFile }) {
  const [pct, setPct] = useState(pending ? 0 : 100)
  const [shown, setShown] = useState(!pending)
  const live = useRef(pending)
  useEffect(() => { live.current = pending }, [pending])
  useEffect(() => {
    if (shown) return undefined
    let raf, doneAt = null, from = 0, at = 0
    const t0 = performance.now()
    const step = (t) => {
      // A frame's timestamp can be a hair earlier than the clock read above; never let the gauge go below zero
      // (11/17: that negative first frame is what broke the Board at Extract).
      if (live.current) at = 92 * (1 - Math.exp(-Math.max(0, t - t0) / 9000))
      else {
        if (doneAt == null) { doneAt = t; from = at }
        at = from + (100 - from) * Math.min(1, (t - doneAt) / 600)
        if (t - doneAt > 1100) { setShown(true); return }
      }
      setPct(Math.max(0, Math.min(100, Math.floor(at))))
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [shown])
  const ready = shown && !!run
  const debrief = !!run && run.state === 'debrief'
  const [word, setWord] = useState('')
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { if (!debrief) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [debrief])
  useEffect(() => {
    if (!ready || debrief) return undefined
    const key = (e) => { if (e.key === 'Escape') onClose && onClose() }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [ready, debrief, onClose])

  const hits = run?.hits || [], rogue = run?.rogue || []
  // Time the protocol itself calls for (reading notes to Lumen in a Mission Run): its own rows, never red.
  const inProtocol = run?.protocol || []
  const earned = run ? (run.earned && run.earned.length ? run.earned : run.miles > 0 ? [{ badge: 'run', text: `Run ${run.n}, the full ${RUN_MINUTES} minutes`, miles: run.miles }] : []) : []
  // This page is the run's yay: the watcher holds while it shows, and the run's miles count as seen when it closes.
  const since = run?.extracted_at
  useEffect(() => { if (!ready) return undefined; holdYay(); return () => { releaseYay(since) } }, [ready, since])
  const veil = { position: 'fixed', inset: 0, zIndex: 290, background: 'rgba(5,16,28,0.93)', backdropFilter: 'blur(6px)', overflowY: 'auto' }

  if (!ready) return (
    <div className="run-veil" role="status" aria-live="polite" style={{ ...veil, display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', placeItems: 'center' }}>
          <Dial frac={pct / 100} color={pct >= 100 ? SUCCESS : LABEL} size={210}>
            <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 50, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>{pct}%</div>
          </Dial>
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 27, letterSpacing: '-0.01em', color: INK, marginTop: 26 }}>Analyzing Run Results</div>
        <div style={{ fontSize: 15, color: INK2, marginTop: 8, minHeight: 22 }}>{pct >= 100 ? 'Done' : stageAt(pct)}</div>
      </div>
    </div>
  )

  const done = run.accomplished || []
  // One medallion per badge, the way every yay shows them.
  const by = new Map()
  for (const e of earned) { const a = by.get(e.badge || 'run') || { badge: e.badge || 'run', n: 0, miles: 0 }; a.n += 1; a.miles += Number(e.miles || 0); by.set(a.badge, a) }
  const rows = [...hits.map(h => ({ ...h, rogue: false })), ...inProtocol.map(r => ({ mission: r.text, kind: 'Protocol', minutes: r.minutes, what: null, rogue: false })), ...rogue.map(r => ({ mission: r.text, kind: 'Rogue', minutes: r.minutes, what: null, rogue: true }))]
  const sum = rows.reduce((t, x) => t + (x.minutes || 0), 0) || 1
  return (
    <AwardYay title={`Run ${run.n} Extracted${run.miles > 0 ? '' : ' Early'}`} sub={run.headline || `${clock(run.started_at)} to ${clock(run.extracted_at)}`}
      awards={[...by.values()]} done={done.slice(0, 6).map(d => ({ tag: 'Done', color: '#B4A3E8', text: d }))} banked={null}
      keys={!debrief} busy={busy} go={debrief ? 'File The Report' : closeLabel} onContinue={() => debrief ? (onFile && onFile(word)) : (onClose && onClose())}>
      {rows.length > 0 && <>
        <h3>Where The Time Went</h3>
        <div style={{ display: 'grid', gap: 9 }}>
          {rows.map((h, i) => (
            <div key={i}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 14.5 }}>
                <span style={{ color: INK, fontWeight: 600, flex: 1, minWidth: 0 }}>{h.mission}</span>
                <span style={{ color: h.rogue ? RED : LABEL, fontSize: 13 }}>{h.kind}</span>
                <span style={{ color: INK, width: 58, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.minutes} min</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: 'rgba(234,241,248,0.10)', marginTop: 5, overflow: 'hidden' }}><div style={{ width: `${(100 * (h.minutes || 0)) / sum}%`, height: '100%', borderRadius: 99, background: h.rogue ? alpha(RED, 70) : h.kind === 'Protocol' ? '#57BE97' : '#8ACAFF' }} /></div>
              {h.what && <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.5, marginTop: 5 }}>{h.what}</div>}
            </div>
          ))}
        </div>
      </>}
      {run.summary && <><h3>What Happened</h3><p>{run.summary}</p></>}
      {debrief ? <>
        <h3>Your Word</h3>
        <textarea value={word} onChange={e => setWord(e.target.value)} rows={3} aria-label="Your word on this run" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.5, padding: '10px 12px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: INK, resize: 'vertical' }} />
        {error && <div style={{ fontSize: 13.5, color: RED, marginTop: 8 }}>{error}</div>}
        {run.debrief_ends_at && <div style={{ fontSize: 13.5, color: MUTED, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{mmss(new Date(run.debrief_ends_at).getTime() - now)}</div>}
      </> : run.word ? <><h3>Your Word</h3><p>{run.word}</p></> : null}
    </AwardYay>
  )
}
