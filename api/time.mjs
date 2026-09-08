// POST /api/time — board-time logging into Harvest.
// The HUD never touches Harvest's single running timer (that stays David's,
// for meetings). Instead each objective accrues its own board clock
// (objectives.activated_at, stamped on play), and when it leaves the board
// the elapsed span is written here as a COMPLETED Harvest entry:
//   {action: 'log', title, hours} -> entry in the default bucket,
//   notes "HUD · <title>". Spans under 3 minutes are dropped as misclicks.

export const config = { maxDuration: 60 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

// David's default logging bucket (most-used pairing by live inspection).
const DEFAULT_PROJECT_ID = 39452500 // Business Administration
const DEFAULT_TASK_ID = 21843034    // THS Internal
const NOTE_PREFIX = 'HUD · '
const MIN_HOURS = 0.05  // ~3 minutes; anything shorter is a misclick
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'missing token' })
  const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
  if (!who.ok) return res.status(401).json({ error: 'invalid session' })
  if ((await who.json()).id !== DAVID) return res.status(403).json({ error: 'not authorized' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const { action, title, hours } = body || {}

  try {
    if (action === 'log') {
      const h = Math.round(Number(hours) * 100) / 100
      if (!title || !Number.isFinite(h)) return res.status(400).json({ error: 'title and hours required' })
      if (h < MIN_HOURS) return res.status(200).json({ ok: true, note: `span ${h}h under minimum; not logged` })
      if (h > MAX_HOURS) return res.status(400).json({ error: `span ${h}h over sanity ceiling` })
      const entry = await harvest('time_entries', {
        method: 'POST',
        body: {
          project_id: DEFAULT_PROJECT_ID, task_id: DEFAULT_TASK_ID,
          spent_date: chiToday(), hours: h,
          notes: NOTE_PREFIX + String(title).slice(0, 200),
        },
      })
      return res.status(200).json({ ok: true, logged: true, entry_id: entry.id, hours: h })
    }
    return res.status(400).json({ error: 'action must be log' })
  } catch (e) {
    console.error('time failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
