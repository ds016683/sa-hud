// Shared pipe logic: deterministic ports of the four hud-pipelines scripts,
// run on Vercel so freshness no longer depends on GitHub's cron scheduler.
// Same tables, same row shapes, same rolling-window + upsert-on-id semantics,
// so the GitHub Actions copies can keep running as a redundant backup.
// Granola uses the public API (grn_ key, summary_markdown) instead of the
// private refresh-token API the Actions script uses; rows are identical.

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const MAILBOX = 'david.smith@thirdhorizon.com'

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

async function sbUpsert(table, rows) {
  if (!rows.length) return 0
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?on_conflict=id`, {
    method: 'POST',
    headers: { ...sbHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) throw new Error(`upsert ${table} -> ${res.status}: ${(await res.text()).slice(0, 300)}`)
  return rows.length
}

const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')

// ---- Granola (public API): rolling 48h sweep, fill missing/thin summaries
export async function syncGranola() {
  const key = process.env.GRANOLA_API_KEY
  if (!key) throw new Error('GRANOLA_API_KEY not set')
  const gh = { Authorization: `Bearer ${key}`, Accept: 'application/json' }
  const createdAfter = iso(new Date(Date.now() - 48 * 3600e3))

  const summaries = []
  let cursor = null
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ created_after: createdAfter, page_size: '30' })
    if (cursor) qs.set('cursor', cursor)
    const res = await fetch(`https://public-api.granola.ai/v1/notes?${qs}`, { headers: gh })
    if (!res.ok) throw new Error(`granola /notes -> ${res.status}`)
    const d = await res.json()
    summaries.push(...(d.notes || []))
    if (!d.hasMore || !d.cursor) break
    cursor = d.cursor
  }

  // Which of these does the Ledger already hold with real content?
  const stored = {}
  if (summaries.length) {
    const ids = summaries.map(n => `"${n.id}"`).join(',')
    const res = await fetch(`${URL_BASE}/rest/v1/granola_meetings?select=id,summary&id=in.(${ids})`, { headers: sbHeaders() })
    if (res.ok) for (const r of await res.json()) stored[r.id] = (r.summary || '').trim().length
  }

  const rows = []
  let pending = 0
  for (const n of summaries) {
    if ((stored[n.id] || 0) > 50) continue
    const res = await fetch(`https://public-api.granola.ai/v1/notes/${n.id}`, { headers: gh })
    if (!res.ok) { pending++; continue }
    const full = await res.json()
    const summary = (full.summary_markdown || full.summary_text || '').trim()
    if (summary.length <= 50) { pending++; continue }
    const attendees = (full.attendees || [])
      .map(a => a.name || a.email || (a.emailAddress || {}).name || '')
      .filter(Boolean)
    rows.push({
      id: n.id,
      title: n.title || '(untitled)',
      meeting_date: (n.created_at || '').slice(0, 10),
      attendees,
      summary,
      granola_created_at: n.created_at,
    })
  }
  const written = await sbUpsert('granola_meetings', rows)
  return { written, pending, in_window: summaries.length }
}

// ---- Microsoft Graph shared token
async function graphToken() {
  const body = new URLSearchParams({
    client_id: process.env.M365_CLIENT_ID,
    client_secret: process.env.M365_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  const res = await fetch(`https://login.microsoftonline.com/${process.env.M365_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', body })
  if (!res.ok) throw new Error(`graph token -> ${res.status}`)
  return (await res.json()).access_token
}

async function graphPages(url, token) {
  const out = []
  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`graph -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const page = await res.json()
    out.push(...(page.value || []))
    url = page['@odata.nextLink'] || null
  }
  return out
}

const chicagoDay = (ts) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date(ts))

// ---- Email: Inbox + SentItems, rolling 48h
export async function syncEmail(token) {
  token = token || await graphToken()
  const since = iso(new Date(Date.now() - 48 * 3600e3))
  const rows = []
  for (const [folder, label, tf] of [['Inbox', 'inbox', 'receivedDateTime'], ['SentItems', 'sent', 'sentDateTime']]) {
    const qs = new URLSearchParams({
      $filter: `${tf} ge ${since}`,
      $select: `id,subject,from,toRecipients,${tf},bodyPreview,isRead`,
      $orderby: `${tf} desc`,
      $top: '100',
    })
    const msgs = await graphPages(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/mailFolders/${folder}/messages?${qs}`, token)
    for (const m of msgs) {
      const ts = m[tf]
      const frm = (m.from || {}).emailAddress || {}
      rows.push({
        id: m.id, folder: label,
        subject: m.subject || '(no subject)',
        from_name: frm.name || null, from_email: frm.address || null,
        to_names: (m.toRecipients || []).map(r => (r.emailAddress || {}).name || (r.emailAddress || {}).address).filter(Boolean),
        received_at: ts, day: ts ? chicagoDay(ts) : null,
        preview: (m.bodyPreview || '').slice(0, 500),
        is_read: m.isRead, synced_at: new Date().toISOString(),
      })
    }
  }
  const written = await sbUpsert('emails', rows)
  return { written }
}

// ---- Calendar: -1d..+7d calendarView
export async function syncCalendar(token) {
  token = token || await graphToken()
  const start = new Date(Date.now() - 1 * 86400e3).toISOString().slice(0, 10) + 'T00:00:00Z'
  const end = new Date(Date.now() + 7 * 86400e3).toISOString().slice(0, 10) + 'T00:00:00Z'
  const url = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/calendarView?startDateTime=${start}&endDateTime=${end}&$top=200&$select=id,subject,start,end,attendees,organizer,isAllDay,isCancelled`
  const events = await graphPages(url, token)
  const rows = events.map(e => {
    const s = e.start.dateTime.slice(0, 19) + 'Z'
    return {
      id: e.id, subject: e.subject || '(no subject)',
      start_at: s, end_at: e.end.dateTime.slice(0, 19) + 'Z', day: s.slice(0, 10),
      organizer: ((e.organizer || {}).emailAddress || {}).name || null,
      attendees: (e.attendees || []).map(a => (a.emailAddress || {}).name).filter(Boolean),
      is_all_day: !!e.isAllDay, is_cancelled: !!e.isCancelled,
      synced_at: new Date().toISOString(),
    }
  })
  const written = await sbUpsert('calendar_events', rows)
  return { written }
}

// ---- Harvest: firm-wide, rolling 7 days by spent_date
export async function syncHarvest() {
  const H = {
    Authorization: `Bearer ${process.env.HARVEST_ACCESS_TOKEN}`,
    'Harvest-Account-Id': process.env.HARVEST_ACCOUNT_ID,
    'User-Agent': 'th-sa-hud sync (david.smith@thirdhorizon.com)',
  }
  const frm = new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10)
  let url = `https://api.harvestapp.com/v2/time_entries?from=${frm}&per_page=100`
  const entries = []
  while (url) {
    const res = await fetch(url, { headers: H })
    if (!res.ok) throw new Error(`harvest -> ${res.status}`)
    const page = await res.json()
    entries.push(...(page.time_entries || []))
    url = (page.links || {}).next || null
  }
  const rows = entries.map(t => ({
    id: t.id,
    person: (t.user || {}).name || null, client: (t.client || {}).name || null,
    project: (t.project || {}).name || null, task: (t.task || {}).name || null,
    hours: t.hours, notes: t.notes, spent_date: t.spent_date, billable: t.billable,
    synced_at: new Date().toISOString(),
  }))
  const written = await sbUpsert('time_entries', rows)
  return { written }
}

// ---- Run everything; never let one pipe's failure hide the others' results.
export async function syncAll() {
  let token = null
  try { token = await graphToken() } catch { /* email+calendar will each report */ }
  const [granola, email, calendar, harvest] = await Promise.allSettled([
    syncGranola(), syncEmail(token), syncCalendar(token), syncHarvest(),
  ])
  const shape = (r) => r.status === 'fulfilled' ? { ok: true, ...r.value } : { ok: false, error: String(r.reason?.message || r.reason).slice(0, 200) }
  return { granola: shape(granola), email: shape(email), calendar: shape(calendar), harvest: shape(harvest) }
}
