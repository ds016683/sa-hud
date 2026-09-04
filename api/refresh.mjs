// POST /api/refresh — the manual Daily Performance update.
// Auth: caller must send David's Supabase access token (Authorization: Bearer).
// Flow: verify user → fetch 8 Ledger sources → one Anthropic call composes the
// row + any discovered objectives → deterministic writes back to the Ledger.
// Env (Vercel project): SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY.

import { syncAll } from './_sync-core.mjs'

export const config = { maxDuration: 300 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

function chicagoToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const key = process.env.SUPABASE_SERVICE_KEY
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} -> ${res.status}: ${await res.text()}`)
  if (res.status === 204 || prefer === 'return=minimal') return null
  return res.json()
}

const INSTRUCTIONS = `You are the Daily Performance update for David Smith's personal operating system. You are given today's raw Ledger data as JSON. Gathering already happened; your job is judgment and prose. Submit your composed update by calling the submit_update tool exactly once.

Objectives states: active = being worked (is_anchor true = keystone); parked = queue; waiting = blocked on others; foreman = delegated (who = to whom); released + released_at TODAY = finished today; inbox = awaiting David's triage; is_emergency = fire. Objectives tagged "agent" were discovered by a prior run. David's dispositions are law.

BOUNDARY: session boards and project tasks belong to PROJECTS, not to David's personal Objectives. NEVER propose objectives from session-board content or project tasks. Discovery draws ONLY from emails and meeting follow-ups.

"create_objectives": to-do items David must personally act on, from inbound emails clearly requiring his reply or decision and meeting follow-ups assigned to him with no owner elsewhere. For EACH candidate, compare meaning (not exact strings) against ALL existing objectives AND open project tasks: clear match somewhere = do NOT include (acknowledge in notes); no plausible match = include as {"title": imperative max 120 chars, "maybe_dupe": false, "source": "<email/meeting + who>"}; unsure = include with "maybe_dupe": true and "closest": "<closest existing title>". Empty array when nothing qualifies.

"row" fields:
- day: the provided TODAY
- summary: written TO David in second person, opening with "Since your last check-in" (vary the sentence naturally after that opening; if there is no prior run today, open with "Since this morning" or similar). This is a SYNTHESIS, not a chronology: never walk the calendar hour by hour. Lead with what changed and what matters since the prior run (compare against prior_run when present), pull the connections and the noteworthy into the prose itself ("your Westat block set up what Thomasina needs Friday"), name what remains ahead, and be honest when thin. 5 to 8 sentences of dense, direct address.
- accomplishments: array, WHAT GOT DONE, concrete and complete: meeting outcomes worth banking, objectives RELEASED today (titles verbatim, note delegation), project tasks completed today (formatted "<project name>: <task text>", from project_tasks_completed_today), board tasks done today (verbatim, project-prefixed), work the time entries evidence. Every completed thing appears; nothing aspirational does.
- noteworthy: 2 to 6 strings, the day's CONNECTIVE tissue. Each is one sentence that links two or more things: a meeting outcome that changes a project or objective, an email thread that touches a live deal or decision, a pattern across the team's hours, something said today that matters for a thing happening later this week. Write the connection explicitly ("X, which bears on Y"). Never restate a bare fact that sits in one lane; if it connects nothing, it does not belong here. Empty only when the day genuinely has no threads.
- learned: array of concrete new knowledge from meetings and emails. Empty if nothing qualifies.
- interactions: array, one per person engaged today, "Name · context", from meetings + calendar + significant email correspondents (skip bulk), excluding David.
- team_allocation: array, one line per person by hours descending, "Name · X.Xh · dominant client or project", closing with "Firm total · X.Xh across N people". Empty if no time data.
- must_do: array of {"text": string, "done": bool}, DERIVED FROM OBJECTIVES ONLY: (a) active objectives due on/before TODAY: done false; (b) "agent"-tagged objectives in inbox or active (due null or on/before TODAY): done false; (c) "agent"-tagged objectives released TODAY: done true; (d) any title marked done:true in the prior run's must_do stays done:true. EXCLUDE waiting, foreman, deleted, future-dated. Project tasks NEVER appear here. Any objective you list in create_objectives also appears here with done false.
- new_items: array: blocked project tasks formatted "<project name>: <task text>", emails needing delegation, emergency objectives. Nothing already in must_do.
- notes: one short paragraph, your read: time vs calendar, email shape, objectives and project movement; acknowledge deferrals/delegations and already-tracked discoveries when they occurred.
- model: "Manual Refresh"

Never invent data. Never write an em dash anywhere; use commas, periods, or the middle dot.`

const SUBMIT_TOOL = {
  name: 'submit_update',
  description: 'Submit the composed Daily Performance update.',
  input_schema: {
    type: 'object',
    required: ['row', 'create_objectives'],
    properties: {
      row: {
        type: 'object',
        required: ['day', 'summary', 'accomplishments', 'noteworthy', 'learned', 'interactions', 'team_allocation', 'must_do', 'new_items', 'notes', 'model'],
        properties: {
          day: { type: 'string' },
          summary: { type: 'string' },
          accomplishments: { type: 'array', items: { type: 'string' } },
          noteworthy: { type: 'array', items: { type: 'string' } },
          learned: { type: 'array', items: { type: 'string' } },
          interactions: { type: 'array', items: { type: 'string' } },
          team_allocation: { type: 'array', items: { type: 'string' } },
          must_do: { type: 'array', items: { type: 'object', required: ['text', 'done'], properties: { text: { type: 'string' }, done: { type: 'boolean' } } } },
          new_items: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          model: { type: 'string' },
        },
      },
      create_objectives: {
        type: 'array',
        items: {
          type: 'object',
          required: ['title', 'maybe_dupe', 'source'],
          properties: { title: { type: 'string' }, maybe_dupe: { type: 'boolean' }, source: { type: 'string' }, closest: { type: 'string' } },
        },
      },
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  // ---- auth: must be David's live Supabase session
  const token = (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token) return res.status(401).json({ error: 'missing token' })
  const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
  if (!who.ok) return res.status(401).json({ error: 'invalid session' })
  const user = await who.json()
  if (user.id !== DAVID) return res.status(403).json({ error: 'not authorized' })

  const TODAY = chicagoToday()
  try {
    // ---- pull the pipes FIRST so the update never summarizes a stale Ledger.
    // Pipe failures don't block composition; they're reported alongside.
    let pipes = null
    try { pipes = await syncAll() } catch (e) { pipes = { error: String(e.message || e) } }

    // ---- mechanical gather (mirrors the retired heartbeat's 8 sources)
    const [meetings, calendar, time, emails, objectives, boards, tasks, doneTasks, projects, prior] = await Promise.all([
      sb(`granola_meetings?select=title,attendees,summary&meeting_date=eq.${TODAY}`),
      sb(`calendar_events?select=subject,start_at,end_at,organizer,attendees&day=eq.${TODAY}&is_cancelled=eq.false&order=start_at.asc`),
      sb(`time_entries?select=person,client,project,task,hours&spent_date=eq.${TODAY}`),
      sb(`emails?select=folder,subject,from_name,to_names,received_at,preview,is_read&day=eq.${TODAY}&order=received_at.asc`),
      sb(`objectives?select=id,title,state,due_date,is_anchor,is_emergency,released_at,released_kind,who,tags,description,captured_at&deleted_at=is.null`),
      sb(`session_boards?select=project,title,phases,updated_at`),
      sb(`project_tasks?select=id,text,status,source,due_date,project_id&status=neq.done`),
      sb(`project_tasks?select=id,text,project_id,released_at&status=eq.done&released_at=gte.${TODAY}T00:00:00-06:00`),
      sb(`projects?select=id,key,name`),
      sb(`daily_performance?select=*&day=eq.${TODAY}&order=generated_at.desc&limit=1`),
    ])
    const boardsToday = boards.filter(b => {
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(b.updated_at))
      return d === TODAY
    })

    // ---- one model call composes everything (payload slimmed so the response
    // budget goes to the composition, not to echoing long email previews)
    const slimEmails = emails.map(e => ({ ...e, preview: (e.preview || '').slice(0, 240) }))
    const payload = { TODAY, meetings, calendar, time_entries: time, emails: slimEmails, objectives, session_boards_updated_today: boardsToday, open_project_tasks: tasks, project_tasks_completed_today: doneTasks, projects, prior_run: prior[0] || null }

    // ---- deterministic scorecard: pure counts, never model-composed
    const releasedToday = objectives.filter(o => o.state === 'released' && (o.released_at || '').length && chicagoToday() === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(o.released_at)))
    const inboxEmails = emails.filter(e => e.folder === 'inbox')
    const firmHours = time.reduce((s, t) => s + (t.hours || 0), 0)
    const davidHours = time.filter(t => (t.person || '').startsWith('David')).reduce((s, t) => s + (t.hours || 0), 0)
    const scorecard = {
      meetings_captured: meetings.length,
      calendar_events: calendar.length,
      emails_in: inboxEmails.length,
      emails_read: inboxEmails.filter(e => e.is_read).length,
      emails_sent: emails.filter(e => e.folder === 'sent').length,
      tasks_done: releasedToday.length + doneTasks.length,
      hours_firm: Math.round(firmHours * 10) / 10,
      hours_david: Math.round(davidHours * 10) / 10,
      people_logging: new Set(time.map(t => t.person).filter(Boolean)).size,
      open_todos: objectives.filter(o => ['active', 'parked', 'waiting', 'inbox'].includes(o.state)).length,
    }

    // ---- Signal: how legible the day is to the agent. Perception depends on
    // instrumentation; this scores the instrumentation itself. Components only
    // count when they have a denominator, so quiet days are never punished.
    const nowMs = Date.now()
    const chiDay = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts))
    const endedMeetings = calendar.filter(e => !e.is_all_day && (e.attendees || []).length > 0 && new Date(e.end_at).getTime() < nowMs)
    const notesRate = endedMeetings.length ? Math.min(1, meetings.length / endedMeetings.length) : null
    // Elapsed workday: 8 AM to 6 PM Chicago, capped at 8 expected hours.
    const chiHour = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date()))
    const elapsed = Math.max(0, Math.min(8, chiHour - 8))
    const timeRate = elapsed >= 2 ? Math.min(1, davidHours / elapsed) : null
    const boardMoved = releasedToday.length > 0 || objectives.some(o => o.captured_at && chiDay(o.captured_at) === TODAY)
    const inboxRate = inboxEmails.length >= 5 ? scorecard.emails_read / inboxEmails.length : null
    const sigParts = [notesRate, timeRate, boardMoved ? 1 : 0, inboxRate].filter(v => v !== null)
    const signalScore = sigParts.length ? Math.round(100 * sigParts.reduce((s, v) => s + v, 0) / sigParts.length) : null
    scorecard.signal = {
      score: signalScore,
      notes: endedMeetings.length ? `${meetings.length}/${endedMeetings.length}` : null,
      time: timeRate !== null ? Math.round(timeRate * 100) : null,
      board: boardMoved,
      inbox: inboxRate !== null ? Math.round(inboxRate * 100) : null,
    }

    // ---- badges: the intrinsic scoreboard (Volume II, Requirement 1).
    // Deterministic rules only; the model never judges. Loot rules: completion
    // and deployment earn, calm is rewarded, crisis endurance never is.
    const delegatedToday = objectives.filter(o => o.state === 'foreman' && o.who)
    const emergencies = objectives.filter(o => o.is_emergency && ['active', 'parked', 'waiting', 'inbox'].includes(o.state))
    const agentInbox = objectives.filter(o => (o.tags || []).includes('agent') && o.state === 'inbox')
    const readRate = inboxEmails.length ? scorecard.emails_read / inboxEmails.length : 0
    const badges = []
    // Master Architect track (design over domination, leverage, handoff)
    if (releasedToday.some(o => o.released_kind === 'foreman') || delegatedToday.length >= 1) badges.push('cartographer')
    if (doneTasks.length >= 2) badges.push('leverage')
    if (scorecard.tasks_done >= 3) badges.push('closer')
    // Integrated Sovereign track (strength without rigidity, boundaries)
    if (objectives.some(o => o.state === 'waiting')) badges.push('walling')
    if (scorecard.tasks_done >= 2 && emergencies.length === 0) badges.push('calm-water')
    if (agentInbox.length === 0 && scorecard.tasks_done >= 1) badges.push('prospector')
    // Playbound Creator + production
    if (scorecard.hours_david >= 4) badges.push('deep-work')
    if (readRate >= 0.8 && inboxEmails.length >= 10) badges.push('correspondent')
    if (meetings.length >= 3) badges.push('chronicler')
    // Perception track: the day is fully legible to the agent
    if (signalScore !== null && signalScore >= 80 && sigParts.length >= 3) badges.push('clear-signal')
    scorecard.badges = badges

    // ---- miles made: the day's precision score, 0-10. Completion-weighted,
    // calm-bonused, never crisis-rewarded. Collected into the Day Library.
    let miles = 0
    miles += Math.min(4, scorecard.tasks_done * 1.25)              // completion is the core
    miles += Math.min(2, doneTasks.length + (delegatedToday.length ? 1 : 0)) // deployment/handoff
    miles += Math.min(2, scorecard.hours_david / 3)                // real engagement, capped low
    miles += readRate >= 0.6 ? 1 : 0                               // correspondence handled
    miles += emergencies.length === 0 ? 1 : 0                      // calm water bonus
    scorecard.miles = Math.round(Math.min(10, miles) * 10) / 10
    // The tool input is occasionally malformed (stringified row, flattened
    // fields, array wrapping) run-to-run. Coerce what we can and retry the
    // model call once before giving up.
    let out = null
    let lastShapeError = ''
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      const ai = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 24000,
          system: INSTRUCTIONS,
          tools: [SUBMIT_TOOL],
          tool_choice: { type: 'tool', name: 'submit_update' },
          messages: [{ role: 'user', content: `Ledger data:\n${JSON.stringify(payload)}` }],
        }),
      })
      if (!ai.ok) throw new Error(`anthropic -> ${ai.status}: ${await ai.text()}`)
      const msg = await ai.json()
      if (msg.stop_reason === 'max_tokens') { lastShapeError = 'truncated at max_tokens'; continue }
      const toolUse = (msg.content || []).find(c => c.type === 'tool_use' && c.name === 'submit_update')
      if (!toolUse) { lastShapeError = 'no submit_update call'; continue }
      let cand = toolUse.input
      if (typeof cand === 'string') { try { cand = JSON.parse(cand) } catch { /* fall through */ } }
      if (cand && !cand.row && cand.day && cand.summary) {
        const { create_objectives, ...rest } = cand
        cand = { row: rest, create_objectives: create_objectives || [] }
      }
      if (cand && typeof cand.row === 'string') { try { cand.row = JSON.parse(cand.row) } catch { /* fall through */ } }
      if (cand && Array.isArray(cand.row)) cand.row = cand.row[0]
      if (cand && cand.row && typeof cand.row === 'object' && cand.row.summary) {
        if (!Array.isArray(cand.create_objectives)) cand.create_objectives = []
        out = cand
      } else {
        lastShapeError = `attempt ${attempt + 1}: row js-type ${Array.isArray(cand?.row) ? 'array' : typeof cand?.row}, keys ${Object.keys(cand || {}).join(',')}`
      }
    }
    if (!out) throw new Error(`submit_update shape unusable after retry; ${lastShapeError}`)

    // ---- deterministic writes
    const created = []
    for (const c of out.create_objectives || []) {
      const tags = c.maybe_dupe ? ['agent', 'maybe-dupe'] : ['agent']
      const description = `Manual refresh: discovered from ${c.source} on ${TODAY}` + (c.maybe_dupe && c.closest ? ` · Possible duplicate of: ${c.closest}` : '')
      await sb('objectives', { method: 'POST', prefer: 'return=minimal', body: { user_id: DAVID, title: String(c.title).slice(0, 120), state: 'inbox', tags, needs_sizing: true, effort: 2, importance: 2, description } })
      created.push(c.title)
    }
    // source_counts is mechanical, never model-authored (a run once emitted {}).
    const row = {
      ...out.row, day: TODAY, model: 'Manual Refresh', scorecard,
      source_counts: {
        meetings: meetings.length, sessions: boardsToday.length, calendar: calendar.length,
        time: time.length, emails: emails.length, todos: scorecard.open_todos,
      },
    }
    try {
      await sb('daily_performance', { method: 'POST', prefer: 'return=minimal', body: row })
    } catch (e) {
      // Migration lag: if the noteworthy/scorecard columns aren't in the table
      // yet, land the row without them rather than failing the whole update.
      if (String(e.message).includes('PGRST204')) {
        const { noteworthy, scorecard: _sc, ...bare } = row
        await sb('daily_performance', { method: 'POST', prefer: 'return=minimal', body: bare })
      } else throw e
    }

    return res.status(200).json({ ok: true, day: TODAY, source_counts: row.source_counts, created_objectives: created, pipes })
  } catch (e) {
    console.error('refresh failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
