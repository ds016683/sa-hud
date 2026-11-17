// What David is doing right now, read from the Board (David 11/17: "Let's have the Protocol Match the
// board"). The top bar's pill says it. One state at a time, highest first:
//   Emergency                  flagged in the day's log and not cleared
//   <a Console button's name>  "if one of those console buttons are on, it carries the anchor protocol":
//                              Email, Slack, Bill Pay, Travel, a Release, the Morning or Evening Protocol
//   In Run                     a run's timer is running
//   In Meeting / Split Focus   a meeting's timer is running and so is a clock on other work
//   In Meeting                 a meeting's timer is running and no other clock is
//   Unplanned                  a Phone Call or a Non-Mission Task is in the Utility slot
//   In Mission                 "Any mission or missions are on the board"
//   Off Protocol               nothing on the Board
import { supabase } from './supabase'
import { chiToday } from './loadout'
import { readRun } from './runs'
import { BLUE, GOLD, GREEN, PURPLE, RED } from '../components/river/canon'

const q = (p) => p.then(r => (Array.isArray(r.data) ? r.data : []))
const OFF = 'rgba(234,241,248,0.35)'
const TRAVEL = '#5FC9C0'
const words = (slug) => String(slug || '').split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ')

export async function fetchProtocolState() {
  const day = chiToday(); const nowMs = Date.now()
  const [running, clocks, active, flags, run] = await Promise.all([
    q(supabase.from('meeting_sessions').select('event_id,subject,started_at').eq('day', day).not('started_at', 'is', null).is('stopped_at', null)),
    q(supabase.from('clocks').select('id,objective_id,started_at').is('stopped_at', null)),
    q(supabase.from('objectives').select('id,title,tags,activated_at').eq('state', 'active').is('deleted_at', null).order('activated_at', { ascending: true })),
    q(supabase.from('daily_logs').select('id,note,at').eq('day', day).eq('what', 'emergency').order('at', { ascending: false }).limit(1)),
    readRun().then(d => d?.run || null).catch(() => null),
  ])
  const mins = (iso) => Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60000))
  const out = (id, label, color, title, detail, pct = null, since = null, blink = false) => ({ id, label, color, title, detail, pct, since, blink })

  if (flags.length && !/cleared/i.test(flags[0].note || '')) return out('emergency', 'Emergency', RED, flags[0].note || 'Emergency protocol', 'flagged', null, flags[0].at, true)

  // A Console button that is on carries the protocol, whatever else is on the Board.
  const ofConsole = (r) => r.event_id.startsWith('adhoc:') || r.event_id.startsWith('personal:')
  const button = running.filter(ofConsole).sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0]
  if (button) {
    const slug = button.event_id.split(':').slice(2).join(':')
    const color = slug === 'travel' ? TRAVEL : slug === 'morning-protocol' ? GOLD : (slug === 'evening-protocol' || button.event_id.startsWith('personal:')) ? PURPLE : GREEN
    return out('console', button.subject || words(slug) || 'Console', color, `${mins(button.started_at)}m on the clock`, 'a Console button is on', null, button.started_at)
  }

  if (run && run.state === 'running') {
    const left = Math.round((new Date(run.ends_at).getTime() - nowMs) / 60000)
    const span = new Date(run.ends_at).getTime() - new Date(run.started_at).getTime()
    return out('run', 'In Run', GREEN, `Run ${run.n}`, left > 0 ? `${left}m left` : `${-left}m over`, Math.max(0, Math.min(100, Math.round((nowMs - new Date(run.started_at).getTime()) / span * 100))), run.started_at)
  }

  const meeting = running.find(r => !ofConsole(r))
  if (meeting) return clocks.length
    ? out('split', 'In Meeting / Split Focus', BLUE, meeting.subject || 'Meeting', `${mins(meeting.started_at)}m in the meeting, and a clock is running on other work`, null, meeting.started_at)
    : out('meeting', 'In Meeting', BLUE, meeting.subject || 'Meeting', `${mins(meeting.started_at)}m on the clock`, null, meeting.started_at)

  const has = (o, t) => (o.tags || []).includes(t)
  const unplanned = active.find(o => has(o, 'impromptu'))
  if (unplanned) return out('unplanned', 'Unplanned', GREEN, unplanned.title, 'in the Utility slot', null, unplanned.activated_at)

  const missions = active.filter(o => !has(o, 'session') && !has(o, 'impromptu'))
  if (missions.length) {
    const live = missions.find(o => clocks.some(c => c.objective_id === o.id)) || missions[0]
    return out('mission', 'In Mission', GREEN, missions.length > 1 ? `${live.title} + ${missions.length - 1} more` : live.title, clocks.some(c => c.objective_id === live.id) ? 'the clock is running' : 'on the Board, clock off', null, live.activated_at)
  }
  return out('off', 'Off Protocol', OFF, 'Nothing on the Board', 'load a mission, start a run, or use the Console')
}
