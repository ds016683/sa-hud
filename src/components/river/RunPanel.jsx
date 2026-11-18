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
import { Play, LogOut, Check, ChevronDown, ChevronRight, Crosshair, Lock } from 'lucide-react'
import { INK, INK2, MUTED, GRAY, PANEL_BORDER, PANEL_BG, GOLD, GREEN, RED, SUCCESS, LABEL, SERIF, NAVY_DEEP, alpha } from './canon'

export const RUN_MINUTES = 45
export const DEBRIEF_MINUTES = 10
export const RUN_MILES = 10

const clock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` }
const SOURCE = { mail: 'Mail', session: 'Claude Session', hud: 'HUD', mac: 'On The Mac', calendar: 'Calendar', lumen: 'Lumen', slack: 'Slack', sms: 'Text' }

const btn = (kind = 'ghost') => ({
  display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '11px 18px', borderRadius: 11, whiteSpace: 'nowrap', cursor: 'pointer',
  border: `1px solid ${kind === 'primary' ? GOLD : PANEL_BORDER}`, background: kind === 'primary' ? GOLD : 'transparent', color: kind === 'primary' ? NAVY_DEEP : INK2,
})

// The ring: how much of the window is left, the time in its middle.
function Ring({ frac, color, label, sub, size = 132 }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(234,241,248,0.10)" strokeWidth="6" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(1, frac)))} style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: String(label).length > 5 ? 25 : 30, lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>{label}</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 5 }}>{sub}</div>
        </div>
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
  const edge = live ? GREEN : over ? RED : state === 'debrief' ? LABEL : PANEL_BORDER
  const log = run?.log || []
  const debriefLeft = run?.debrief_ends_at ? new Date(run.debrief_ends_at).getTime() - now : 0
  const focus = run?.focus || null
  const held = !!focus && (live || over)

  return (
    <section className={live && !held ? 'ld-running' : undefined} style={{ border: `1.5px solid ${edge}`, borderRadius: 16, background: held ? 'rgba(4,12,20,0.55)' : PANEL_BG, padding: '22px 24px', boxShadow: held ? 'inset 0 4px 14px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.05)' : undefined, transition: 'background .3s ease, box-shadow .3s ease' }}>
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
        {state === 'idle' && <Ring frac={1} color="rgba(234,241,248,0.28)" label={`${RUN_MINUTES}:00`} sub="Ready" />}
        {live && <Ring frac={left / ((run.minutes || RUN_MINUTES) * 60000)} color={GREEN} label={mmss(left)} sub="Left" />}
        {over && <Ring frac={1} color={RED} label={`+${mmss(-left)}`} sub="Over" />}
        {state === 'debrief' && <Ring frac={debriefLeft / (DEBRIEF_MINUTES * 60000)} color={LABEL} label={mmss(debriefLeft)} sub="To Debrief" />}

        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, letterSpacing: '-0.01em', color: INK, margin: 0, lineHeight: 1.15 }}>
            {state === 'idle' ? 'Start A Run' : focus ? `Focused Run ${run.n}` : `Run ${run.n}`}
          </h2>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: INK2, marginTop: 7, maxWidth: 560 }}>
            {state === 'idle' && `${RUN_MINUTES} minutes on the clock. Lumen logs what you do each minute: the missions you hit, the mail you send, where the time goes. Extract when it ends, then ${DEBRIEF_MINUTES} minutes for the report.`}
            {live && !focus && `Started ${clock(run.started_at)}. Lumen is logging each minute. Work as you would; the missions keep their own clocks.`}
            {live && focus && <>One thing on the Board: <b style={{ color: INK, fontWeight: 600 }}>{focus.title}</b>{focus.mission ? ` (${focus.mission})` : ''}. Everything else is locked until this run ends. Lumen texts you if you answer mail or Slack that is not about it.</>}
            {over && 'The run is over. It stays open until you extract.'}
            {state === 'debrief' && `Extracted ${clock(run.extracted_at)}. The report is open; file it there.`}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>
            {state === 'idle' && `${RUN_MILES} miles for a run seen through its ${RUN_MINUTES} minutes`}
            {state === 'idle' && onStartFocused && <><br />A Focused Run holds one thing on the Board, locks the rest, and has Lumen text you if you drift.</>}
            {live && (run.minutes && run.minutes < RUN_MINUTES ? `A ${run.minutes} minute test: no miles` : `${RUN_MILES} miles once the ${RUN_MINUTES} minutes are up; none if you extract early`)}
            {over && `${RUN_MILES} miles on Extract`}
            {state === 'debrief' && (run.miles > 0 ? `${run.miles} miles earned` : 'Extracted early, so no miles')}
            {state === 'idle' && today.miles > 0 && <> <span style={{ color: GRAY }}>·</span> {today.miles} miles from runs today</>}
                      </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {state === 'idle' && today.runs > 0 && onResults && (
            <button onClick={onResults} title="Open the last run's results" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 15px', borderRadius: 99, cursor: 'pointer', whiteSpace: 'nowrap', border: `1px solid ${alpha(SUCCESS, 55)}`, background: alpha(SUCCESS, 13), color: SUCCESS }}>
              <Check size={15} /> {today.runs} {today.runs === 1 ? 'Run' : 'Runs'} Complete
            </button>
          )}
          {state === 'idle' && onStartFocused && <button onClick={onStartFocused} disabled={busy} title="One thing on the Board, the rest locked, a text if you drift" style={{ ...btn(), color: INK, borderColor: 'color-mix(in srgb, var(--hud-ink) 45%, transparent)', opacity: busy ? 0.6 : 1 }}><Crosshair size={15} /> Start Focused Run</button>}
          {state === 'idle' && <button onClick={onStart} disabled={busy} style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}><Play size={15} /> {busy ? 'Starting' : 'Start Run'}</button>}
          {held && <span title="The Board is locked to one thing until this run ends" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, padding: '11px 18px', borderRadius: 11, whiteSpace: 'nowrap', color: INK, border: '1px solid rgba(0,0,0,0.5)', background: 'rgba(0,0,0,0.35)', boxShadow: 'inset 0 3px 7px rgba(0,0,0,0.7), inset 0 -1px 0 rgba(255,255,255,0.07)', transform: 'translateY(1px)' }}><Lock size={15} /> Focus On</span>}
          {live && <button onClick={onWalkAway} title="Ends the run with no miles; the log so far is kept" style={btn()}>Walk Away</button>}
          {live && <button onClick={onExtract} disabled={busy} title="Closes the run now. No miles before the 45 minutes are up." style={btn()}><LogOut size={15} /> {busy ? 'Extracting' : 'Extract Early'}</button>}
          {over && <button onClick={onExtract} disabled={busy} style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}><LogOut size={15} /> {busy ? 'Extracting' : 'Extract'}</button>}
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
