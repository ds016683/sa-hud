// What is on at the Console (David 10/25): one button on at a time across
// Protocols, Tending, Timers and Release. The provider reads today's running
// spans from meeting_sessions (adhoc:<day>:<slug> and personal:<day>:<slug>)
// and every Instrument reads it: the running one is unmistakable, the rest
// dull with their hue kept. Travel is the one exception (David 10/7): it runs
// alongside, so it never dulls the others and never blocks a start.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { chiToday } from './loadout'

const Ctx = createContext({ running: null, all: [], refresh: () => {} })
const concurrent = (id) => /:travel$/.test(String(id || ''))

export function ConsoleRunProvider({ tick = 0, children }) {
  const [all, setAll] = useState([])
  const refresh = useCallback(async () => {
    const day = chiToday()
    const { data } = await supabase.from('meeting_sessions').select('event_id,subject,started_at,stopped_at,special_notes').eq('day', day).is('stopped_at', null).not('started_at', 'is', null).or('event_id.like.adhoc:%,event_id.like.personal:%')
    setAll(Array.isArray(data) ? data : [])
  }, [])
  useEffect(() => { refresh(); const t = setInterval(refresh, 20_000); return () => clearInterval(t) }, [refresh, tick])
  const running = all.find(s => !concurrent(s.event_id)) || null
  return <Ctx.Provider value={{ running, all, refresh }}>{children}</Ctx.Provider>
}
export const useConsoleRun = () => useContext(Ctx)
// The message a start gets when something else is on.
export const blockedBy = (run, selfId) => run && run.event_id !== selfId ? `${run.subject} is on. Stop it first.` : null
