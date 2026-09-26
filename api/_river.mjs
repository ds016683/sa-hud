// The River: deterministic badge rules that strike miles into miles_ledger.
// Called by /api/refresh (during the day) and /api/close (closing = true,
// which unlocks Clean Close). Idempotent: every award is upserted on
// (day, badge, key), so re-running never double-counts. Rules mirror
// src/constants/collection.js; the miles live here so the server is canon.

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const hdr = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
async function sb(path) {
  const r = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: hdr() })
  if (!r.ok) throw new Error(`${path.split('?')[0]} -> ${r.status}`)
  return r.json()
}

export const MILES = {
  'main-mission': 10, 'mission-task': 1, 'side-mission': 4, 'maintenance-bundle': 0.2, 'exercise': 5, 'sleep': 4,
  'toastmaster': 4, 'work-horse': 10, 'clean-close': 2, 'discomforter': 5, 'hygiene': 3,
}

const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !['the', 'and', 'with', 'for', 'call', 'meeting', 'sync', 'weekly'].includes(w)))
function documented(subject, meetings) {
  const a = words(subject)
  if (!a.size) return false
  return meetings.some(m => {
    const b = words(m.title)
    if (!b.size) return false
    const shared = [...a].filter(w => b.has(w) || [...b].some(x => (x.length >= 4 && w.startsWith(x)) || (w.length >= 4 && x.startsWith(w)))).length
    return shared >= Math.min(2, a.size, b.size)
  })
}

// Compute the day's awards from the Ledger. Returns [{badge, key, miles, evidence}].
export async function computeAwards(day, { closing = false } = {}) {
  const from = `${day}T00:00:00-05:00`, to = `${day}T23:59:59-05:00`
  const [doneTasks, released, taskObjIds, maint, logs, calendar, meetings, time, emails, inboxObjs, doneProjects] = await Promise.all([
    sb(`project_tasks?select=id,text,project_id,released_at&status=eq.done&released_at=gte.${from}&released_at=lte.${to}`),
    sb(`objectives?select=id,title,released_at,released_kind&state=eq.released&released_kind=eq.done&released_at=gte.${from}&released_at=lte.${to}&deleted_at=is.null`),
    sb(`project_tasks?select=objective_id&objective_id=not.is.null`),
    sb(`maintenance_items?select=id,title&status=eq.done&day=eq.${day}`).catch(() => []),
    sb(`daily_logs?select=kind,what,value,note,at&day=eq.${day}`).catch(() => []),
    sb(`calendar_events?select=subject,start_at,end_at,attendees,organizer&day=eq.${day}&is_cancelled=eq.false`),
    sb(`granola_meetings?select=title&meeting_date=eq.${day}`),
    sb(`time_entries?select=person,hours&spent_date=eq.${day}`),
    sb(`emails?select=is_read&folder=eq.inbox&day=eq.${day}`),
    sb(`objectives?select=id&state=eq.inbox&deleted_at=is.null`),
    sb(`projects?select=id,name,status,archived_at,last_activity_at&status=in.(completed,complete,done)`),
  ])
  const linked = new Set(taskObjIds.map(t => t.objective_id))
  const awards = []
  const add = (badge, key, evidence) => awards.push({ badge, key: String(key ?? ''), miles: MILES[badge], evidence })

  const onDay = (ts) => ts && ts >= from && ts <= to
  for (const p of doneProjects) if (onDay(p.archived_at) || onDay(p.last_activity_at)) add('main-mission', p.id, `Main Mission complete: ${p.name}`)
  for (const t of doneTasks) add('mission-task', t.id, `Mission task closed: ${t.text}`)
  for (const o of released) if (!linked.has(o.id)) add('side-mission', o.id, `Side Mission released: ${o.title}`)
  const bundles = Math.floor(maint.length / 5)
  for (let i = 1; i <= bundles; i++) add('maintenance-bundle', i, `Bundle ${i}: ${maint.slice((i - 1) * 5, i * 5).map(m => m.title).join(', ')}`)

  const by = (k) => logs.filter(l => l.kind === k)
  const exMin = by('exercise').reduce((s, l) => s + (Number(l.value) || 0), 0)
  if (exMin >= 60) add('exercise', '', `${Math.round(exMin)} minutes of exercise logged: ${by('exercise').map(l => l.what).filter(Boolean).join(', ') || 'exercise'}`)
  const sleepH = Math.max(0, ...by('sleep').map(l => Number(l.value) || 0))
  if (sleepH >= 6) add('sleep', '', `${sleepH} hours of sleep`)
  const disc = by('discomfort')
  if (disc.length >= 3) add('discomforter', '', `Three deliberate discomforts: ${disc.slice(0, 3).map(l => l.what || l.note).filter(Boolean).join('; ')}`)
  const hyg = by('hygiene').map(l => String(l.what || '').toLowerCase())
  const brushes = hyg.filter(w => w.includes('brush') || w.includes('teeth')).length
  const shower = hyg.some(w => w.includes('shower'))
  const whiten = hyg.some(w => w.includes('whiten'))
  if (brushes >= 3 && shower && whiten) add('hygiene', '', `Teeth ${brushes}x, shower, whitening`)

  const now = Date.now()
  const real = calendar.filter(c => Array.isArray(c.attendees) ? c.attendees.length >= 1 : true).filter(c => new Date(c.end_at).getTime() <= now)
  if (real.length >= 1 && real.every(c => documented(c.subject, meetings)) && (closing || real.length === calendar.length)) {
    add('toastmaster', '', `${real.length} of ${real.length} meetings attended and documented: ${real.map(c => c.subject).join(', ')}`)
  }
  const davidHours = time.filter(t => (t.person || '').startsWith('David')).reduce((s, t) => s + (t.hours || 0), 0)
  if (davidHours > 12) add('work-horse', '', `${Math.round(davidHours * 10) / 10} hours logged in Harvest`)
  if (closing && emails.length && emails.every(e => e.is_read) && inboxObjs.length === 0) {
    add('clean-close', '', `Closed clean: ${emails.length} inbox emails all read, agent inbox at zero, tomorrow reviewed`)
  }
  return awards
}

// Strike the day's awards into the ledger (upsert) and return the day's totals.
export async function strikeDay(day, opts = {}) {
  const awards = await computeAwards(day, opts)
  if (awards.length) {
    const rows = awards.map(a => ({ day, badge: a.badge, key: a.key, miles: a.miles, evidence: a.evidence, source: opts.closing ? 'close' : 'refresh' }))
    const r = await fetch(`${URL_BASE}/rest/v1/miles_ledger?on_conflict=day,badge,key`, {
      method: 'POST', headers: { ...hdr(), 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows),
    })
    if (!r.ok) throw new Error(`miles_ledger upsert -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
  }
  const ledger = await sb(`miles_ledger?select=badge,miles,evidence&day=eq.${day}&order=id.asc`)
  const dayMiles = Math.round(ledger.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100
  const totalRows = await sb(`miles_ledger?select=miles`)
  const total = Math.round(totalRows.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100
  const badges = [...new Set(ledger.map(r => r.badge))]
  const evidence = {}
  for (const r of ledger) evidence[r.badge] = evidence[r.badge] ? `${evidence[r.badge]} · ${r.evidence}` : r.evidence
  return { day, badges, badge_evidence: evidence, miles: dayMiles, total }
}
