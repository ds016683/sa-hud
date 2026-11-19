// Sleep (David 11/19: "i honestly should be even hitting 'sleep' when i go to sleep and hit morning protocol when i
// wake up", and on documenting every day: "I think that it's gonna end up mattering. Even if it's a little painful.").
// A personal timer like the Release ones (never Harvest), but it crosses midnight: the open row is found whatever day
// it started on, and it ends when he presses it again or starts the Morning Protocol (stopSleep, called from there).
import { useCallback, useEffect, useState } from 'react'
import { BedDouble, Square } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { chiToday, fmtClock } from '../../lib/loadout'
import { Instrument } from './Instrument'

const chiClock = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
const openSleep = async () => {
  const since = new Date(Date.now() - 20 * 3600 * 1000).toISOString()
  const { data } = await supabase.from('meeting_sessions').select('event_id,day,subject,started_at,stopped_at').like('event_id', 'personal:%:sleep:%').is('stopped_at', null).gte('started_at', since).order('started_at', { ascending: false }).limit(1)
  return Array.isArray(data) && data[0] ? data[0] : null
}
// Ends the sleep that is on, if one is: stamps it, and logs the night as one personal activity on the day he wakes.
export async function stopSleep() {
  const r = await openSleep()
  if (!r) return null
  const stopped = new Date()
  const minutes = Math.max(1, Math.round((stopped - new Date(r.started_at)) / 60000))
  const { error } = await supabase.from('meeting_sessions').update({ stopped_at: stopped.toISOString(), hours: Math.round(minutes / 60 * 100) / 100, harvest_logged: false }).eq('event_id', r.event_id)
  if (error) throw new Error(error.message)
  await supabase.from('daily_logs').insert({ day: chiToday(), kind: 'activity', what: 'sleep', value: minutes, note: `personal · sleep timer · ${chiClock(r.started_at)} to ${chiClock(stopped.toISOString())} CT`, source: 'timer:sleep', at: stopped.toISOString() })
  return minutes
}

export default function SleepButton({ onChange, say }) {
  const [row, setRow] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const refresh = useCallback(async () => { try { setRow(await openSleep()) } catch { /* the button stays as it was */ } }, [])
  useEffect(() => { Promise.resolve().then(refresh) }, [refresh])
  useEffect(() => { const t = setInterval(() => { setNow(Date.now()); refresh() }, 60_000); return () => clearInterval(t) }, [refresh])
  const running = !!row
  const tap = async () => {
    try {
      if (running) await stopSleep()
      else {
        const at = new Date(), day = chiToday()
        const { error } = await supabase.from('meeting_sessions').insert({ event_id: `personal:${day}:sleep:${at.toISOString().slice(11, 19).replace(/:/g, '')}`, day, subject: 'Sleep', started_at: at.toISOString(), attended_at: at.toISOString(), harvest_logged: false })
        if (error) throw new Error(error.message)
      }
      await refresh(); onChange && onChange()
    } catch (e) { say && say(`Could not ${running ? 'end' : 'start'} sleep: ${e.message}`) }
  }
  const mins = running ? (now - new Date(row.started_at).getTime()) / 60000 : 0
  return <Instrument label="Sleep" title={running ? `Asleep since ${chiClock(row.started_at)} · tap to end, or start the Morning Protocol` : 'Sleep · press it when you go to bed; the Morning Protocol ends it'} icon={running ? <Square size={24} /> : <BedDouble size={24} />} running={running} clock={fmtClock(mins)} tone="#B4A3E8" onClick={tap} />
}
