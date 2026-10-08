// What David is doing right now, read from the Ledger (David, 10/8): the top
// bar's protocol pill says it. One state at a time, highest first:
//   Emergency   flagged only for now (a daily_logs row what 'emergency' today, not cleared)
//   Meeting     a calendar meeting's timer is running, or a meeting is live on the calendar
//   Morning / Evening   the protocol timer is running: working the morning, working the evening
//   Travel      the Travel timer is running: on the road
//   Mission     a clock is running on a loaded item: in mission
//   Rest        a Release timer is running (Gaming, Nap, Drive): resting
//   Off         nothing running
import { supabase } from './supabase'
import { chiToday, SIZES, sizeOf } from './loadout'

const q = (p) => p.then(r => (Array.isArray(r.data) ? r.data : []))
const readStep = (day) => { try { const v = Number(localStorage.getItem(`mp-step:${day}`)); return Number.isFinite(v) ? v : 0 } catch { return 0 } }

export const PROTOCOLS = {
  emergency: { label: 'Emergency', color: '#E8836F', blink: true },
  meeting:   { label: 'In a meeting', color: '#A9C9E8' },
  morning:   { label: 'Working the morning', color: '#F8C761' },
  evening:   { label: 'Working the evening', color: '#96A8F0' },
  travel:    { label: 'On the road', color: '#5FC9C0' },
  mission:   { label: 'In mission', color: '#43D392' },
  rest:      { label: 'Resting', color: '#B4A3E8' },
  off:       { label: 'Off protocol', color: 'rgba(234,241,248,0.35)' },
}

export async function fetchProtocolState() {
  const day = chiToday(); const nowMs = Date.now(); const nowIso = new Date(nowMs).toISOString()
  const [running, clocks, events, flags] = await Promise.all([
    q(supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at').eq('day', day).not('started_at', 'is', null).is('stopped_at', null)),
    q(supabase.from('clocks').select('id,objective_id,started_at').is('stopped_at', null).limit(1)),
    q(supabase.from('calendar_events').select('id,subject,start_at,end_at,is_all_day').eq('day', day).eq('is_cancelled', false)),
    q(supabase.from('daily_logs').select('id,note,at').eq('day', day).eq('what', 'emergency').order('at', { ascending: false }).limit(1)),
  ])
  const mins = (iso) => Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000))
  const out = (id, title, detail, pct = null, since = null) => ({ id, ...PROTOCOLS[id], title, detail, pct, since })

  if (flags.length && !/cleared/i.test(flags[0].note || '')) return out('emergency', flags[0].note || 'Emergency protocol', 'flagged', null, flags[0].at)

  const byId = (pred) => running.find(r => pred(r.event_id))
  const meetingTimer = byId(id => !id.startsWith('adhoc:') && !id.startsWith('personal:'))
  if (meetingTimer) {
    const ev = events.find(e => e.id === meetingTimer.event_id)
    const pct = ev ? Math.min(100, Math.round((nowMs - new Date(ev.start_at)) / (new Date(ev.end_at) - new Date(ev.start_at)) * 100)) : null
    return out('meeting', meetingTimer.subject || ev?.subject || 'Meeting', `${mins(meetingTimer.started_at)}m on the clock`, pct, meetingTimer.started_at)
  }
  const live = events.find(e => !e.is_all_day && e.start_at <= nowIso && e.end_at >= nowIso)
  const morning = byId(id => id.endsWith(':morning-protocol'))
  if (morning) return out('morning', 'Morning Protocol', `step ${readStep(day) + 1} of 7 · ${mins(morning.started_at)}m`, Math.round(readStep(day) / 7 * 100), morning.started_at)
  const evening = byId(id => id.endsWith(':evening-protocol'))
  if (evening) return out('evening', 'Evening Protocol', `${mins(evening.started_at)}m`, null, evening.started_at)
  if (live) return out('meeting', live.subject || 'Meeting', 'on the calendar now, no timer', Math.min(100, Math.round((nowMs - new Date(live.start_at)) / (new Date(live.end_at) - new Date(live.start_at)) * 100)), live.start_at)
  const travel = byId(id => id.endsWith(':travel'))
  if (travel) return out('travel', travel.subject || 'Travel', `${mins(travel.started_at)}m`, null, travel.started_at)
  if (clocks.length) {
    const { data: o } = await supabase.from('objectives').select('id,title,effort').eq('id', clocks[0].objective_id).limit(1)
    const obj = o?.[0]; const m = mins(clocks[0].started_at); const hours = obj ? SIZES[sizeOf(obj)].hours : 1
    return out('mission', obj?.title || 'Loaded item', `${m}m on the clock · ${obj ? SIZES[sizeOf(obj)].label : ''}`, Math.min(100, Math.round(m / (hours * 60) * 100)), clocks[0].started_at)
  }
  const rest = byId(id => id.startsWith('personal:'))
  if (rest) return out('rest', rest.subject || 'Release', `${mins(rest.started_at)}m`, null, rest.started_at)
  const adhoc = byId(id => id.startsWith('adhoc:'))
  if (adhoc) return out('mission', adhoc.subject || 'Recurring', `${mins(adhoc.started_at)}m on the clock`, null, adhoc.started_at)
  return out('off', 'Nothing running', 'load something, start a timer, or run a protocol')
}
