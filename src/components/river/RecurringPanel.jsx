// Recurring Missions: the standing chores of a working day, laid out as a
// dashboard. Two kinds of card:
//   Tending  (E-mail, Slack, Bill Pay) wear a status light and show their
//            reading (unread count, days since) right on the card.
//   Timers   (Calendar Sweep, Thinking, Travel) are plain: tap to start,
//            tap to stop.
// One tap starts a work timer, a second tap stops it and logs the span to
// Harvest under Business Administration (the HUD's time door does that
// mapping). No miles for the timers; Slack clean is the one that pays (Clean
// Slack, 10, at the close). One timer at a time, except Travel, which runs
// alongside anything (David, 10/7): it reads today's calendar for the flight
// or drive, proposes the span, and lets him edit before logging.
//
// Lights: green no maintenance needed, gold maintenance required, red
// necessary or critical, blinking red something serious may be overlooked.
// The thresholds are David's (10/1).
import { useEffect, useState, useCallback } from 'react'
import { Play, Square, Check, Plane, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { upsertSession, logToHarvest, hoursBetween } from '../../lib/meetings'
import { chiToday, fmtClock } from '../../lib/loadout'
import { INK, INK2, GRAY, PANEL_BORDER, GOLD, GREEN, RED, BLUE, MONO, SERIF, Label, Panel, fmtTime } from './canon'

// Add a chore here and it appears as a card. slug is the Harvest note and
// the session key; label is what David sees. light picks the rule below;
// group places it (tend = lit dashboard card, timer = plain button).
export const RECURRING = [
  { slug: 'email-refresh',  label: 'E-mail Refresh',  light: 'email', group: 'tend' },
  { slug: 'slack-review',   label: 'Slack Review',    light: 'slack', group: 'tend', clean: true },
  { slug: 'bill-pay',       label: 'Bill Pay',        light: 'bill',  group: 'tend' },
  { slug: 'calendar-sweep', label: 'Calendar Sweep',  group: 'timer' },
  { slug: 'thinking',       label: 'Thinking',        group: 'timer' },
  // Daily Planning folded into the Morning Protocol (10/6).
  { slug: 'travel',         label: 'Travel',          group: 'timer', travel: true, concurrent: true },
]
export const CONCURRENT = RECURRING.filter(r => r.concurrent).map(r => r.slug)

// Light rules (David, 10/1). Each returns { level, blink, reading, unit, text }.
const LEVEL = { green: GREEN, gold: GOLD, red: RED, gray: 'rgba(234,241,248,0.25)' }
const WORD = { green: 'clear', gold: 'maintenance required', red: 'critical', gray: 'no reading' }
const RULES = {
  email: (L) => {
    const n = L?.email?.unread
    if (n == null) return { level: 'gray', reading: '—', unit: 'unread', text: L?.email?.error ? `inbox count unavailable: ${L.email.error}` : 'inbox count unavailable' }
    const level = n >= 50 ? 'red' : n >= 20 ? 'gold' : 'green'
    return { level, blink: n >= 125, reading: n, unit: 'unread', text: n >= 125 ? 'something is being overlooked' : WORD[level] }
  },
  slack: (L) => {
    const n = L?.slack?.unread
    if (n == null) return { level: 'gray', reading: '—', unit: 'unread', text: 'no count yet · click the light to set it, or tell Lumen' }
    const asOf = L.slack.as_of ? ` · as of ${fmtTime(L.slack.as_of)}` : ''
    const level = n >= 20 ? 'red' : n >= 5 ? 'gold' : 'green'
    return { level, blink: n >= 35, reading: n, unit: 'unread', text: (n >= 35 ? 'something is being overlooked' : WORD[level]) + asOf }
  },
  bill: (L) => {
    const d = L?.bill_pay?.days
    if (d == null) return { level: 'gold', reading: '—', unit: 'days', text: 'no Bill Pay on record yet · the clock starts with the first one' }
    const level = d >= 12 ? 'red' : d >= 8 ? 'gold' : 'green'
    return { level, blink: d >= 15, reading: d, unit: d === 1 ? 'day since' : 'days since', text: d >= 15 ? 'overlooked?' : d >= 8 && d < 12 ? 'due' : WORD[level] }
  },
}

const eid = (day, slug) => `adhoc:${day}:${slug}`
const TRAVEL_RE = /\b(flight|airlines?|airways|amtrak|train|drive to|driving|travel|uber|lyft|airport|depart|arriv|road trip)\b/i
const chiHHMM = (iso) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
// HH:MM on `day` in Chicago -> ISO.
const chiToIso = (day, hhmm) => {
  const guess = new Date(`${day}T${hhmm}:00Z`)
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour12: false, hour: '2-digit', minute: '2-digit' }).formatToParts(guess).map(x => [x.type, x.value]))
  const [H, M] = hhmm.split(':').map(Number)
  const diff = (H * 60 + M) - ((Number(p.hour) % 24) * 60 + Number(p.minute))
  return new Date(guess.getTime() + diff * 60000).toISOString()
}

const btn = (color = INK2, filled = false, extra = {}) => ({
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase',
  padding: '5px 9px', borderRadius: 8, border: `1px solid ${filled ? color : `${color}66`}`, background: filled ? color : 'transparent',
  color: filled ? '#0A1B2B' : color, cursor: 'pointer', ...extra,
})
const CTRL = { fontFamily: MONO, fontSize: 12, padding: '6px 8px', borderRadius: 8, border: `1px solid ${PANEL_BORDER}`, background: 'rgba(255,255,255,0.05)', color: INK }

function Light({ rule, onClick, size = 9 }) {
  if (!rule) return null
  const color = LEVEL[rule.level] || LEVEL.gray
  return (
    <span onClick={onClick ? (e) => { e.stopPropagation(); onClick() } : undefined} title={rule.text} className={rule.blink ? 'rc-blink' : ''} style={{
      display: 'inline-block', width: size, height: size, borderRadius: 99, background: color, flex: `0 0 ${size}px`,
      boxShadow: rule.level === 'gray' ? 'none' : `0 0 0 3px ${color}33, 0 0 10px ${color}66`, cursor: onClick ? 'pointer' : 'default',
    }} />
  )
}

export default function RecurringPanel({ onChange }) {
  const [sessions, setSessions] = useState([])
  const [events, setEvents] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const [msg, setMsg] = useState(null)
  const [slackClean, setSlackClean] = useState(null) // daily_logs row id when marked
  const [lights, setLights] = useState(null)
  const [travelEdit, setTravelEdit] = useState(null)  // { label, start, end, personal }
  const day = chiToday()

  const refresh = useCallback(async () => {
    const [{ data }, { data: sc }, { data: ev }] = await Promise.all([
      supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,hours,harvest_logged,special_notes').eq('day', day).like('event_id', 'adhoc:%'),
      supabase.from('daily_logs').select('id').eq('day', day).eq('kind', 'activity').eq('what', 'slack-clean').limit(1),
      supabase.from('calendar_events').select('id,subject,start_at,end_at,is_all_day').eq('day', day).eq('is_cancelled', false).order('start_at'),
    ])
    setSessions(Array.isArray(data) ? data : [])
    setSlackClean(Array.isArray(sc) && sc.length ? sc[0].id : null)
    setEvents(Array.isArray(ev) ? ev : [])
  }, [day])
  const pullLights = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const r = await fetch('/api/lights', { headers: { Authorization: `Bearer ${session.access_token}` }, cache: 'no-store' })
      if (r.ok) setLights(await r.json())
    } catch { /* lights stay as they were */ }
  }, [])
  useEffect(() => { Promise.resolve().then(() => { refresh(); pullLights() }) }, [refresh, pullLights])
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); pullLights() }, 60_000); return () => clearInterval(t) }, [pullLights])

  const byId = new Map(sessions.map(s => [s.event_id, s]))
  const isRunning = (s) => !!(s && s.started_at && !s.stopped_at)
  // The one-at-a-time rule ignores Travel (and Travel ignores it).
  const runningOther = (slug) => sessions.find(s => isRunning(s) && s.event_id !== eid(day, slug) && !CONCURRENT.some(c => s.event_id === eid(day, c)))

  const start = async (r) => {
    try {
      const other = r.concurrent ? null : runningOther(r.slug)
      if (other) { setMsg(`${other.subject} is already running. Stop it first.`); return }
      await upsertSession({ event_id: eid(day, r.slug), day, subject: r.label, started_at: new Date().toISOString(), stopped_at: null })
      setMsg(`${r.label} started`); await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }
  // Close a span: Harvest (unless personal), then the session row.
  const closeSpan = async (r, s, startedIso, stoppedIso, { label, personal } = {}) => {
    const span = Math.max(0.01, hoursBetween(startedIso, stoppedIso))
    const hours = Math.round(((Number(s?.hours) || 0) + span) * 100) / 100
    const title = label ? `${r.label} · ${label}` : r.label
    let logged = false
    if (personal) {
      const { error } = await supabase.from('daily_logs').insert({ day, kind: 'activity', what: 'travel', value: Math.round(span * 60), note: `personal · ${title}`, source: `timer:${r.slug}`, at: stoppedIso })
      if (error) setMsg(`Timer stopped; the Ledger did not take it: ${error.message}`)
    } else {
      try { await logToHarvest(title, Math.round(span * 100) / 100); logged = true } catch (e) { setMsg(`Timer stopped; Harvest did not take it: ${e.message}`) }
    }
    await upsertSession({ event_id: eid(day, r.slug), day, subject: title, started_at: s?.started_at || startedIso, stopped_at: stoppedIso, hours, harvest_logged: logged || !!s?.harvest_logged, special_notes: personal ? 'personal' : null })
    if (logged || personal) setMsg(`${title}: ${fmtClock(span * 60)} ${personal ? 'logged to the Ledger (personal)' : 'logged to Harvest'}`)
    await refresh(); pullLights(); onChange && onChange()
  }
  const stop = async (r) => {
    try {
      const s = byId.get(eid(day, r.slug))
      if (!isRunning(s)) return
      await closeSpan(r, s, s.started_at, new Date().toISOString(), { personal: s.special_notes === 'personal' })
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

  // ---- Travel: read the calendar, propose the next leg not yet covered.
  const travelSession = byId.get(eid(day, 'travel'))
  const coveredUntil = travelSession?.stopped_at ? new Date(travelSession.stopped_at).getTime() : 0
  const legs = events.filter(e => !e.is_all_day && TRAVEL_RE.test(e.subject || ''))
  const nextLeg = legs.find(e => new Date(e.end_at).getTime() > coveredUntil) || null
  const legState = nextLeg ? (new Date(nextLeg.end_at).getTime() <= now ? 'past' : new Date(nextLeg.start_at).getTime() <= now ? 'live' : 'ahead') : null
  const openTravelEdit = () => setTravelEdit({
    label: nextLeg ? nextLeg.subject : '', start: nextLeg ? chiHHMM(nextLeg.start_at) : chiHHMM(new Date(now - 3600e3).toISOString()), end: nextLeg ? chiHHMM(nextLeg.end_at) : chiHHMM(new Date(now).toISOString()), personal: false,
  })
  const logTravelSpan = async ({ label, start, end, personal }) => {
    try {
      const r = RECURRING.find(x => x.slug === 'travel')
      const a = chiToIso(day, start), b = chiToIso(day, end)
      if (!(new Date(b) > new Date(a))) { setMsg('Could not log: the end is before the start.'); return }
      await closeSpan(r, travelSession, a, b, { label: label || nextLeg?.subject || '', personal })
      setTravelEdit(null)
    } catch (e) { setMsg(`Could not log travel: ${e.message}`) }
  }
  const startTravelNow = async () => {
    try {
      const r = RECURRING.find(x => x.slug === 'travel')
      // A live leg starts its clock at the leg's own start, so the span is whole.
      const startedAt = legState === 'live' ? nextLeg.start_at : new Date().toISOString()
      await upsertSession({ event_id: eid(day, 'travel'), day, subject: nextLeg ? `${r.label} · ${nextLeg.subject}` : r.label, started_at: startedAt, stopped_at: null, hours: travelSession?.hours || 0 })
      setMsg(`Travel started${legState === 'live' ? ` at ${fmtTime(startedAt)}` : ''}`); await refresh(); onChange && onChange()
    } catch (e) { setMsg(`Could not start: ${e.message}`) }
  }

  const minutesOf = (s) => ((Number(s?.hours) || 0) * 60) + (isRunning(s) ? (now - new Date(s.started_at).getTime()) / 60000 : 0)

  return (
    <Panel style={{ marginBottom: 0 }}>
      <style>{`@keyframes rcblink { 0%,100% { opacity: 1 } 50% { opacity: .15 } } .rc-blink { animation: rcblink 1s ease-in-out infinite }`}</style>
      {/* Tending: lit cards with their reading */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
        {RECURRING.filter(r => r.group === 'tend').map(r => {
          const s = byId.get(eid(day, r.slug)); const running = isRunning(s); const mins = minutesOf(s)
          const rule = RULES[r.light](lights); const c = LEVEL[rule.level]
          return (
            <div key={r.slug} onClick={() => running ? stop(r) : start(r)} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px 12px 16px', borderRadius: 12, cursor: 'pointer', borderLeft: `3px solid ${c}`, border: `1px solid ${running ? GREEN : PANEL_BORDER}`, borderLeftWidth: 3, borderLeftColor: c, background: running ? 'rgba(67,211,146,0.08)' : 'rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Light rule={rule} onClick={r.light === 'slack' && lights?.slack?.source !== 'slack' ? setSlackCount : undefined} />
                <span style={{ fontSize: 13, color: INK, flex: 1 }}>{r.label}</span>
                {running ? <Square size={11} color={GREEN} fill={GREEN} /> : <Play size={11} color={GRAY} />}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: SERIF, fontSize: 28, lineHeight: 1, color: lights ? '#fff' : GRAY }}>{lights ? rule.reading : '…'}</span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: GRAY }}>{rule.unit}</span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.8px', color: rule.level === 'green' ? GREEN : rule.level === 'gray' ? GRAY : c, textTransform: 'uppercase' }} title={rule.text}>{lights ? rule.text : 'reading…'}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: running ? GREEN : GRAY }}>{running ? `running · ${fmtClock(mins)}` : mins > 0 ? `${fmtClock(mins)} today` : 'tap to start'}</span>
                {r.clean && (
                  <span onClick={(e) => { e.stopPropagation(); markSlack() }} title="Clean Slack: 10 miles at the close" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 9, letterSpacing: '1px', textTransform: 'uppercase', color: slackClean ? GOLD : GRAY }}>
                    <Check size={10} /> {slackClean ? 'clean · 10 mi' : 'mark clean'}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {/* Timers: plain buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
        <Label style={{ marginRight: 4 }}>Timers</Label>
        {RECURRING.filter(r => r.group === 'timer' && !r.travel).map(r => {
          const s = byId.get(eid(day, r.slug)); const running = isRunning(s); const mins = minutesOf(s)
          return (
            <button key={r.slug} onClick={() => running ? stop(r) : start(r)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 999, cursor: 'pointer', border: `1px solid ${running ? GREEN : PANEL_BORDER}`, background: running ? 'rgba(67,211,146,0.08)' : 'rgba(255,255,255,0.03)', color: INK, fontSize: 13 }}>
              {running ? <Square size={11} color={GREEN} fill={GREEN} /> : <Play size={11} color={INK2} />}{r.label}
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: running ? GREEN : GRAY }}>{running ? fmtClock(mins) : mins > 0 ? `${fmtClock(mins)} today` : ''}</span>
            </button>
          )
        })}
        {/* Travel: concurrent, calendar-aware */}
        {(() => {
          const running = isRunning(travelSession); const mins = minutesOf(travelSession)
          const hint = running ? `running · ${fmtClock(mins)}` : nextLeg ? `${nextLeg.subject} · ${fmtTime(nextLeg.start_at)} to ${fmtTime(nextLeg.end_at)}` : mins > 0 ? `${fmtClock(mins)} today` : 'nothing on the calendar · edit to log a span'
          return (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 8px 6px 12px', borderRadius: 999, border: `1px solid ${running ? GREEN : nextLeg ? `${BLUE}88` : PANEL_BORDER}`, background: running ? 'rgba(67,211,146,0.08)' : nextLeg ? 'rgba(169,201,232,0.07)' : 'rgba(255,255,255,0.03)', color: INK, fontSize: 13 }}>
              <Plane size={12} color={running ? GREEN : BLUE} /> Travel
              <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.6px', color: running ? GREEN : GRAY, maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={hint}>{hint}</span>
              {running
                ? <button onClick={() => stop(RECURRING.find(x => x.slug === 'travel'))} style={btn(GREEN)}><Square size={10} fill={GREEN} /> Stop</button>
                : <>
                  {legState === 'past' && <button onClick={() => logTravelSpan({ label: nextLeg.subject, start: chiHHMM(nextLeg.start_at), end: chiHHMM(nextLeg.end_at), personal: false })} style={btn(BLUE, true)}><Check size={10} /> Log {fmtClock(hoursBetween(nextLeg.start_at, nextLeg.end_at) * 60)}</button>}
                  {(legState === 'live' || legState === 'ahead' || !nextLeg) && <button onClick={startTravelNow} style={btn(BLUE, legState === 'live')}><Play size={10} /> {legState === 'live' ? `Start from ${fmtTime(nextLeg.start_at)}` : 'Start'}</button>}
                  <button onClick={openTravelEdit} title="Edit the span before logging" style={btn(INK2)}><Pencil size={10} /> Edit</button>
                </>}
            </span>
          )
        })()}
      </div>
      {travelEdit && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 10, padding: '10px 12px', borderRadius: 10, border: `1px solid ${BLUE}55`, background: 'rgba(169,201,232,0.05)' }}>
          <Label style={{ color: BLUE }}>Travel · log a span</Label>
          <input value={travelEdit.label} onChange={e => setTravelEdit(t => ({ ...t, label: e.target.value }))} placeholder="What (flight, drive)" style={{ ...CTRL, fontFamily: 'inherit', minWidth: 220, flex: 1 }} />
          <input type="time" value={travelEdit.start} onChange={e => setTravelEdit(t => ({ ...t, start: e.target.value }))} style={CTRL} />
          <span style={{ color: GRAY, fontSize: 12 }}>to</span>
          <input type="time" value={travelEdit.end} onChange={e => setTravelEdit(t => ({ ...t, end: e.target.value }))} style={CTRL} />
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '1px', textTransform: 'uppercase', color: travelEdit.personal ? GOLD : GRAY, cursor: 'pointer' }}>
            <input type="checkbox" checked={travelEdit.personal} onChange={e => setTravelEdit(t => ({ ...t, personal: e.target.checked }))} /> personal · not Harvest
          </label>
          <button onClick={() => logTravelSpan(travelEdit)} style={btn(BLUE, true)}><Check size={10} /> Log</button>
          <button onClick={() => setTravelEdit(null)} style={btn(INK2)}>Cancel</button>
        </div>
      )}
      {msg && <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '1px', color: msg.startsWith('Could not') || msg.includes('did not') ? RED : GOLD, textTransform: 'uppercase', marginTop: 10 }}>{msg}</div>}
    </Panel>
  )
}
