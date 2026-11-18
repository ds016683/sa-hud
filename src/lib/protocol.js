// What David is doing right now, read from the Board (David 11/17: "Let's have the Protocol Match the
// board"). The top bar's pill says it. One state at a time, highest first:
//   Emergency                  flagged in the day's log and not cleared
//   <a Console button's name>  "if one of those console buttons are on, it carries the anchor protocol":
//                              Email, Slack, Bill Pay, Travel, a Release, the Morning or Evening Protocol
//   In Run                     a run's timer is running
//   In Meeting / Split Focus   a meeting's timer is running and so is a clock on other work
//   In Meeting                 a meeting's timer is running and no other clock is
//   Unplanned                  the clock is running on a Phone Call or a Non-Mission Task
//   In Mission                 the clock is running on a mission
//   Off Protocol               no clock, no run, no meeting, no Console button
// The clock says it, not the Board (David 11/18: "the clock should be the thing saying what i'm doing, not
// the board"): a card sitting in the Loadout with its clock off is Off Protocol.
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
  // ends, slots and live feed the pill's meter (see ProtocolHud): the run's end, the Loadout's two slots, a running clock.
  const out = (id, label, color, title, detail, pct = null, since = null, blink = false, more = {}) => ({ id, label, color, title, detail, pct, since, blink, ...more })

  if (flags.length && !/cleared/i.test(flags[0].note || '')) return out('emergency', 'Emergency', RED, flags[0].note || 'Emergency protocol', 'flagged', null, flags[0].at, true)

  // A Console button that is on carries the protocol, whatever else is on the Board.
  const ofConsole = (r) => r.event_id.startsWith('adhoc:') || r.event_id.startsWith('personal:')
  const button = running.filter(ofConsole).sort((a, b) => String(b.started_at).localeCompare(String(a.started_at)))[0]
  if (button) {
    const slug = button.event_id.split(':').slice(2).join(':')
    const color = slug === 'travel' ? TRAVEL : slug === 'morning-protocol' ? GOLD : (slug === 'evening-protocol' || button.event_id.startsWith('personal:')) ? PURPLE : GREEN
    return out('console', button.subject || words(slug) || 'Console', color, null, `a Console button is on, ${mins(button.started_at)}m on the clock`, null, button.started_at)
  }

  if (run && run.state === 'running') {
    const left = Math.round((new Date(run.ends_at).getTime() - nowMs) / 60000)
    const span = new Date(run.ends_at).getTime() - new Date(run.started_at).getTime()
    return out('run', 'In Run', GREEN, `Run ${run.n}`, left > 0 ? `${left}m left` : `${-left}m over`, Math.max(0, Math.min(100, Math.round((nowMs - new Date(run.started_at).getTime()) / span * 100))), run.started_at, false, { ends: run.ends_at })
  }

  const meeting = running.find(r => !ofConsole(r))
  if (meeting) return clocks.length
    ? out('split', 'In Meeting / Split Focus', BLUE, meeting.subject || 'Meeting', `${mins(meeting.started_at)}m in the meeting, and a clock is running on other work`, null, meeting.started_at)
    : out('meeting', 'In Meeting', BLUE, meeting.subject || 'Meeting', `${mins(meeting.started_at)}m on the clock`, null, meeting.started_at)

  const has = (o, t) => (o.tags || []).includes(t)
  const tickOn = (o) => clocks.find(c => c.objective_id === o.id) || null
  const unplanned = active.find(o => has(o, 'impromptu') && tickOn(o))
  if (unplanned) return out('unplanned', 'Unplanned', GREEN, unplanned.title, 'the clock is running', null, tickOn(unplanned).started_at)

  const missions = active.filter(o => !has(o, 'session') && !has(o, 'impromptu'))
  const live = missions.find(tickOn)
  if (live) return out('mission', 'In Mission', GREEN, live.title, 'the clock is running', null, tickOn(live).started_at, false,
    { live: true, slots: missions.slice(0, 2).map(o => ({ live: !!tickOn(o) })) })
  return out('off', 'Off Protocol', OFF, 'No clock running', 'start a clock, start a run, or use the Console')
}
