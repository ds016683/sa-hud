// POST /api/time — the board drives the real Harvest timer.
// {action: 'start', title} starts a running timer (Harvest auto-stops any
// other) in David's default bucket with the objective title in the notes.
// {action: 'stop', title?} stops the running timer, but ONLY if the HUD
// started it (notes prefixed 'HUD · '), and, when a title is given, only if
// it matches — so a hand-started Harvest timer is never touched, and
// releasing objective A never kills a timer running for objective B.

export const config = { maxDuration: 60 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

// David's default logging bucket (his most-used pairing by live inspection).
// Later: per-objective mapping via tags; the fetch half stays identical.
const DEFAULT_PROJECT_ID = 39452500 // Business Administration
const DEFAULT_TASK_ID = 21843034    // THS Internal
const NOTE_PREFIX = 'HUD · '

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'missing token' })
  const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
  if (!who.ok) return res.status(401).json({ error: 'invalid session' })
  if ((await who.json()).id !== DAVID) return res.status(403).json({ error: 'not authorized' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { action, title } = body || {}
  const cleanTitle = String(title || '').slice(0, 200)

  try {
    const me = await harvest('users/me')
    const running = (await harvest(`time_entries?is_running=true&user_id=${me.id}`)).time_entries || []
    const hudTimer = running.find(e => (e.notes || '').startsWith(NOTE_PREFIX))

    if (action === 'start') {
      if (!cleanTitle) return res.status(400).json({ error: 'title required' })
      // Same objective already on the clock: leave it running.
      if (hudTimer && hudTimer.notes === NOTE_PREFIX + cleanTitle) {
        return res.status(200).json({ ok: true, note: 'already running', entry_id: hudTimer.id, hours: hudTimer.hours })
      }
      // Harvest auto-stops any running timer for the user when a new one starts.
      const entry = await harvest('time_entries', {
        method: 'POST',
        body: { project_id: DEFAULT_PROJECT_ID, task_id: DEFAULT_TASK_ID, spent_date: chiToday(), notes: NOTE_PREFIX + cleanTitle },
      })
      return res.status(200).json({ ok: true, started: true, entry_id: entry.id, switched_from: hudTimer ? hudTimer.notes.slice(NOTE_PREFIX.length) : null })
    }

    if (action === 'stop') {
      if (!hudTimer) return res.status(200).json({ ok: true, note: 'no HUD timer running' })
      if (cleanTitle && hudTimer.notes !== NOTE_PREFIX + cleanTitle) {
        return res.status(200).json({ ok: true, note: 'running timer is a different objective; left alone' })
      }
      const stopped = await harvest(`time_entries/${hudTimer.id}/stop`, { method: 'PATCH' })
      return res.status(200).json({ ok: true, stopped: true, entry_id: stopped.id, hours: stopped.hours })
    }

    if (action === 'status') {
      return res.status(200).json({ ok: true, running: hudTimer ? { title: hudTimer.notes.slice(NOTE_PREFIX.length), hours: hudTimer.hours, entry_id: hudTimer.id } : null })
    }

    return res.status(400).json({ error: 'action must be start, stop, or status' })
  } catch (e) {
    console.error('time failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
