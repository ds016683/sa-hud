// Recurring Missions: the standing chores of a working day. One tap starts a
// work timer, a second tap stops it and logs the span to Harvest under
// Business Administration (the HUD's time door does that mapping). No miles
// for the timers; Slack clean is the one that pays (Clean Slack, 10, at the close).
//
// Each card wears a light at its top right. Green: no maintenance needed.
// Gold: maintenance required. Red: necessary or critical. Blinking red: there
// may be something serious being overlooked. The thresholds are David's.
import { useEffect, useState, useCallback } from 'react'
import { Play, Square, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { upsertSession, logToHarvest, hoursBetween } from '../../lib/meetings'
import { chiToday, fmtClock } from '../../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GREEN, RED, MONO, Panel } from './canon'

// Add a chore here and it appears as a button. slug is the Harvest note and
// the session key; label is what David sees. light picks the rule below.
export const RECURRING = [
  { slug: 'email-refresh',  label: 'E-mail Refresh',  light: 'email' },
  { slug: 'slack-review',   label: 'Slack Review',    light: 'slack', clean: true },
  { slug: 'calendar-sweep', label: 'Calendar Sweep' },
  // Daily Planning folded into the Morning Protocol (10/6).
  { slug: 'bill-pay',       label: 'Bill Pay',        light: 'bill' },
  { slug: 'thinking',       label: 'Thinking' },
]

// Light rules (David, 10/1). Each returns { level, blink, text }.
const LEVEL = { green: GREEN, gold: GOLD, red: RED, gray: 'rgba(234,241,248,0.25)' }
const RULES = {
  email: (L) => {
    const n = L?.email?.unread
    if (n == null) return { level: 'gray', text: L?.email?.error ? `inbox count unavailable: ${L.email.error}` : 'inbox count unavailable' }
    if (n >= 125) return { level: 'red', blink: true, text: `${n} unread · something is being overlooked` }
    if (n >= 50) return { level: 'red', text: `${n} unread · critical` }
    if (n >= 20) return { level: 'gold', text: `${n} unread · maintenance required` }
    return { level: 'green', text: `${n} unread` }
  },
  slack: (L) => {
    const n = L?.slack?.unread
    if (n == null) return { level: 'gray', text: 'no Slack count yet · click the light to set it, or tell Lumen' }
    const asOf = L.slack.as_of ? ` · as of ${new Date(L.slack.as_of).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })}` : ''
    if (n >= 35) return { level: 'red', blink: true, text: `${n} unread · something is being overlooked${asOf}` }
    if (n >= 20) return { level: 'red', text: `${n} unread · critical${asOf}` }
    if (n >= 5) return { level: 'gold', text: `${n} unread · maintenance required${asOf}` }
    return { level: 'green', text: `${n} unread${asOf}` }
  },
  bill: (L) => {
    const d = L?.bill_pay?.days
    if (d == null) return { level: 'gold', text: 'no Bill Pay on record yet · the clock starts with the first one' }
    if (d >= 15) return { level: 'red', blink: true, text: `${d} days since Bill Pay · overlooked?` }
    if (d >= 12) return { level: 'red', text: `${d} days since Bill Pay · critical` }
    if (d >= 8) return { level: 'gold', text: `${d} days since Bill Pay · due` }
    return { level: 'green', text: `${d} day${d === 1 ? '' : 's'} since Bill Pay` }
  },
  planning: (L) => {
    if (L?.planning?.done) return { level: 'green', text: 'planned today' }
    if (L?.planning?.running) return { level: 'green', text: 'planning now' }
    return { level: 'gold', text: 'not planned yet today' }
  },
}

const eid = (day, slug) => `adhoc:${day}:${slug}`

function Light({ rule, onClick }) {
  if (!rule) return null
  const color = LEVEL[rule.level] || LEVEL.gray
  return (
    <span onClick={(e) => { e.stopPropagation(); onClick && onClick() }} title={rule.text} className={rule.blink ? 'rc-blink' : ''} style={{
      position: 'absolute', top: 10, right: 10, width: 9, height: 9, borderRadius: 99, background: color,
      boxShadow: rule.level === 'gray' ? 'none' : `0 0 0 3px ${color}33, 0 0 10px ${color}66`, cursor: onClick ? 'pointer' : 'default',
    }} />
  )
}

export default function RecurringPanel({ onChange }) {
  const [sessions, setSessions] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const [slackClean, setSlackClean] = useState(null) // daily_logs row id when marked
  const [lights, setLights] = useState(null)
  const day = chiToday()

  const refresh = useCallback(async () => {
    const { data } = await supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,hours,harvest_logged').eq('day', day).like('event_id', 'adhoc:%')
    setSessions(Array.isArray(data) ? data : [])
    const { data: sc } = await supabase.from('daily_logs').select('id').eq('day', day).eq('kind', 'activity').eq('what', 'slack-clean').limit(1)
    setSlackClean(Array.isArray(sc) && sc.length ? sc[0].id : null)
  }, [day])
  const pullLights = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const r = await fetch('/api/lights', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
      if (r.ok) setLights(await r.json())
    } catch { /* lights stay as they were */ }
  }, [])
  useEffect(() => { refresh(); pullLights() }, [refresh, pullLights])
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); pullLights() }, 60_000); return () => clearInterval(t) }, [pullLights])

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
      await refresh(); pullLights(); onChange && onChange()
    } catch (e) { setMsg(`Could not stop: ${e.message}`) }
  }
  const markSlack = async () => {
    try {
      if (slackClean) { await supabase.from('daily_logs').delete().eq('id', slackClean); setMsg('Slack clean mark removed') }
      else { const { error } = await supabase.from('daily_logs').insert({ day, kind: 'activity', what: 'slack-clean', value: 1, note: 'marked on the Board', source: 'hud' }); if (error) throw new Error(error.message); setMsg('Slack clean today · Clean Slack strikes at the close') }
      await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not mark it: ${e.message}`) }
  }
  // Until the Slack pipe exists, the count is set by hand (or by Lumen).
  const setSlackCount = async () => {
    const v = window.prompt('Unread Slack messages right now?', lights?.slack?.unread ?? '')
    if (v === null || v.trim() === '' || isNaN(Number(v))) return
    const { error } = await supabase.from('daily_logs').insert({ day, kind: 'activity', what: 'slack-unread', value: Number(v), note: 'set on the Board', source: 'hud', at: new Date().toISOString() })
    if (error) { setMsg(`Could not save: ${error.message}`); return }
    setMsg(`Slack unread set to ${Number(v)}`); pullLights()
  }

  return (
    <Panel style={{ marginBottom: 0 }}>
      <style>{`@keyframes rcblink { 0%,100% { opacity: 1 } 50% { opacity: .15 } } .rc-blink { animation: rcblink 1s ease-in-out infinite }`}</style>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {RECURRING.map(r => {
          const s = byId.get(eid(day, r.slug))
          const running = !!(s && s.started_at && !s.stopped_at)
          const liveMin = running ? (now - new Date(s.started_at).getTime()) / 60000 : 0
          const todayMin = ((Number(s?.hours) || 0) * 60) + liveMin
          const rule = r.light && RULES[r.light] ? RULES[r.light](lights) : null
          return (
            <div key={r.slug} style={{ position: 'relative', minWidth: 170, display: 'flex' }}>
              <button onClick={() => running ? stop(r) : start(r)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, flex: 1, padding: '10px 14px', paddingRight: 28, borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                border: `1px solid ${running ? GREEN : PANEL_BORDER}`, background: running ? 'rgba(67,211,146,0.08)' : 'rgba(255,255,255,0.03)', color: INK,
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
                  {running ? <Square size={12} color={GREEN} fill={GREEN} /> : <Play size={12} color={INK2} />}
                  {r.label}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.6px', color: running ? GREEN : GRAY }}>
                  {running ? `running · ${fmtClock(liveMin)}` : todayMin > 0 ? `${fmtClock(todayMin)} today` : 'tap to start'}
                </span>
                {r.clean && (
                  <span onClick={(e) => { e.stopPropagation(); markSlack() }} title="Clean Slack: 10 miles at the close" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: slackClean ? GOLD : GRAY, marginTop: 2 }}>
                    <Check size={10} /> {slackClean ? 'clean today · 10 mi at the close' : 'mark clean'}
                  </span>
                )}
              </button>
              <Light rule={rule} onClick={r.light === 'slack' && lights?.slack?.source !== 'slack' ? setSlackCount : undefined} />
            </div>
          )
        })}
      </div>
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') || msg.includes('did not') ? RED : GOLD, textTransform: 'uppercase', marginTop: 10 }}>{msg}</div>}
    </Panel>
  )
}
