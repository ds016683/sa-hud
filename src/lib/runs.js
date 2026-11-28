// The Run (David 11/17), the HUD's side: read what the Board shows and send the verbs. The server
// is the only writer (api/run.mjs); the minute canvass runs there whether or not this tab is open.
import { supabase } from './supabase'

async function call(method, body, query = '') {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('not signed in')
  const res = await fetch(`/api/run${query}`, { method, headers: { Authorization: `Bearer ${session.access_token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `run ${res.status}`)
  return out
}
export const readRun = () => call('GET', null, '?state=1')
export const runVerb = (action, more = {}) => call('POST', { action, ...more })
// Bank today's miles on the River now, after an Extract (it never throws: the 11 PM close strikes the day either way).
export const strikeToday = () => call('POST', { action: 'strike' }).catch(e => { console.warn('strike', e.message); return null })
