// The Run (David 11/17): "a count down timer of 45 minutes. The system, while that timer is going,
// should be canvassing EVERYTHING every 60 seconds ... creating a run log, identifying missions i'm
// hitting, rogue emails, whatever ... and then furnish a run report. A run awards 10 miles. When the
// timer hits 0, it can only close out if i hit something to extract from the run. (should have
// another 10 minute timer after close out to do a report and get a post run summary from Lumen that
// gets documented)." His rulings: "i can extract early, but no miles until i've hit 45. no limits on the
// number of runs taht can award miles."
//
// This is the face only: it draws whatever run it is handed and calls back on Start, Extract, File
// and Walk Away. Nothing here reads or writes the Ledger; dev/run.html runs it on sample data.
import { useEffect, useState } from 'react'
import { Play, LogOut, Check, FileText } from 'lucide-react'
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

const Head = ({ n, title, note }) => (
  <div style={{ margin: '22px 0 10px' }}>
    <div style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 18, color: INK }}>Exhibit {n} · {title}</div>
    {note && <div style={{ fontSize: 13, color: MUTED, marginTop: 3 }}>{note}</div>}
  </div>
)

// run: null (no run on) or { n, state: 'running' | 'overtime' | 'debrief' | 'filed', started_at, ends_at,
//   extracted_at, debrief_ends_at, log: [{ at, source, text, mission }], hits: [{ mission, kind, minutes, what }],
//   rogue: [{ text, minutes }], summary, word }
// today: { runs, miles } filed so far today. busy: a verb is in flight. error: the last thing that went wrong.
export default function RunPanel({ run, today = { runs: 0, miles: 0 }, busy = false, error = null, onStart, onExtract, onFile, onWalkAway }) {
  const [now, setNow] = useState(() => Date.now())
  const [word, setWord] = useState(run?.word || '')
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])

  const state = run?.state || 'idle'
  const left = run ? new Date(run.ends_at).getTime() - now : 0
  const over = state === 'overtime' || (state === 'running' && left <= 0)
  const live = state === 'running' && !over
  const edge = live ? GREEN : over ? RED : state === 'debrief' ? LABEL : state === 'filed' ? SUCCESS : PANEL_BORDER
  const hits = run?.hits || [], rogue = run?.rogue || [], log = run?.log || []
  const debriefLeft = run?.debrief_ends_at ? new Date(run.debrief_ends_at).getTime() - now : 0

  return (
    <section className={live ? 'ld-running' : undefined} style={{ border: `1.5px solid ${edge}`, borderRadius: 16, background: PANEL_BG, padding: '22px 24px' }}>
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
        {state === 'idle' && <Ring frac={1} color="rgba(234,241,248,0.28)" label={`${RUN_MINUTES}:00`} sub="Ready" />}
        {live && <Ring frac={left / (RUN_MINUTES * 60000)} color={GREEN} label={mmss(left)} sub="Left" />}
        {over && <Ring frac={1} color={RED} label={`+${mmss(-left)}`} sub="Over" />}
        {state === 'debrief' && <Ring frac={debriefLeft / (DEBRIEF_MINUTES * 60000)} color={LABEL} label={mmss(debriefLeft)} sub="To Debrief" />}
        {state === 'filed' && <Ring frac={1} color={SUCCESS} label={`+${run.miles ?? 0}`} sub="Miles" />}

        <div style={{ flex: 1, minWidth: 260 }}>
          <h2 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: 26, letterSpacing: '-0.01em', color: INK, margin: 0, lineHeight: 1.15 }}>
            {state === 'idle' ? 'Start A Run' : `Run ${run.n}`}{state === 'filed' ? ' · Filed' : ''}
          </h2>
          <div style={{ fontSize: 14.5, lineHeight: 1.55, color: INK2, marginTop: 7, maxWidth: 560 }}>
            {state === 'idle' && `${RUN_MINUTES} minutes on the clock. Lumen logs what you do each minute: the missions you hit, the mail you send, where the time goes. Extract when it ends, then ${DEBRIEF_MINUTES} minutes for the report.`}
            {live && `Started ${clock(run.started_at)}. Lumen is logging each minute. Work as you would; the missions keep their own clocks.`}
            {over && 'The run is over. It stays open until you extract.'}
            {state === 'debrief' && `Extracted ${clock(run.extracted_at)}. Read Lumen's report, add your word, and file it.`}
            {state === 'filed' && `Filed. ${clock(run.started_at)} to ${clock(run.extracted_at)}. The report is in the run log.`}
          </div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>
            {state === 'idle' && `${RUN_MILES} miles for a run seen through its ${RUN_MINUTES} minutes`}
            {live && `${RUN_MILES} miles once the ${RUN_MINUTES} minutes are up; none if you extract early`}
            {over && `${RUN_MILES} miles on Extract`}
            {(state === 'debrief' || state === 'filed') && (run.miles > 0 ? `${run.miles} miles earned` : 'Extracted early, so no miles')}
            {' '}<span style={{ color: GRAY }}>·</span> {today.runs} {today.runs === 1 ? 'run' : 'runs'} filed today
            {(live || over) && <> <span style={{ color: GRAY }}>·</span> {run.logged ?? log.length} logged</>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {state === 'idle' && <button onClick={onStart} disabled={busy} style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}><Play size={15} /> {busy ? 'Starting' : 'Start Run'}</button>}
          {live && <button onClick={onWalkAway} title="Ends the run with no miles; the log so far is kept" style={btn()}>Walk Away</button>}
          {live && <button onClick={onExtract} disabled={busy} title="Closes the run now. No miles before the 45 minutes are up." style={btn()}><LogOut size={15} /> {busy ? 'Extracting' : 'Extract Early'}</button>}
          {over && <button onClick={onExtract} disabled={busy} style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}><LogOut size={15} /> {busy ? 'Extracting' : 'Extract'}</button>}
          {state === 'filed' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14, fontWeight: 600, color: SUCCESS }}><Check size={16} /> Filed</span>}
          {state === 'filed' && <button onClick={onStart} disabled={busy} style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}><Play size={15} /> {busy ? 'Starting' : 'Start Another'}</button>}
        </div>
      </div>

      {error && <div style={{ fontSize: 13.5, color: RED, marginTop: 12 }}>{error}</div>}
      {(live || over) && log.length > 0 && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: LABEL, marginBottom: 8 }}>Run Log</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {log.slice(-6).map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, fontSize: 13.5, lineHeight: 1.45 }}>
                <span style={{ color: MUTED, width: 62, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{clock(e.at)}</span>
                <span style={{ color: LABEL, width: 108, flexShrink: 0 }}>{SOURCE[e.source] || e.source}</span>
                <span style={{ color: INK, flex: 1, minWidth: 0 }}>{e.text}</span>
                <span style={{ color: e.mission ? INK2 : GRAY, flexShrink: 0, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.mission || 'Placed At The Debrief'}</span>
              </div>
            ))}
          </div>
          {log.length > 6 && <div style={{ fontSize: 12.5, color: MUTED, marginTop: 8 }}>{log.length - 6} earlier lines in the full log</div>}
        </div>
      )}

      {(state === 'debrief' || state === 'filed') && (
        <div style={{ marginTop: 20, borderTop: `1px solid ${PANEL_BORDER}`, paddingTop: 4 }}>
          <Head n={1} title="Run Report" note={`Run ${run.n}, ${clock(run.started_at)} to ${clock(run.extracted_at)}. Written by Lumen from the run log.`} />
          <div style={{ fontFamily: SERIF, fontSize: 16.5, lineHeight: 1.6, color: INK, maxWidth: 760 }}>{run.summary}</div>

          <Head n={2} title="Where The Time Went" note="Minutes by mission, from the clock, the mail and the Mac. Anything that matched no mission is listed as rogue." />
          <div style={{ display: 'grid', gap: 9, maxWidth: 820 }}>
            {[...hits.map(h => ({ ...h, rogue: false })), ...rogue.map(r => ({ mission: r.text, kind: 'Rogue', minutes: r.minutes, what: null, rogue: true }))].map((h, i, all) => {
              const total = all.reduce((s, x) => s + x.minutes, 0) || 1
              return (
                <div key={i}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', fontSize: 14 }}>
                    <span style={{ color: INK, fontWeight: 600, flex: 1, minWidth: 0 }}>{h.mission}</span>
                    <span style={{ color: h.rogue ? RED : LABEL, fontSize: 13 }}>{h.kind}</span>
                    <span style={{ color: INK, width: 58, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{h.minutes} min</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 99, background: 'rgba(234,241,248,0.10)', marginTop: 5, overflow: 'hidden' }}><div style={{ width: `${(100 * h.minutes) / total}%`, height: '100%', borderRadius: 99, background: h.rogue ? alpha(RED, 70) : SUCCESS }} /></div>
                  {h.what && <div style={{ fontSize: 13, color: INK2, lineHeight: 1.5, marginTop: 5 }}>{h.what}</div>}
                </div>
              )
            })}
          </div>

          {state === 'debrief' && (
            <div style={{ marginTop: 22 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: LABEL, marginBottom: 6 }}>Your Word</div>
              <textarea value={word} onChange={e => setWord(e.target.value)} rows={3} placeholder="What was this run for, and did it get there? Optional." aria-label="Your word on this run" style={{ width: '100%', maxWidth: 760, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 14.5, lineHeight: 1.5, padding: '10px 12px', borderRadius: 10, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.04)', color: INK, outline: 'none', resize: 'vertical' }} />
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12, flexWrap: 'wrap' }}>
                <button onClick={() => onFile && onFile(word)} disabled={busy} style={{ ...btn('primary'), opacity: busy ? 0.6 : 1 }}><FileText size={15} /> {busy ? 'Filing' : 'File The Report'}</button>
                <span style={{ fontSize: 13, color: MUTED }}>If the {DEBRIEF_MINUTES} minutes run out, it files as written.</span>
              </div>
            </div>
          )}
          {state === 'filed' && run.word && <div style={{ marginTop: 20, maxWidth: 760 }}><div style={{ fontSize: 14, fontWeight: 600, color: LABEL, marginBottom: 4 }}>Your Word</div><div style={{ fontSize: 14.5, lineHeight: 1.55, color: INK }}>{run.word}</div></div>}
        </div>
      )}
    </section>
  )
}
