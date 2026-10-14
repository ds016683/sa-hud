// The day's record, built from the pipes (emails sent, meetings held, Harvest
// hours, Side and Main Missions closed, daily logs, words said to Lumen, and
// what went on and off the Board). Shared by the Activity page and the
// Activity Log popup on the Board (David, 10/14).
import { supabase } from './supabase'
import { matchNotes } from './meetings'
import { INK2, GOLD, BLUE, PERIWINKLE, PURPLE, GREEN, RED, chiToday, chiDayOf } from '../components/river/canon'

// ---- Day helpers (Chicago). Timestamp columns are fetched over a generous
// UTC window and then filtered by their Chicago day, so DST never bites.
export const shiftDay = (day, n) => {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const windowFor = (day) => ({ lo: shiftDay(day, -1) + 'T00:00:00Z', hi: shiftDay(day, 2) + 'T00:00:00Z' })
const onDay = (iso, day) => !!iso && chiDayOf(iso) === day
const noonOf = (day) => new Date(day + 'T12:00:00').toISOString()

// ---- Kind chips: one color per kind, cool for signal, gold for work done.
export const KINDS = {
  'Email':         { color: BLUE },
  'Meeting':       { color: PERIWINKLE },
  'Work':          { color: GOLD },
  'Side Mission':  { color: GOLD },
  'Main Mission':  { color: PURPLE },
  'Discomfort':    { color: RED },
  'Hygiene':       { color: BLUE },
  'Exercise':      { color: GREEN },
  'Sleep':         { color: PERIWINKLE },
  'Thought':       { color: INK2 },
  'Activity':      { color: INK2 },
  'Said to Lumen': { color: PURPLE },
  'Board':         { color: BLUE },
}
export const LOG_KIND_LABEL = { discomfort: 'Discomfort', hygiene: 'Hygiene', exercise: 'Exercise', sleep: 'Sleep', note: 'Thought', activity: 'Activity' }


// Meeting <-> Granola note match lives in lib/meetings (matchNotes), the same
// matcher the Board, Notes, and the River use, so "documented" agrees everywhere.
export const truncate = (s, n) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }

export async function fetchDay(day) {
  const { lo, hi } = windowFor(day)
  const q = (p) => p.then(r => { if (r.error) console.warn('activity fetch', r.error.message); return Array.isArray(r.data) ? r.data : [] })
  const [emails, calendar, granola, time, objectives, doneTasks, promotedTasks, projects, logs, workouts, lumen] = await Promise.all([
    q(supabase.from('emails').select('subject,to_names,received_at,day').eq('folder', 'sent').eq('day', day).order('received_at', { ascending: true })),
    q(supabase.from('calendar_events').select('subject,start_at,end_at,attendees,day,is_cancelled').eq('day', day).eq('is_cancelled', false).order('start_at', { ascending: true })),
    q(supabase.from('granola_meetings').select('title,meeting_date,attendees,summary').eq('meeting_date', day)),
    q(supabase.from('time_entries').select('person,client,project,task,hours,notes,spent_date').eq('spent_date', day).ilike('person', '%David%')),
    q(supabase.from('objectives').select('id,title,released_at,released_kind,activated_at,captured_at,deleted_at').is('deleted_at', null).or(`released_at.gte.${lo},activated_at.gte.${lo},captured_at.gte.${lo}`)),
    q(supabase.from('project_tasks').select('id,text,status,released_at,project_id').eq('status', 'done').gte('released_at', lo).lt('released_at', hi)),
    q(supabase.from('project_tasks').select('id,project_id,objective_id').not('objective_id', 'is', null)),
    q(supabase.from('projects').select('id,name')),
    q(supabase.from('daily_logs').select('day,kind,what,value,note,at,source').eq('day', day)),
    q(supabase.from('workouts').select('day,minutes,summary,harvest_entry_id').eq('day', day)),
    q(supabase.from('lumen_messages').select('at,channel,direction,kind,body').eq('direction', 'in').in('channel', ['whatsapp', 'voice']).gte('at', lo).lt('at', hi)),
  ])
  return { emails, calendar, granola, time, objectives, doneTasks, promotedTasks, projects, logs, workouts, lumen }
}

export function build(raw, day, nowMs) {
  const rows = []
  const today = chiToday()
  const isToday = day === today
  const isPast = day < today

  // Emails sent
  for (const e of raw.emails) {
    const to = Array.isArray(e.to_names) ? e.to_names.filter(Boolean).join(', ') : ''
    rows.push({ at: e.received_at || noonOf(day), kind: 'Email', text: `Sent: ${e.subject || '(no subject)'}${to ? ` → ${to}` : ''}`, src: 'emails (sent)', fields: { subject: e.subject, to: to || null, received_at: e.received_at } })
  }

  // Meetings held (started so far), with a Granola match as "documented".
  // All-day calendar items (birthdays, holds) are not meetings; the River skips them too.
  const held = raw.calendar.filter(c => !c.is_all_day && c.start_at && (isPast || new Date(c.start_at).getTime() <= nowMs))
  let documented = 0
  const docRows = []
  for (const c of held) {
    const best = matchNotes(c, raw.granola)
    const notes = best ? [best] : []
    const doc = notes.length > 0
    if (doc) documented += 1
    const n = Array.isArray(c.attendees) ? c.attendees.length : 0
    const who = Array.isArray(c.attendees) ? c.attendees.map(a => (a && (a.name || a.email || a)) || '').filter(Boolean).slice(0, 8).join(', ') : ''
    rows.push({ at: c.start_at, kind: 'Meeting', text: c.subject || '(untitled)', meta: n ? `${n} attendee${n === 1 ? '' : 's'}` : null, documented: doc, src: 'calendar_events', fields: { start_at: c.start_at, end_at: c.end_at, organizer: c.organizer, attendees: who || null, granola_match: notes.map(g => g.title).join(' | ') || 'none' } })
    for (const g of notes) docRows.push({ at: c.start_at, kind: 'Meeting', text: g.title, meta: `matches calendar: ${c.subject}`, documented: true, src: 'granola_meetings', fields: { meeting_date: g.meeting_date, attendees: Array.isArray(g.attendees) ? g.attendees.join(', ') : null, summary: truncate(g.summary, 240) || null } })
  }

  // Work logged (Harvest, David's entries)
  let hours = 0
  for (const t of raw.time) {
    const h = Number(t.hours) || 0
    hours += h
    const parts = [t.project, t.task].filter(Boolean)
    rows.push({ at: noonOf(day), kind: 'Work', text: `${parts.join(' · ')}${parts.length ? ' · ' : ''}${h}h`, meta: t.notes ? truncate(t.notes, 160) : (t.client || null), src: 'time_entries (Harvest)', fields: { client: t.client, project: t.project, task: t.task, hours: h, notes: t.notes || null } })
  }

  // Side Missions released today
  for (const o of raw.objectives) {
    if (onDay(o.released_at, day)) rows.push({ at: o.released_at, kind: 'Side Mission', text: `Released: ${o.title}`, meta: o.released_kind && o.released_kind !== 'done' ? o.released_kind : null, src: 'objectives', fields: { id: o.id, released_at: o.released_at, released_kind: o.released_kind || 'done' } })
  }

  // Main Mission tasks done today
  const touched = new Set()
  const touchedWhy = new Map()
  const why = (pid, reason) => { if (!pid) return; touched.add(pid); touchedWhy.set(pid, [...(touchedWhy.get(pid) || []), reason]) }
  const projName = new Map(raw.projects.map(p => [p.id, p.name]))
  for (const t of raw.doneTasks) {
    if (!onDay(t.released_at, day)) continue
    const pname = projName.get(t.project_id) || 'Project'
    why(t.project_id, `task closed: ${t.text}`)
    rows.push({ at: t.released_at, kind: 'Main Mission', text: `${pname}: ${t.text}`, src: 'project_tasks', fields: { id: t.id, project: pname, status: t.status, released_at: t.released_at } })
  }
  // Promotions and activations today, via objectives linked from project_tasks
  const objById = new Map(raw.objectives.map(o => [o.id, o]))
  for (const t of raw.promotedTasks) {
    const o = objById.get(t.objective_id)
    if (!o || !t.project_id) continue
    if (onDay(o.activated_at, day)) why(t.project_id, `task activated: ${o.title}`)
    else if (onDay(o.captured_at, day)) why(t.project_id, `task promoted to the board: ${o.title}`)
  }

  // Thoughts and logs
  for (const l of raw.logs) {
    if (l.what === 'board') { rows.push({ at: l.at || noonOf(day), kind: 'Board', text: l.note || 'board', meta: l.source === 'hud' ? 'on the Board' : 'by Lumen', src: 'daily_logs (board)', fields: { at: l.at, source: l.source } }); continue }
    const kind = LOG_KIND_LABEL[l.kind] || 'Activity'
    const text = [l.what, l.note].filter(Boolean).join(' · ') || (l.value != null ? String(l.value) : '')
    rows.push({ at: l.at || noonOf(day), kind, text, meta: l.value != null && (l.what || l.note) ? String(l.value) : null, src: 'daily_logs', fields: { kind: l.kind, what: l.what, value: l.value, note: l.note, at: l.at, source: l.source } })
  }

  // Said to Lumen
  for (const m of raw.lumen) {
    if (!onDay(m.at, day)) continue
    rows.push({ at: m.at, kind: 'Said to Lumen', text: truncate(m.body, 140), meta: m.channel, src: 'lumen_messages (in)', fields: { channel: m.channel, kind: m.kind, at: m.at, body: truncate(m.body, 400) } })
  }

  rows.sort((a, b) => new Date(a.at) - new Date(b.at))
  const byKind = {}
  for (const r of rows) byKind[r.kind] = (byKind[r.kind] || 0) + 1

  // Time on pursuits (9/27 rule): Harvest = Third Horizon work only. Personal
  // Side Missions keep their clock in the Ledger (activity logs with source
  // objective:*), never Harvest. Exercise lives in the workouts record.
  const clocks = raw.logs.filter(l => l.kind === 'activity' && (String(l.source || '').startsWith('objective:') || String(l.source || '').startsWith('timer:')))
  const clockRow = (l) => ({ at: l.at || noonOf(day), kind: String(l.source || '').startsWith('timer:') ? 'Activity' : 'Side Mission', text: `${l.what || 'Side Mission'} · ${Math.round((Number(l.value) || 0) / 6) / 10}h`, meta: l.note, src: String(l.source || '').startsWith('timer:') ? 'daily_logs (personal timer)' : 'daily_logs (Side Mission clock)', fields: { minutes: l.value, note: l.note, source: l.source } })
  const personalH = clocks.filter(l => /^personal/.test(l.note || '')).reduce((s, l) => s + (Number(l.value) || 0), 0) / 60
  const workClockH = clocks.filter(l => !/^personal/.test(l.note || '')).reduce((s, l) => s + (Number(l.value) || 0), 0) / 60
  const exerciseH = (raw.workouts || []).reduce((s, w) => s + (Number(w.minutes) || 0), 0) / 60
  const pursuitsH = hours + personalH + workClockH + exerciseH
  const pursuitRows = [
    ...rows.filter(r => r.kind === 'Work'),
    ...clocks.map(clockRow),
    ...(raw.workouts || []).map(w => ({ at: noonOf(day), kind: 'Exercise', text: `Workout · ${Math.round((Number(w.minutes) || 0) / 6) / 10}h`, meta: w.summary, src: 'workouts', fields: { minutes: w.minutes, harvest_entry_id: w.harvest_entry_id } })),
  ]

  // Drill-downs for the Today panel: what each number is made of.
  const drills = {
    pursuits: pursuitRows,
    thirdHorizon: rows.filter(r => r.kind === 'Work'),
    held: rows.filter(r => r.kind === 'Meeting'),
    documented: docRows,
    hours: rows.filter(r => r.kind === 'Work'),
    touched: [...touched].map(pid => ({ at: noonOf(day), kind: 'Main Mission', text: projName.get(pid) || 'Project', meta: (touchedWhy.get(pid) || []).join(' · '), src: 'projects + project_tasks', fields: { project_id: pid } })),
  }

  return {
    rows, byKind, drills,
    stats: { held: held.length, documented, hours: Math.round(hours * 100) / 100, touched: touched.size, pursuits: Math.round(pursuitsH * 100) / 100, share: pursuitsH ? Math.round(hours / pursuitsH * 100) : 0, personal: Math.round(personalH * 100) / 100, exercise: Math.round(exerciseH * 100) / 100 },
    isToday,
  }
}

