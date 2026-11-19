// The Run (David 11/17): "a count down timer of 45 minutes. The system, while that timer is going,
// should be canvassing EVERYTHING every 60 seconds ... creating a run log, identifying missions i'm
// hitting, rogue emails, whatever ... and then furnish a run report. A run awards 10 miles. When the
// timer hits 0, it can only close out if i hit something to extract from the run. (should have
// another 10 minute timer after close out to do a report and get a post run summary from Lumen that
// gets documented)." His rulings: "i can extract early, but no miles until i've hit 45. no limits on the
// number of runs taht can award miles."
//
// Later that day: the log folds away, and a filed run hands the panel back to its core face with a
// badge ("this should come back to the core screen, but show somewhere (almost like a badge) 1 Run
// Complete"); the badge opens that run's results (RunResults).
//
// This is the face only: it draws whatever run it is handed and calls back on Start, Extract, File
// and Walk Away. The debrief is done in the results pop-up (RunResults), not here. Nothing here reads or writes the Ledger; dev/run.html runs it on sample data.
import { useEffect, useState } from 'react'
import { LogOut, ChevronDown, ChevronRight, X as XIcon } from 'lucide-react'
import { INK, INK2, MUTED, GRAY, PANEL_BORDER, PANEL_BG, RED, LABEL, SERIF, alpha } from './canon'

export const RUN_MINUTES = 45
export const DEBRIEF_MINUTES = 10
export const RUN_MILES = 10

const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const SOURCE = { mail: 'Mail', session: 'Claude Session', hud: 'HUD', mac: 'On The Mac', calendar: 'Calendar', lumen: 'Lumen', slack: 'Slack', sms: 'Text' }


// The clock (David 11/18: "more of like a digital clock, like an oval ... a little bit bigger. And then you could
// still have the outline counting down with the timer"). A digital face in an oval; its outline is the time left.
const FACE_W = 216, FACE_H = 92
function ClockFace({ frac, color, label, sub, glow = false }) {
  return (
    <div style={{ position: 'relative', width: FACE_W, height: FACE_H, flexShrink: 0, display: 'grid', placeItems: 'center' }}>
      <svg width={FACE_W} height={FACE_H} viewBox={`0 0 ${FACE_W} ${FACE_H}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }} aria-hidden="true">
        <rect x="2" y="2" width={FACE_W - 4} height={FACE_H - 4} rx={(FACE_H - 4) / 2} fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
        <rect x="2" y="2" width={FACE_W - 4} height={FACE_H - 4} rx={(FACE_H - 4) / 2} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" pathLength="100" strokeDasharray={`${100 * Math.max(0, Math.min(1, frac))} 100`} style={{ transition: 'stroke-dasharray 1s linear', filter: `drop-shadow(0 0 6px ${alpha(color, 45)})` }} />
      </svg>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)", fontWeight: 500, fontSize: String(label).length > 5 ? 30 : 36, letterSpacing: '0.04em', lineHeight: 1, color: glow ? color : INK, fontVariantNumeric: 'tabular-nums' }}>{label}</div>
        <div style={{ fontSize: 12.5, color: MUTED, marginTop: 6 }}>{sub}</div>
      </div>
    </div>
  )
}

// A runner, drawn here: the icon set has none. The Mission Run's runner sits inside corner brackets.
const Runner = ({ size = 32, focus = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="15.2" cy="5" r="1.7" />
    <path d="M13.6 8.6 11 13.4" />
    <path d="M13.6 8.6l3.2 2.2 2.4-1" />
    <path d="M13.4 8.7 10.4 8.3 8.6 10.6" />
    <path d="M11 13.4l3.3 2.3-.9 4.4" />
    <path d="M11 13.4 8.3 16.3H5.2" />
    {focus && <path d="M2.5 6V2.5H6M18 2.5h3.5V6M21.5 18v3.5H18M6 21.5H2.5V18" strokeWidth="1.3" />}
  </svg>
)
// The two runs (David 11/18: circles, the same size, a runner in each; a baby blue outline for the one, the purple
// for the other; 11/18 names: "call a standard run a looting run ... a focused run a Mission Run").
const MISSION = '#B4A3E8', LOOTING = '#8ACAFF'
function Round({ color, label, title, onClick, disabled, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 88, fontSize: 12.5, color: INK, textAlign: 'center', opacity: disabled ? 0.55 : 1 }}>
      <button onClick={onClick} disabled={disabled} title={title} aria-label={title || label} className="run-round" style={{ '--c': color, width: 74, height: 74, borderRadius: 99, background: 'rgba(255,255,255,0.03)', border: `1.5px solid ${color}`, color, display: 'grid', placeItems: 'center', cursor: disabled ? 'default' : 'pointer' }}>{children}</button>
      {label}
    </div>
  )
}
// The day's runs, one line each: its number, when it started, how the time split, the minutes and the miles.
const MIX = [MISSION, LOOTING, RED]
function RunList({ list, onResults }) {
  if (!list.length) return <div style={{ fontSize: 14, color: MUTED }}>No Runs Yet Today</div>
  const lastFiled = [...list].reverse().find(r => r.state === 'filed')
  return (
    <div style={{ display: 'grid', rowGap: 8, minWidth: 0 }}>
      {list.map(r => {
        const off = r.state === 'walked', sum = (r.mix || []).reduce((a, x) => a + x, 0)
        const open = onResults && lastFiled && r.id === lastFiled.id
        return (
          <div key={r.id || r.n} onClick={open ? onResults : undefined} title={open ? "Open this run's results" : undefined} style={{ display: 'grid', gridTemplateColumns: '48px 66px minmax(0,1fr) 50px 40px', columnGap: 12, alignItems: 'center', fontSize: 13.5, color: off ? GRAY : INK, cursor: open ? 'pointer' : 'default' }}>
            <span style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 15 }}>Run {r.n}</span>
            <span style={{ color: off ? GRAY : MUTED, fontVariantNumeric: 'tabular-nums' }}>{clock(r.started_at)}</span>
            {off ? <span>Walked Away</span> : sum > 0
              ? <span style={{ display: 'flex', height: 5, borderRadius: 99, overflow: 'hidden', background: 'rgba(255,255,255,0.09)' }}>{r.mix.map((w, i) => <i key={i} style={{ display: 'block', height: '100%', width: `${(100 * w) / sum}%`, background: MIX[i] }} />)}</span>
              : <span style={{ color: MUTED }}>{r.state === 'debrief' ? 'Report Open' : 'No Split Recorded'}</span>}
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.minutes} min</span>
            <span style={{ textAlign: 'right', color: off ? GRAY : MISSION, fontVariantNumeric: 'tabular-nums' }}>{r.miles} mi</span>
          </div>
        )
      })}
      <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: MUTED, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {[['Mission', MIX[0]], ['Protocol', MIX[1]], ['Rogue', MIX[2]]].map(([k, c]) => <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: 99, background: c, display: 'inline-block' }} />{k}</span>)}
      </div>
    </div>
  )
}

// run: null (no run on; a filed run counts as none) or { n, state: 'running' | 'overtime' | 'debrief', started_at, ends_at,
//   extracted_at, debrief_ends_at, log: [{ at, source, text, mission }], hits: [{ mission, kind, minutes, what }],
//   rogue: [{ text, minutes }], summary, word }
// today: { runs, miles } filed so far today. busy: a verb is in flight. error: the last thing that went wrong.
// onResults: open the last filed run's results (the badge shows only when this is given).
const LOG_OPEN = 'hud.run.log.open'
const logOpenAtFirst = () => { try { return localStorage.getItem(LOG_OPEN) !== '0' } catch { return true } }

// A Focused Run (David 11/18: "Two options for a run. A run and a focused run"): run.focus = { title, mission }
// names the one thing on the Board. The panel sits pressed in while it is on. onStartFocused shows the second option.
export default function RunPanel({ run, today = { runs: 0, miles: 0 }, busy = false, error = null, onStart, onStartFocused, onExtract, onWalkAway, onResults }) {
  const [now, setNow] = useState(() => Date.now())
  const [logOpen, setLogOpen] = useState(logOpenAtFirst)
  const foldLog = () => setLogOpen(o => { try { localStorage.setItem(LOG_OPEN, o ? '0' : '1') } catch { /* the fold is still kept for this visit */ } return !o })
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const state = run?.state || 'idle'
  const left = run ? new Date(run.ends_at).getTime() - now : 0
  const over = state === 'overtime' || (state === 'running' && left <= 0)
  const live = state === 'running' && !over
  const log = run?.log || []
  const debriefLeft = run?.debrief_ends_at ? new Date(run.debrief_ends_at).getTime() - now : 0
  const focus = run?.focus || null
  const held = !!focus && (live || over)

  const tone = focus ? MISSION : LOOTING
  const on = state !== 'idle'
  const kind = focus ? 'Mission Run' : 'Looting Run'
  return (
    <section className={live && !held ? 'ld-running' : undefined} style={on ? { '--slot': tone, border: `1.5px solid ${over ? RED : state === 'debrief' ? LABEL : tone}`, borderRadius: 16, background: held ? 'rgba(4,12,20,0.55)' : PANEL_BG, padding: '20px 22px', boxShadow: held ? 'inset 0 4px 14px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)' : undefined, transition: 'background .3s ease, box-shadow .3s ease' } : undefined}>
      <style>{'.run-round { transition: box-shadow .3s } .run-round:not(:disabled):hover { box-shadow: 0 0 22px color-mix(in srgb, var(--c) 40%, transparent) }'}</style>
      <div style={{ display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', columnGap: 30, rowGap: 18, alignItems: 'center' }}>
        {state === 'idle' && <ClockFace frac={1} color={LOOTING} label={`${RUN_MINUTES}:00`} sub="Ready" />}
        {live && <ClockFace frac={left / ((run.minutes || RUN_MINUTES) * 60000)} color={tone} glow label={mmss(left)} sub={`Left In ${kind} ${run.n}`} />}
        {over && <ClockFace frac={1} color={RED} glow label={`+${mmss(-left)}`} sub="Over" />}
        {state === 'debrief' && <ClockFace frac={debriefLeft / (DEBRIEF_MINUTES * 60000)} color={LABEL} label={mmss(debriefLeft)} sub="To Debrief" />}

        {state === 'idle' ? <RunList list={today.list || []} onResults={onResults} /> : (
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 22, letterSpacing: '-0.01em', color: INK, margin: 0, lineHeight: 1.2 }}>{kind} {run.n}</h2>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: INK2, marginTop: 5 }}>
              {live && !focus && `Started ${clock(run.started_at)}.`}
              {live && focus && <>The one thing: <b style={{ color: INK, fontWeight: 600 }}>{focus.title}</b>{focus.mission ? ` (${focus.mission})` : ''}.</>}
              {over && 'It stays open until you extract.'}
              {state === 'debrief' && `Extracted ${clock(run.extracted_at)}. The report is open; file it there.`}
            </div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 5 }}>
              {live && (run.minutes && run.minutes < RUN_MINUTES ? `A ${run.minutes} minute test: no miles` : `${RUN_MILES} miles at ${RUN_MINUTES} minutes; none if you extract early`)}
              {over && `${RUN_MILES} miles on Extract`}
              {state === 'debrief' && (run.miles > 0 ? `${run.miles} miles earned` : 'Extracted early, so no miles')}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          {state === 'idle' && onStartFocused && <Round color={MISSION} label="Mission Run" title="Mission Run: one thing on the Board, the rest locked, a text if you drift" onClick={onStartFocused} disabled={busy}><Runner focus /></Round>}
          {state === 'idle' && <Round color={LOOTING} label={busy ? 'Starting' : 'Looting Run'} title={`Looting Run: ${RUN_MINUTES} minutes, logged by the minute`} onClick={onStart} disabled={busy}><Runner /></Round>}
          {live && <Round color="rgba(243,241,234,0.5)" label="Walk Away" title="Ends the run with no miles; the log so far is kept" onClick={onWalkAway}><XIcon size={24} strokeWidth={1.6} /></Round>}
          {(live || over) && <Round color={over ? RED : tone} label={busy ? 'Extracting' : over ? 'Extract' : 'Extract Early'} title={over ? 'Closes the run and banks its miles' : 'Closes the run now. No miles before the 45 minutes are up.'} onClick={onExtract} disabled={busy}><LogOut size={24} strokeWidth={1.6} /></Round>}
        </div>
      </div>

      {error && <div style={{ fontSize: 13.5, color: RED, marginTop: 12 }}>{error}</div>}
      {/* Lumen's warnings ride WhatsApp, which only carries his own words inside 24 hours of David's last message to him. */}
      {(live || over) && run.wa_open === false && <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--hud-warn)', marginTop: 12 }}>Lumen's WhatsApp line to you is closed: you last wrote him more than a day ago. Send him any message and his warnings come through as written. Until then he can only knock.</div>}
      {(live || over) && log.length > 0 && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
          <button onClick={foldLog} aria-expanded={logOpen} style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: LABEL, background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
            {logOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Run Log
            <span style={{ fontWeight: 400, color: MUTED, fontSize: 13 }}>{run.logged ?? log.length} {(run.logged ?? log.length) === 1 ? 'line' : 'lines'}</span>
          </button>
          {logOpen && <div style={{ display: 'grid', gap: 6, marginTop: 9 }}>
            {log.slice(-6).map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13.5, lineHeight: 1.45 }}>
                <span style={{ color: MUTED, width: 62, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{clock(e.at)}</span>
                <span style={{ color: LABEL, width: 108, flexShrink: 0 }}>{SOURCE[e.source] || e.source}</span>
                <span style={{ color: INK, flex: 1, minWidth: 0 }}>{e.text}</span>
                <span style={{ color: e.mission ? INK2 : GRAY, flexShrink: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.mission || 'Placed At The Debrief'}</span>
              </div>
            ))}
          </div>}
          {logOpen && log.length > 6 && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>{log.length - 6} earlier lines in the full log</div>}
        </div>
      )}

    </section>
  )
}
