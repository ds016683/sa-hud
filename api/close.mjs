// POST /api/close — Close the Day. The formal act: one final pipe sweep, the
// definitive past-tense record composed, the scorecard locked, the board
// snapshotted, the day committed to canon as a Daily Report row.
// Called by David's Close button (session token) or the midnight backstop
// cron (CRON_SECRET). A close is final; a re-close is allowed only until
// 3 AM Chicago the following morning.

import { syncAll } from './_sync-core.mjs'

export const config = { maxDuration: 300 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

const chiParts = () => {
  const now = new Date()
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(now))
  return { day, hour }
}
const chiDayOf = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts))
const prevDay = (day) => {
  const d = new Date(day + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} -> ${res.status}: ${(await res.text()).slice(0, 300)}`)
  if (res.status === 204 || prefer === 'return=minimal') return null
  return res.json()
}

const INSTRUCTIONS = `You are the CLOSE OF DAY for David Smith's personal operating system. The day is being formally committed to the permanent record (the Day Library). Write in PAST TENSE, second person, definitive: this is the canon record of the day, not a check-in. Gathering already happened; your judgment lives in the prose. Submit exactly one call to submit_close.

Objectives states: active = being worked; parked = queue; waiting = blocked on others; foreman = delegated (who = to whom); released today = finished today; inbox = awaiting triage; tags containing "agent" = system-discovered. David's dispositions are law. Session boards and project tasks belong to PROJECTS, never to personal Objectives, and project tasks never enter must_do.

Fields, each a separate top-level tool argument, never wrapped in a parent object and never stringified:
- summary: 5 to 8 sentences, past tense, addressed to David as "you": what the day was supposed to be, what it actually became, where the hours and conversations went, what shipped and what was handed off, how the board moved, and how the day ended. Close with one sentence naming what tomorrow inherits. The deterministic_scorecard in the payload includes signal; when signal.score is below 60, say plainly which parts of the day the record cannot see.
- accomplishments: the complete banked list: meeting outcomes, objectives RELEASED today (titles verbatim, note delegation), project tasks completed today ("<project name>: <task text>"), work the time entries evidence.
- noteworthy: 2 to 6 connective sentences linking today's events to other projects, people, decisions, or the days ahead. Empty only if the day truly had no threads.
- learned: concrete new knowledge from meetings and emails. Facts, not process.
- interactions: one per person engaged today, "Name · context", excluding David, skipping bulk senders.
- team_allocation: one line per person by hours descending, "Name · X.Xh · dominant client or project", closing with "Firm total · X.Xh across N people".
- new_items: what carries into tomorrow needing resourcing, tasking, or a decision, including blocked project tasks as "<project name>: <task text>". Nothing that is due today or overdue (the deterministic must-do list holds those).
- notes: the closing read, one paragraph: the day's pattern, calendar versus reality, board movement, deferrals acknowledged, and what deserves first attention tomorrow.

Never invent data. Never write an em dash; use commas, periods, or the middle dot.`

// Flat schema on purpose: nested wrappers get stringified by the model.
const ROW_FIELDS = ['summary', 'accomplishments', 'noteworthy', 'learned', 'interactions', 'team_allocation', 'new_items', 'notes']
const SUBMIT_TOOL = {
  name: 'submit_close',
  description: 'Commit the composed close-of-day record. Every field is a separate top-level argument.',
  input_schema: {
    type: 'object',
    required: ROW_FIELDS,
    properties: {
      summary: { type: 'string' },
      accomplishments: { type: 'array', items: { type: 'string' } },
      noteworthy: { type: 'array', items: { type: 'string' } },
      learned: { type: 'array', items: { type: 'string' } },
      interactions: { type: 'array', items: { type: 'string' } },
      team_allocation: { type: 'array', items: { type: 'string' } },
      new_items: { type: 'array', items: { type: 'string' } },
      notes: { type: 'string' },
    },
  },
}

function coerceFields(cand) {
  if (!cand || typeof cand !== 'object') return cand
  for (const k of ROW_FIELDS) {
    if (typeof cand[k] === 'string' && /^\s*[[{]/.test(cand[k])) {
      try { cand[k] = JSON.parse(cand[k]) } catch { /* leave as-is */ }
    }
  }
  return cand
}

export default async function handler(req, res) {
  // ---- auth: David's session, or the midnight backstop cron.
  // Vercel cron invocations arrive as GET (this bit us 9/9: the backstop's
  // first fire bounced 405), so the method gate must come after cron auth.
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  let isCron = false
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) isCron = true
  if (req.method !== 'POST' && !isCron) return res.status(405).json({ error: 'POST only (cron may GET)' })
  if (!isCron) {
    if (!token) return res.status(401).json({ error: 'missing token' })
    const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
    if (!who.ok) return res.status(401).json({ error: 'invalid session' })
    if ((await who.json()).id !== DAVID) return res.status(403).json({ error: 'not authorized' })
  }

  const { day: nowDay, hour } = chiParts()
  // Before 3 AM Chicago, the day being closed is the one that just ended.
  let TARGET = hour < 3 ? prevDay(nowDay) : nowDay

  // Backfill door: an explicit past day may be closed ONLY if it was never
  // closed (e.g. the backstop failed). A closed day stays locked forever.
  let reqBody = req.body
  if (typeof reqBody === 'string') { try { reqBody = JSON.parse(reqBody) } catch { reqBody = {} } }
  const requestedDay = String(reqBody?.day || '').match(/^\d{4}-\d{2}-\d{2}$/) ? reqBody.day : null
  const isBackfill = requestedDay && requestedDay < TARGET
  if (isBackfill) TARGET = requestedDay

  try {
    // ---- finality check
    const existing = await sb(`daily_performance?select=id,generated_at,scorecard&day=eq.${TARGET}&model=eq.Daily%20Report&order=generated_at.desc`)
    const closedRow = existing.find(r => r.scorecard && r.scorecard.closed_at)
    if (closedRow) {
      if (isCron) return res.status(200).json({ ok: true, day: TARGET, note: 'already closed; backstop stood down' })
      if (isBackfill) return res.status(409).json({ error: `day ${TARGET} is already closed and locked` })
      const inMercy = hour < 3 || nowDay === TARGET
      if (!inMercy) return res.status(409).json({ error: `day ${TARGET} is locked` })
    }

    // ---- final sweep + gather
    let pipes = null
    try { pipes = await syncAll() } catch (e) { pipes = { error: String(e.message || e) } }

    const [meetings, calendar, time, emails, objectives, boards, tasks, doneTasks, prior] = await Promise.all([
      sb(`granola_meetings?select=title,attendees,summary&meeting_date=eq.${TARGET}`),
      sb(`calendar_events?select=subject,start_at,end_at,organizer,attendees,is_all_day&day=eq.${TARGET}&is_cancelled=eq.false&order=start_at.asc`),
      sb(`time_entries?select=person,client,project,task,hours&spent_date=eq.${TARGET}`),
      sb(`emails?select=folder,subject,from_name,to_names,received_at,preview,is_read&day=eq.${TARGET}&order=received_at.asc`),
      sb(`objectives?select=id,title,state,due_date,is_anchor,is_emergency,released_at,released_kind,who,tags,captured_at&deleted_at=is.null`),
      sb(`session_boards?select=project,title,phases,updated_at`),
      sb(`project_tasks?select=id,text,status,source,due_date,project_id&status=neq.done`),
      sb(`project_tasks?select=id,text,project_id,released_at&status=eq.done&released_at=gte.${TARGET}T00:00:00-05:00&released_at=lt.${TARGET}T23:59:59-05:00`),
      sb(`daily_performance?select=summary,must_do,scorecard&day=eq.${TARGET}&order=generated_at.desc&limit=1`),
    ])

    // ---- final deterministic scorecard: the full-day, state-aware version
    const releasedToday = objectives.filter(o => o.released_at && chiDayOf(o.released_at) === TARGET)
    const capturedToday = objectives.filter(o => o.captured_at && chiDayOf(o.captured_at) === TARGET)
    const inboxEmails = emails.filter(e => e.folder === 'inbox')
    const emergencies = objectives.filter(o => o.is_emergency && ['active', 'parked', 'waiting', 'inbox'].includes(o.state))
    const agentInbox = objectives.filter(o => (o.tags || []).includes('agent') && o.state === 'inbox')
    const davidHours = time.filter(t => (t.person || '').startsWith('David')).reduce((s, t) => s + (t.hours || 0), 0)
    const firmHours = time.reduce((s, t) => s + (t.hours || 0), 0)
    const tasksDone = releasedToday.length + doneTasks.length
    const readRate = inboxEmails.length ? inboxEmails.filter(e => e.is_read).length / inboxEmails.length : 0
    const delegated = releasedToday.some(o => o.released_kind === 'foreman') || objectives.some(o => o.state === 'foreman' && o.who)

    const realMeetings = calendar.filter(e => !e.is_all_day && (e.attendees || []).length > 0)
    const notesRate = realMeetings.length ? Math.min(1, meetings.length / realMeetings.length) : null
    const timeRate = Math.min(1, davidHours / 8)
    const boardMoved = releasedToday.length > 0 || capturedToday.length > 0
    const inboxRate = inboxEmails.length >= 5 ? readRate : null
    const sigParts = [notesRate, timeRate, boardMoved ? 1 : 0, inboxRate].filter(v => v !== null)
    const signalScore = sigParts.length ? Math.round(100 * sigParts.reduce((s, v) => s + v, 0) / sigParts.length) : null

    const badges = []
    if (delegated) badges.push('cartographer')
    if (doneTasks.length >= 2) badges.push('leverage')
    if (tasksDone >= 3) badges.push('closer')
    if (objectives.some(o => o.state === 'waiting')) badges.push('walling')
    if (tasksDone >= 2 && emergencies.length === 0) badges.push('calm-water')
    if (agentInbox.length === 0 && tasksDone >= 1) badges.push('prospector')
    if (davidHours >= 4) badges.push('deep-work')
    if (readRate >= 0.8 && inboxEmails.length >= 10) badges.push('correspondent')
    if (meetings.length >= 3) badges.push('chronicler')
    if (signalScore !== null && signalScore >= 80 && sigParts.length >= 3) badges.push('clear-signal')

    let miles = 0
    miles += Math.min(4, tasksDone * 1.25)
    miles += Math.min(2, doneTasks.length + (delegated ? 1 : 0))
    miles += Math.min(2, davidHours / 3)
    miles += readRate >= 0.6 ? 1 : 0
    miles += emergencies.length === 0 ? 1 : 0
    miles = Math.round(Math.min(10, miles) * 10) / 10

    const stateCounts = {}
    for (const o of objectives) stateCounts[o.state] = (stateCounts[o.state] || 0) + 1
    const scorecard = {
      closed_at: new Date().toISOString(),
      closed_by: isCron ? 'backstop' : 'manual',
      meetings_captured: meetings.length,
      calendar_events: calendar.length,
      emails_in: inboxEmails.length,
      emails_read: inboxEmails.filter(e => e.is_read).length,
      emails_sent: emails.filter(e => e.folder === 'sent').length,
      tasks_done: tasksDone,
      hours_firm: Math.round(firmHours * 10) / 10,
      hours_david: Math.round(davidHours * 10) / 10,
      people_logging: new Set(time.map(t => t.person).filter(Boolean)).size,
      open_todos: objectives.filter(o => ['active', 'parked', 'waiting', 'inbox'].includes(o.state)).length,
      badges, miles,
      signal: { score: signalScore, notes: realMeetings.length ? `${meetings.length}/${realMeetings.length}` : null, time: Math.round(timeRate * 100), board: boardMoved, inbox: inboxRate !== null ? Math.round(inboxRate * 100) : null },
      // The board as it stood at close: the Ledger's daily board history.
      snapshot: {
        objective_states: stateCounts,
        active: objectives.filter(o => o.state === 'active').map(o => o.title),
        inbox: objectives.filter(o => o.state === 'inbox').map(o => o.title),
        released_today: releasedToday.map(o => o.title),
        open_project_tasks: tasks.length,
        blocked_project_tasks: tasks.filter(t => t.status === 'blocked').length,
      },
    }

    // ---- must_do is DETERMINISTIC (David's 9/8 rule): due today or overdue
    // only; dispositions are law; suggestions never appear. Final day state.
    const priorDone = new Set((((prior[0] || {}).must_do) || []).filter(t => t.done).map(t => t.text))
    const releasedTitlesMD = new Set(releasedToday.map(o => o.title))
    const mustDo = objectives
      .filter(o => ['active', 'parked', 'inbox'].includes(o.state))
      .filter(o => !(o.tags || []).includes('suggested'))
      .filter(o => o.due_date && o.due_date <= TARGET)
      .map(o => ({ text: o.title, done: priorDone.has(o.title) || releasedTitlesMD.has(o.title), due_date: o.due_date, overdue: o.due_date < TARGET }))
    for (const o of releasedToday) {
      if (o.due_date && o.due_date <= TARGET && !mustDo.some(m => m.text === o.title)) {
        mustDo.push({ text: o.title, done: true, due_date: o.due_date, overdue: false })
      }
    }
    mustDo.sort((a, b) => (a.due_date < b.due_date ? -1 : 1))

    // ---- compose the definitive record
    const boardsToday = boards.filter(b => chiDayOf(b.updated_at) === TARGET)
    const slimEmails = emails.map(e => ({ ...e, preview: (e.preview || '').slice(0, 240) }))
    const payload = { TARGET_DAY: TARGET, meetings, calendar, time_entries: time, emails: slimEmails, objectives, session_boards_updated_today: boardsToday, open_project_tasks: tasks, project_tasks_completed_today: doneTasks, prior_run: prior[0] || null, deterministic_scorecard: scorecard }

    let out = null
    let lastErr = ''
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      const ai = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-5', max_tokens: 24000, system: INSTRUCTIONS,
          tools: [SUBMIT_TOOL], tool_choice: { type: 'tool', name: 'submit_close' },
          messages: [{ role: 'user', content: `Ledger data for the day being closed:\n${JSON.stringify(payload)}` }],
        }),
      })
      if (!ai.ok) throw new Error(`anthropic -> ${ai.status}: ${await ai.text()}`)
      const msg = await ai.json()
      if (msg.stop_reason === 'max_tokens') { lastErr = 'truncated'; continue }
      const tu = (msg.content || []).find(c => c.type === 'tool_use' && c.name === 'submit_close')
      let cand = tu?.input
      if (typeof cand === 'string') { try { cand = JSON.parse(cand) } catch { /* noop */ } }
      // Legacy nesting tolerance: unwrap {row: {...}} if it still appears.
      if (cand && cand.row) {
        let r = cand.row
        if (typeof r === 'string') { try { r = JSON.parse(r) } catch { /* noop */ } }
        if (Array.isArray(r)) r = r[0]
        if (r && typeof r === 'object') cand = r
      }
      cand = coerceFields(cand)
      if (cand && typeof cand.summary === 'string' && cand.summary.length) {
        const row = {}
        for (const k of ROW_FIELDS) row[k] = cand[k]
        out = { row }
      } else {
        lastErr = `attempt ${attempt + 1}: keys ${Object.keys(cand || {}).join(',')}`
        console.error('submit_close unusable, raw head:', JSON.stringify(tu?.input).slice(0, 400))
      }
    }
    if (!out) throw new Error(`submit_close failed; ${lastErr}`)

    // ---- commit: replace any prior Daily Report rows for the day, then write
    for (const r of existing) await sb(`daily_performance?id=eq.${r.id}`, { method: 'DELETE' })
    const row = {
      ...out.row, day: TARGET, model: 'Daily Report', scorecard, must_do: mustDo,
      source_counts: { meetings: meetings.length, sessions: boardsToday.length, calendar: calendar.length, time: time.length, emails: emails.length, todos: scorecard.open_todos },
    }
    await sb('daily_performance', { method: 'POST', prefer: 'return=minimal', body: row })

    return res.status(200).json({ ok: true, day: TARGET, closed_by: scorecard.closed_by, miles, badges, signal: signalScore, snapshot: scorecard.snapshot, pipes })
  } catch (e) {
    console.error('close failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
