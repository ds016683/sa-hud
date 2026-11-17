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
import { Check, ArrowRight, FileText } from 'lucide-react'
import { INK, INK2, MUTED, PANEL_BORDER, GOLD, SUCCESS, LABEL, RED, SERIF, NAVY_DEEP, alpha } from './canon'

const RUN_MINUTES = 45
const mmss = (ms) => { const t = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
// The order the server works in at Extract (see extractRun in api/_run.mjs).
const STAGES = [[0, 'Taking One Last Look'], [14, 'Reading The Run Log'], [38, 'Lumen Is Writing The Report'], [84, 'Counting The Miles']]
const stageAt = (pct) => ([...STAGES].reverse().find(([from]) => pct >= from) || STAGES[0])[1]
const SPARKS = Array.from({ length: 16 }, (_, i) => i * 22.5)

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

// A number that counts up to its value once it is on screen.
function useCount(to, on) {
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!on) return undefined
    let raf; const t0 = performance.now()
    const step = (t) => { const k = Math.min(1, (t - t0) / 1000); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [to, on])
  return v
}

const Section = ({ title, delay, children }) => (
  <div className="run-rise" style={{ animationDelay: `${delay}s`, marginTop: 30 }}>
    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 19, color: INK, marginBottom: 10 }}>{title}</div>
    {children}
  </div>
)

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
  const earned = run ? (run.earned && run.earned.length ? run.earned : run.miles > 0 ? [{ badge: 'run', text: `Run ${run.n}, the full ${RUN_MINUTES} minutes`, miles: run.miles }] : []) : []
  const total = Math.round(earned.reduce((s, e) => s + Number(e.miles || 0), 0) * 100) / 100
  const miles = useCount(total, ready)
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

  const minutes = Math.max(0, Math.round((new Date(run.extracted_at) - new Date(run.started_at)) / 60000))
  const onMission = hits.reduce((s, h) => s + (h.minutes || 0), 0), off = rogue.reduce((s, r) => s + (r.minutes || 0), 0)
  const done = run.accomplished || []
  const tiles = [[minutes, minutes === 1 ? 'Minute' : 'Minutes'], [onMission, 'Minutes On A Mission'], [off, 'Minutes Off Mission'], [run.logged ?? 0, 'Lines Logged']]
  const yay = total > 0
  return (
    <div className="run-veil" role="dialog" aria-modal="true" aria-label={`Run ${run.n} results`} style={veil}>
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '56px 24px 64px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'grid', placeItems: 'center', marginBottom: 22 }}>
            <div style={{ position: 'relative', width: 168, height: 168 }}>
              {yay && <><span className="run-ripple" /><span className="run-ripple b" />{SPARKS.map((a, i) => <span key={a} className="run-spark" style={{ '--a': `${a}deg`, height: i % 2 ? 10 : 18 }} />)}</>}
              <div className="run-medal">
                <Dial frac={1} color={yay ? SUCCESS : 'rgba(234,241,248,0.28)'} size={168}>
                  <div>
                    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 46, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>+{miles}</div>
                    <div style={{ fontSize: 14, color: MUTED, marginTop: 6 }}>{total === 1 ? 'Mile' : 'Miles'}</div>
                  </div>
                </Dial>
              </div>
            </div>
          </div>
          <h2 className="run-rise" style={{ animationDelay: '.35s', fontFamily: SERIF, fontWeight: 500, fontSize: 36, letterSpacing: '-0.012em', lineHeight: 1.12, color: INK, margin: 0 }}>Run {run.n} Extracted{run.miles > 0 ? '' : ' Early'}</h2>
          {run.headline && <div className="run-rise" style={{ animationDelay: '.45s', fontFamily: SERIF, fontStyle: 'italic', fontSize: 21, lineHeight: 1.35, color: yay ? SUCCESS : INK2, marginTop: 10 }}>{run.headline}</div>}
          <div className="run-rise" style={{ animationDelay: '.55s', fontSize: 14.5, color: MUTED, marginTop: 10 }}>{clock(run.started_at)} to {clock(run.extracted_at)}</div>
        </div>

        <div className="run-rise" style={{ animationDelay: '.7s', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 30 }}>
          {tiles.map(([v, l]) => (
            <div key={l} style={{ border: `1px solid ${PANEL_BORDER}`, borderRadius: 13, padding: '14px 16px', background: 'rgba(255,255,255,0.04)' }}>
              <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 28, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 7 }}>{l}</div>
            </div>
          ))}
        </div>

        <Section title="What Happened" delay={0.85}>
          <div style={{ fontFamily: SERIF, fontSize: 16.5, lineHeight: 1.6, color: INK }}>{run.summary}</div>
        </Section>

        <Section title="What Was Accomplished" delay={1}>
          {done.length ? (
            <div style={{ display: 'grid', gap: 8 }}>
              {done.map((d, i) => <div key={i} style={{ display: 'flex', gap: 10, fontSize: 15, lineHeight: 1.5, color: INK }}><Check size={17} color={SUCCESS} style={{ flexShrink: 0, marginTop: 3 }} /><span>{d}</span></div>)}
            </div>
          ) : <div style={{ fontSize: 15, lineHeight: 1.5, color: INK2 }}>Nothing in the log was finished, sent or closed inside this run.</div>}
        </Section>

        <Section title="Miles Earned" delay={1.15}>
          {earned.length ? (
            <div>
              {earned.map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'baseline', fontSize: 15, lineHeight: 1.45, padding: '7px 0', borderBottom: `1px solid ${alpha(PANEL_BORDER, 60)}` }}>
                  <span style={{ flex: 1, minWidth: 0, color: INK }}>{e.text}</span>
                  <span style={{ color: INK, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{e.miles}</span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', paddingTop: 10 }}>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: INK }}>Total</span>
                <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, color: SUCCESS, fontVariantNumeric: 'tabular-nums' }}>{total} {total === 1 ? 'Mile' : 'Miles'}</span>
              </div>
            </div>
          ) : <div style={{ fontSize: 15, lineHeight: 1.5, color: INK2 }}>No miles on this one. A run pays its 10 once the {RUN_MINUTES} minutes are up.</div>}
        </Section>

        <Section title="Where The Time Went" delay={1.25}>
          <div style={{ display: 'grid', gap: 9 }}>
            {[...hits.map(h => ({ ...h, rogue: false })), ...rogue.map(r => ({ mission: r.text, kind: 'Rogue', minutes: r.minutes, what: null, rogue: true }))].map((h, i, all) => {
              const sum = all.reduce((t, x) => t + (x.minutes || 0), 0) || 1
              return (
                <div key={i}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 14.5 }}>
                    <span style={{ color: INK, fontWeight: 600, flex: 1, minWidth: 0 }}>{h.mission}</span>
                    <span style={{ color: h.rogue ? RED : LABEL, fontSize: 13 }}>{h.kind}</span>
                    <span style={{ color: INK, width: 58, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.minutes} min</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(234,241,248,0.10)', marginTop: 5, overflow: 'hidden' }}><div style={{ width: `${(100 * (h.minutes || 0)) / sum}%`, height: '100%', borderRadius: 99, background: h.rogue ? alpha(RED, 70) : SUCCESS }} /></div>
                  {h.what && <div style={{ fontSize: 13.5, color: INK2, lineHeight: 1.5, marginTop: 5 }}>{h.what}</div>}
                </div>
              )
            })}
            {hits.length + rogue.length === 0 && <div style={{ fontSize: 15, color: INK2 }}>Lumen could not place the minutes on this one.</div>}
          </div>
        </Section>

        {debrief ? (
          <Section title="Your Word" delay={1.35}>
            <textarea value={word} onChange={e => setWord(e.target.value)} rows={3} placeholder="What was this run for, and did it get there? Optional." aria-label="Your word on this run" style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 15, lineHeight: 1.5, padding: '11px 13px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: INK, outline: 'none', resize: 'vertical' }} />
            {error && <div style={{ fontSize: 13.5, color: RED, marginTop: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginTop: 22 }}>
              <button onClick={() => onFile && onFile(word)} disabled={busy} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: '12px 22px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${GOLD}`, background: GOLD, color: NAVY_DEEP, opacity: busy ? 0.6 : 1 }}><FileText size={16} /> {busy ? 'Filing' : 'File The Report'}</button>
              {run.debrief_ends_at && <span style={{ fontSize: 13.5, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>It files as written in {mmss(new Date(run.debrief_ends_at).getTime() - now)}.</span>}
            </div>
          </Section>
        ) : (
          <>
            {run.word && <Section title="Your Word" delay={1.35}><div style={{ fontSize: 15, lineHeight: 1.55, color: INK }}>{run.word}</div></Section>}
            <div className="run-rise" style={{ animationDelay: '1.4s', display: 'flex', justifyContent: 'center', marginTop: 36 }}>
              <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 15, fontWeight: 600, padding: '12px 22px', borderRadius: 11, cursor: 'pointer', border: `1px solid ${GOLD}`, background: GOLD, color: NAVY_DEEP }}>{closeLabel} <ArrowRight size={16} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
