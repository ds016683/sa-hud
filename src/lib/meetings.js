// Meetings: the glue between calendar_events, granola_meetings, and
// meeting_sessions (David's timer + close-out layer). Shared by the Agenda
// (where meetings are run and closed out) and Notes (where they are read back).
import { supabase } from './supabase'

export const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'
const STOP = new Set(['the', 'and', 'with', 'for', 'call', 'meeting', 'sync', 'weekly', 'monthly', 'david', 'smith', 'third', 'horizon'])
export const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w)))

// Find the Granola note that belongs to a calendar event: exact title, or
// two or more shared meaningful words (or every word when the subject is short).
export function matchNotes(event, meetings) {
  if (!event || !meetings || !meetings.length) return null
  const subj = String(event.subject || '').trim().toLowerCase()
  const exact = meetings.find(m => String(m.title || '').trim().toLowerCase() === subj)
  if (exact) return exact
  const a = words(event.subject)
  if (!a.size) return null
  let best = null, bestN = 0
  for (const m of meetings) {
    const b = words(m.title)
    if (!b.size) continue
    const shared = [...a].filter(w => b.has(w) || [...b].some(x => (x.length >= 4 && w.startsWith(x)) || (w.length >= 4 && x.startsWith(w)))).length
    if (shared >= Math.min(2, a.size, b.size) && shared > bestN) { best = m; bestN = shared }
  }
  return best
}

export const hoursBetween = (a, b) => Math.round(((new Date(b) - new Date(a)) / 3600e3) * 100) / 100

// Upsert a session row for an event (event_id unique). A partial patch on an
// existing row must not go through INSERT ... ON CONFLICT (the insert half
// trips NOT NULL on day), so: update if the row exists, otherwise insert.
export async function upsertSession(patch) {
  const row = { ...patch, updated_at: new Date().toISOString() }
  if ((patch.started_at || patch.stopped_at || patch.closed_at) && !patch.attended_at) row.attended_at = new Date().toISOString()
  const { data: upd, error: e1 } = await supabase.from('meeting_sessions').update(row).eq('event_id', row.event_id).select()
  if (e1) throw e1
  if (upd && upd.length) return upd[0]
  const { data, error } = await supabase.from('meeting_sessions').insert(row).select().single()
  if (error) throw error
  return data
}

// Log a completed span to Harvest through the HUD's time door (best effort).
export async function logToHarvest(title, hours) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not signed in')
  const res = await fetch('/api/time', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'log', title, hours }) })
  const out = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(out.error || `Harvest ${res.status}`)
  return out
}

// Follow-ups from a close-out become Side Missions in the Follow Up container,
// due a week out unless the line carries its own date.
export async function createFollowUps(lines, { day, subject }) {
  const base = new Date(`${day}T12:00:00`)
  const due = new Date(base.getTime() + 7 * 86400e3).toISOString().slice(0, 10)
  const rows = lines.map(l => String(l || '').trim()).filter(Boolean).map(text => ({
    user_id: DAVID, title: text.slice(0, 160), state: 'follow_up', kind: 'execution', effort: 1, importance: 2, needs_sizing: false,
    follow_up_date: due, description: `Follow-up from ${subject || 'a meeting'} on ${day}`, captured_at: new Date().toISOString(),
  }))
  if (!rows.length) return []
  const { data, error } = await supabase.from('objectives').insert(rows).select('id,title')
  if (error) throw error
  return data || []
}
