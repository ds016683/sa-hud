// Release: the manual's phase for letting go, surrendering outcomes. Personal
// timers, tracked only in the HUD (never Harvest), with start and stop stamps
// so David's time can be studied later. Gaming asks which game.
import { useEffect, useState, useCallback } from 'react'
import { Play, Square } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { chiToday, fmtClock } from '../../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, RED, MONO, Panel } from './canon'

export const RELEASE_TIMERS = [
  { slug: 'gaming', label: 'Gaming', ask: 'Which game?' },
  { slug: 'nap',    label: 'Nap' },
  { slug: 'drive',  label: 'Drive' },
]
const TEAL = '#5FC9C0'

// One session row per run: personal:<day>:<slug>:<HHMMSS>. Stamps live in
// meeting_sessions (started_at / stopped_at); the day's minutes land in
// daily_logs as a personal activity so the River and the Activity page see them.
const prefix = (day, slug) => `personal:${day}:${slug}:`
const chiClock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })

export default function ReleasePanel({ onChange }) {
  const [rows, setRows] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const day = chiToday()
  const refresh = useCallback(async () => {
    const { data } = await supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,hours').eq('day', day).like('event_id', 'personal:%')
    setRows(Array.isArray(data) ? data : [])
  }, [day])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t) }, [])

  const runsFor = (slug) => rows.filter(r => r.event_id.startsWith(prefix(day, slug)))
  const runningFor = (slug) => runsFor(slug).find(r => r.started_at && !r.stopped_at)
  const runningAny = rows.find(r => r.started_at && !r.stopped_at)

  const start = async (t) => {
    try {
      if (runningAny) { setMsg(`${runningAny.subject} is already running. Stop it first.`); return }
      let detail = null
      if (t.ask) { detail = window.prompt(t.ask, '') ; if (detail === null) return; detail = detail.trim() || null }
      const startedAt = new Date()
      const stamp = startedAt.toISOString().slice(11, 19).replace(/:/g, '')
      const subject = detail ? `${t.label}: ${detail}` : t.label
      const { error } = await supabase.from('meeting_sessions').insert({ event_id: `${prefix(day, t.slug)}${stamp}`, day, subject, started_at: startedAt.toISOString(), attended_at: startedAt.toISOString(), harvest_logged: false })
      if (error) throw new Error(error.message)
      setMsg(`${subject} started · personal, not Harvest`); await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }
  const stop = async (t) => {
    try {
      const r = runningFor(t.slug)
      if (!r) return
      const stopped = new Date()
      const minutes = Math.max(1, Math.round((stopped - new Date(r.started_at)) / 60000))
      const hours = Math.round(minutes / 60 * 100) / 100
      const { error } = await supabase.from('meeting_sessions').update({ stopped_at: stopped.toISOString(), hours, harvest_logged: false }).eq('event_id', r.event_id)
      if (error) throw new Error(error.message)
      await supabase.from('daily_logs').insert({
        day, kind: 'activity', what: r.subject.toLowerCase(), value: minutes,
        note: `personal · ${t.label.toLowerCase()} timer · ${chiClock(r.started_at)} to ${chiClock(stopped.toISOString())} CT`,
        source: `timer:${t.slug}`, at: stopped.toISOString(),
      })
      setMsg(`${r.subject}: ${fmtClock(minutes)} · kept in the HUD only`); await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not stop: ${e.message}`) }
  }

  return (
    <Panel title="Release · letting go, surrendering outcomes" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {RELEASE_TIMERS.map(t => {
          const r = runningFor(t.slug)
          const running = !!r
          const liveMin = running ? (now - new Date(r.started_at).getTime()) / 60000 : 0
          const todayMin = runsFor(t.slug).filter(x => x.stopped_at).reduce((s, x) => s + (Number(x.hours) || 0) * 60, 0) + liveMin
          return (
            <button key={t.slug} onClick={() => running ? stop(t) : start(t)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, minWidth: 170, padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
              border: `1px solid ${running ? TEAL : PANEL_BORDER}`, background: running ? 'rgba(95,201,192,0.08)' : 'rgba(255,255,255,0.03)', color: INK,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                {running ? <Square size={12} color={TEAL} fill={TEAL} /> : <Play size={12} color={INK2} />}
                {running ? r.subject : t.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: running ? TEAL : GRAY }}>
                {running ? `running · ${fmtClock(liveMin)}` : todayMin > 0 ? `${fmtClock(todayMin)} today` : 'tap to start'}
              </span>
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: GRAY }}>Personal time. Stamped in the HUD only, never Harvest, so the pattern can be studied later. No miles.</span>
        {msg && <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') ? RED : GOLD, textTransform: 'uppercase' }}>{msg}</span>}
      </div>
    </Panel>
  )
}
