// POST /api/refresh — the manual Daily Performance update.
// Auth: caller must send David's Supabase access token (Authorization: Bearer).
// Flow: verify user → fetch 8 Ledger sources → one Anthropic call composes the
// row + any discovered objectives → deterministic writes back to the Ledger.
// Env (Vercel project): SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY.

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
- summary: 3 to 5 sentences: what the day held (calendar), what happened (meetings, session-board movement, hours, email flow, objectives released), what remains ahead. Honest when thin.
- accomplishments: array: meeting outcomes worth banking, board tasks done today (verbatim, project-prefixed), objectives RELEASED today (titles verbatim, note delegation), project tasks completed today (formatted "<project name>: <task text>"), work the time entries evidence.
- learned: array of concrete new knowledge from meetings and emails. Empty if nothing qualifies.
- interactions: array, one per person engaged today, "Name · context", from meetings + calendar + significant email correspondents (skip bulk), excluding David.
- team_allocation: array, one line per person by hours descending, "Name · X.Xh · dominant client or project", closing with "Firm total · X.Xh across N people". Empty if no time data.
- must_do: array of {"text": string, "done": bool}, DERIVED FROM OBJECTIVES ONLY: (a) active objectives due on/before TODAY: done false; (b) "agent"-tagged objectives in inbox or active (due null or on/before TODAY): done false; (c) "agent"-tagged objectives released TODAY: done true; (d) any title marked done:true in the prior run's must_do stays done:true. EXCLUDE waiting, foreman, deleted, future-dated. Project tasks NEVER appear here. Any objective you list in create_objectives also appears here with done false.
- new_items: array: blocked project tasks formatted "<project name>: <task text>", emails needing delegation, emergency objectives. Nothing already in must_do.
- notes: one short paragraph, your read: time vs calendar, email shape, objectives and project movement; acknowledge deferrals/delegations and already-tracked discoveries when they occurred.
- source_counts: {"meetings": N, "sessions": N, "calendar": N, "time": N, "emails": N, "todos": N} where todos = objectives in state active, parked, waiting, or inbox (counts computed from the provided data).
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
        required: ['day', 'summary', 'accomplishments', 'learned', 'interactions', 'team_allocation', 'must_do', 'new_items', 'notes', 'source_counts', 'model'],
        properties: {
          day: { type: 'string' },
          summary: { type: 'string' },
          accomplishments: { type: 'array', items: { type: 'string' } },
          learned: { type: 'array', items: { type: 'string' } },
          interactions: { type: 'array', items: { type: 'string' } },
          team_allocation: { type: 'array', items: { type: 'string' } },
          must_do: { type: 'array', items: { type: 'object', required: ['text', 'done'], properties: { text: { type: 'string' }, done: { type: 'boolean' } } } },
          new_items: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          source_counts: {
            type: 'object',
            required: ['meetings', 'sessions', 'calendar', 'time', 'emails', 'todos'],
            properties: { meetings: { type: 'integer' }, sessions: { type: 'integer' }, calendar: { type: 'integer' }, time: { type: 'integer' }, emails: { type: 'integer' }, todos: { type: 'integer' } },
          },
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
    // ---- mechanical gather (mirrors the retired heartbeat's 8 sources)
    const [meetings, calendar, time, emails, objectives, boards, tasks, projects, prior] = await Promise.all([
      sb(`granola_meetings?select=title,attendees,summary&meeting_date=eq.${TODAY}`),
      sb(`calendar_events?select=subject,start_at,end_at,organizer,attendees&day=eq.${TODAY}&is_cancelled=eq.false&order=start_at.asc`),
      sb(`time_entries?select=person,client,project,task,hours&spent_date=eq.${TODAY}`),
      sb(`emails?select=folder,subject,from_name,to_names,received_at,preview&day=eq.${TODAY}&order=received_at.asc`),
      sb(`objectives?select=id,title,state,due_date,is_anchor,is_emergency,released_at,released_kind,who,tags,description&deleted_at=is.null`),
      sb(`session_boards?select=project,title,phases,updated_at`),
      sb(`project_tasks?select=id,text,status,source,due_date,project_id&status=neq.done`),
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
    const payload = { TODAY, meetings, calendar, time_entries: time, emails: slimEmails, objectives, session_boards_updated_today: boardsToday, open_project_tasks: tasks, projects, prior_run: prior[0] || null }
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
    if (msg.stop_reason === 'max_tokens') throw new Error('composition truncated (max_tokens); raise the cap')
    const toolUse = (msg.content || []).find(c => c.type === 'tool_use' && c.name === 'submit_update')
    if (!toolUse) throw new Error('model did not call submit_update')
    let out = toolUse.input
    // Defensive coercion: the tool input occasionally arrives stringified, with
    // the row fields flattened to the top level, or with objects array-wrapped.
    if (typeof out === 'string') { try { out = JSON.parse(out) } catch { /* fall through */ } }
    if (out && !out.row && out.day && out.summary) {
      const { create_objectives, ...rest } = out
      out = { row: rest, create_objectives: create_objectives || [] }
    }
    if (typeof out.row === 'string') { try { out.row = JSON.parse(out.row) } catch { /* fall through */ } }
    if (Array.isArray(out.row)) out.row = out.row[0]
    if (!out.row || typeof out.row !== 'object') throw new Error(`submit_update shape unusable; top-level keys: ${Object.keys(out || {}).join(', ')}`)
    if (!Array.isArray(out.create_objectives)) out.create_objectives = []

    // ---- deterministic writes
    const created = []
    for (const c of out.create_objectives || []) {
      const tags = c.maybe_dupe ? ['agent', 'maybe-dupe'] : ['agent']
      const description = `Manual refresh: discovered from ${c.source} on ${TODAY}` + (c.maybe_dupe && c.closest ? ` · Possible duplicate of: ${c.closest}` : '')
      await sb('objectives', { method: 'POST', prefer: 'return=minimal', body: { user_id: DAVID, title: String(c.title).slice(0, 120), state: 'inbox', tags, needs_sizing: true, effort: 2, importance: 2, description } })
      created.push(c.title)
    }
    const row = { ...out.row, day: TODAY, model: 'Manual Refresh' }
    await sb('daily_performance', { method: 'POST', prefer: 'return=minimal', body: row })

    return res.status(200).json({ ok: true, day: TODAY, source_counts: row.source_counts, created_objectives: created })
  } catch (e) {
    console.error('refresh failed:', e)
    return res.status(500).json({ error: String(e.message || e) })
  }
}
