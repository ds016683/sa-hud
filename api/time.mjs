// POST /api/time — board-time logging into Harvest.
// The HUD never touches Harvest's single running timer (that stays David's,
// for meetings). Instead each objective accrues its own board clock
// (objectives.activated_at, stamped on play), and when it leaves the board
// the elapsed span is written here as a COMPLETED Harvest entry:
//   {action: 'log', title, hours, notes?, task?} -> entry in the default project,
//   notes "HUD · <title>" (or "HUD · <notes>"), task THS Internal unless named. Spans under 3 minutes are dropped as misclicks.

export const config = { maxDuration: 60 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

// David's default logging bucket (most-used pairing by live inspection).
const DEFAULT_PROJECT_ID = 39452500 // Business Administration
const DEFAULT_TASK_ID = 21843034    // THS Internal
const NOTE_PREFIX = 'HUD · '
const MIN_HOURS = 0.01  // ~36 seconds; anything shorter is a misclick
const MAX_HOURS = 12    // sanity ceiling

async function harvest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.harvestapp.com/v2/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.HARVEST_ACCESS_TOKEN}`,
      'Harvest-Account-Id': process.env.HARVEST_ACCOUNT_ID,
      'User-Agent': 'th-sa-hud timeclock (david.smith@thirdhorizon.com)',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`harvest ${path.split('?')[0]} -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

// The tasks on David's default project, by name (11/4): an item can ask for
// a task other than THS Internal ("Business Management"); unknown names fall
// back to the default and say so in the reply.
export async function projectTasks() {
  const out = (await harvest(`task_assignments?per_page=100&is_active=true`)).task_assignments || []
  return out.filter(a => a.project?.id === DEFAULT_PROJECT_ID).map(a => ({ id: a.task.id, name: a.task.name }))
}
async function resolveTask(name) {
  if (!name) return { task_id: DEFAULT_TASK_ID }
  const want = String(name).trim().toLowerCase()
  const t = (await projectTasks()).find(x => x.name.toLowerCase() === want)
  return t ? { task_id: t.id, task: t.name } : { task_id: DEFAULT_TASK_ID, task_fallback: `no task named "${name}" on the default project` }
}

// Log a completed span to Harvest: one entry per title per day (appends).
// opts.notes replaces the title in the entry's notes (an item that wants only
// basic information in Harvest, David 11/4); opts.task names the task.
export async function logHours(title, hours, day = null, ceiling = MAX_HOURS, opts = {}) {
  const h = Math.round(Number(hours) * 100) / 100
  if (!title || !Number.isFinite(h)) return { error: 'title and hours required' }
  if (h < MIN_HOURS) return { ok: true, note: `span ${h}h under minimum; not logged` }
  if (h > ceiling) return { error: `span ${h}h over sanity ceiling (${ceiling}h)` }
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? day : chiToday()
  const notes = NOTE_PREFIX + String(opts.notes || title).slice(0, 200)
  const coded = await resolveTask(opts.task)
  const me = await harvest('users/me')
  const existing = (await harvest(`time_entries?user_id=${me.id}&from=${today}&to=${today}&per_page=100`)).time_entries || []
  const match = existing.find(e => e.notes === notes && !e.is_running && e.task?.id === coded.task_id)
  if (match) {
    const total = Math.round((match.hours + h) * 100) / 100
    const entry = await harvest(`time_entries/${match.id}`, { method: 'PATCH', body: { hours: total } })
    return { ok: true, appended: true, entry_id: entry.id, added: h, hours: total, ...coded }
  }
  const entry = await harvest('time_entries', { method: 'POST', body: { project_id: DEFAULT_PROJECT_ID, task_id: coded.task_id, spent_date: today, hours: h, notes } })
  return { ok: true, logged: true, entry_id: entry.id, hours: h, ...coded }
}

// Set today's Harvest entry for a title to exactly `hours` (create if absent).
export async function setHours(title, hours, day = null, ceiling = MAX_HOURS) {
  const h = Math.round(Number(hours) * 100) / 100
  if (!title || !Number.isFinite(h) || h <= 0) return { error: 'title and positive hours required' }
  if (h > ceiling) return { error: `span ${h}h over sanity ceiling (${ceiling}h)` }
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(day || '')) ? day : chiToday()
  const notes = NOTE_PREFIX + String(title).slice(0, 200)
  const me = await harvest('users/me')
  const existing = (await harvest(`time_entries?user_id=${me.id}&from=${today}&to=${today}&per_page=100`)).time_entries || []
  const match = existing.find(e => e.notes === notes && !e.is_running)
  if (match) {
    const entry = await harvest(`time_entries/${match.id}`, { method: 'PATCH', body: { hours: h } })
    return { ok: true, set: true, entry_id: entry.id, hours: h, was: match.hours }
  }
  const entry = await harvest('time_entries', { method: 'POST', body: { project_id: DEFAULT_PROJECT_ID, task_id: DEFAULT_TASK_ID, spent_date: today, hours: h, notes } })
  return { ok: true, logged: true, entry_id: entry.id, hours: h }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'missing token' })
  if (!(process.env.CRON_SECRET && token === process.env.CRON_SECRET)) {
    const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
    if (!who.ok) return res.status(401).json({ error: 'invalid session' })
    if ((await who.json()).id !== DAVID) return res.status(403).json({ error: 'not authorized' })
  }

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { action, title, hours, notes, task } = body || {}

  try {
    if (action === 'log') {
      const out = await logHours(title, hours, null, MAX_HOURS, { notes, task })
      return res.status(out.error ? 400 : 200).json(out)
    }
    if (action === 'tasks') {
      return res.status(200).json({ ok: true, project_id: DEFAULT_PROJECT_ID, default_task_id: DEFAULT_TASK_ID, tasks: await projectTasks() })
    }
    if (action === 'status') {
      const today = chiToday()
      const me = await harvest('users/me')
      const existing = (await harvest(`time_entries?user_id=${me.id}&from=${today}&to=${today}&per_page=100`)).time_entries || []
      const banked = {}
      for (const e of existing) {
        if ((e.notes || '').startsWith(NOTE_PREFIX)) banked[e.notes.slice(NOTE_PREFIX.length)] = e.hours
      }
      return res.status(200).json({ ok: true, banked })
    }
    return res.status(400).json({ error: 'action must be log, status or tasks' })
  } catch (e) {
    console.error('time failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
