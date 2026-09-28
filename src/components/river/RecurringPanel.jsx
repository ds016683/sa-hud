// Recurring Missions: the standing chores of a working day. One tap starts a
// work timer, a second tap stops it and logs the span to Harvest under
// Business Administration (the HUD's time door does that mapping). No miles:
// email and Slack are caught upstream by Clean Close and Full Day.
import { useEffect, useState, useCallback } from 'react'
import { Play, Square, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { upsertSession, logToHarvest, hoursBetween } from '../../lib/meetings'
import { chiToday, fmtClock } from '../../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GREEN, RED, MONO, S, Panel } from './canon'

// Add a chore here and it appears as a button. slug is the Harvest note and
// the session key; label is what David sees.
export const RECURRING = [
  { slug: 'email-refresh', label: 'E-mail Refresh' },
  { slug: 'slack-review',  label: 'Slack Review' },
  { slug: 'calendar-sweep', label: 'Calendar Sweep' },
]

const eid = (day, slug) => `adhoc:${day}:${slug}`

export default function RecurringPanel({ onChange }) {
  const [sessions, setSessions] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const [slackClean, setSlackClean] = useState(null) // daily_logs row id when marked
  const day = chiToday()
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,hours,harvest_logged').eq('day', day).like('event_id', 'adhoc:%')
    setSessions(Array.isArray(data) ? data : [])
    const { data: sc } = await supabase.from('daily_logs').select('id').eq('day', day).eq('kind', 'activity').eq('what', 'slack-clean').limit(1)
    setSlackClean(Array.isArray(sc) && sc.length ? sc[0].id : null)
  }, [day])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const byId = new Map(sessions.map(s => [s.event_id, s]))
  const runningAny = sessions.find(s => s.started_at && !s.stopped_at)

  const start = async (r) => {
    try {
      if (runningAny && runningAny.event_id !== eid(day, r.slug)) { setMsg(`${runningAny.subject} is already running. Stop it first.`); return }
      await upsertSession({ event_id: eid(day, r.slug), day, subject: r.label, started_at: new Date().toISOString(), stopped_at: null })
      setMsg(`${r.label} started`); await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }
  const stop = async (r) => {
    try {
      const s = byId.get(eid(day, r.slug))
      if (!s || !s.started_at) return
      const stopped = new Date().toISOString()
      const span = Math.max(0.01, hoursBetween(s.started_at, stopped))
      const hours = Math.round(((Number(s.hours) || 0) + span) * 100) / 100
      let logged = false
      try { await logToHarvest(r.label, Math.round(span * 100) / 100); logged = true } catch (e) { setMsg(`Timer stopped; Harvest did not take it: ${e.message}`) }
      await upsertSession({ event_id: eid(day, r.slug), day, subject: r.label, started_at: s.started_at, stopped_at: stopped, hours, harvest_logged: logged || !!s.harvest_logged })
      if (logged) setMsg(`${r.label}: ${fmtClock(span * 60)} logged to Harvest`)
      await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not stop: ${e.message}`) }
  }

  const markSlack = async () => {
    try {
      if (slackClean) { await supabase.from('daily_logs').delete().eq('id', slackClean); setMsg('Slack clean mark removed') }
      else { const { error } = await supabase.from('daily_logs').insert({ day, kind: 'activity', what: 'slack-clean', value: 1, note: 'marked on the Board', source: 'hud' }); if (error) throw new Error(error.message); setMsg('Slack clean today · Clean Slack strikes at the close') }
      await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not mark it: ${e.message}`) }
  }

  return (
    <Panel title="Recurring Missions" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {RECURRING.map(r => {
          const s = byId.get(eid(day, r.slug))
          const running = !!(s && s.started_at && !s.stopped_at)
          const liveMin = running ? (now - new Date(s.started_at).getTime()) / 60000 : 0
          const todayMin = ((Number(s?.hours) || 0) * 60) + liveMin
          return (
            <button key={r.slug} onClick={() => running ? stop(r) : start(r)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minWidth: 170, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${running ? GREEN : PANEL_BORDER}`, background: running ? 'rgba(67,211,146,0.08)' : 'rgba(255,255,255,0.03)', color: INK,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                {running ? <Square size={12} color={GREEN} fill={GREEN} /> : <Play size={12} color={INK2} />}
                {r.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: running ? GREEN : GRAY }}>
                {running ? `running · ${fmtClock(liveMin)}` : todayMin > 0 ? `${fmtClock(todayMin)} today` : 'tap to start'}
              </span>
            </button>
          )
        })}
        <button onClick={markSlack} title="Clean Slack: 10 miles at the close" style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minWidth: 170, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
          border: `1px solid ${slackClean ? GOLD : PANEL_BORDER}`, background: slackClean ? 'rgba(230,181,79,0.10)' : 'rgba(255,255,255,0.03)', color: INK,
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
            <Check size={12} color={slackClean ? GOLD : INK2} /> Slack clean
          </span>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: slackClean ? GOLD : GRAY }}>{slackClean ? 'marked · 10 mi at the close' : 'mark when fully caught up'}</span>
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: GRAY }}>Tap to start, tap again to stop. Time logs to Harvest under Business Administration. No miles for the timers; Slack clean is the one that pays (Clean Slack, 10, at the close).</span>
        {msg && <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') || msg.includes('did not') ? RED : GOLD, textTransform: 'uppercase' }}>{msg}</span>}
      </div>
    </Panel>
  )
}
