// The Ledger toolbox: every read and write the Friend can perform, shared by
// the MCP server (api/mcp.mjs) and Lumen's brain (api/_lumen-brain.mjs).
// Reads are the v1 set; writes are the "hands" (David's 9/14 top-of-list ask).
// Writes touch only David's own tables and always go through PostgREST with
// the service key; nothing here can reach the pipes or the identity bucket.

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
export const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY
  return { apikey: key, Authorization: `Bearer ${key}` }
}
export async function sb(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`${path.split('?')[0]} -> ${res.status}`)
  return res.json()
}
export async function sbWrite(method, path, body, prefer = 'return=representation') {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    method, headers: { ...sbHeaders(), 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path.split('?')[0]} -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const txt = await res.text()
  return txt ? JSON.parse(txt) : null
}
export async function identityDoc(name) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/identity/${name}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`identity/${name} -> ${res.status}`)
  return res.text()
}
export const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const chiDayOf = (ts) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts))
const esc = (s) => String(s).replace(/[%_,()]/g, '')
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }

const OBJ_STATES = ['active', 'parked', 'waiting', 'follow_up', 'foreman', 'released', 'inbox']

// Exact title first, then a contains match; refuses ambiguity rather than guessing.
async function findObjective(title) {
  const q = esc(title || '')
  if (!q) throw new Error('title required')
  const exact = await sb(`objectives?select=id,title,state,due_date,follow_up_date,activated_at&deleted_at=is.null&title=ilike.${encodeURIComponent(q)}&limit=5`)
  if (exact.length === 1) return exact[0]
  const like = await sb(`objectives?select=id,title,state,due_date,follow_up_date,activated_at&deleted_at=is.null&title=ilike.*${encodeURIComponent(q)}*&order=captured_at.desc&limit=5`)
  if (like.length === 1) return like[0]
  if (!like.length) throw new Error(`no objective matches "${title}"`)
  throw new Error(`"${title}" is ambiguous: ${like.map(o => `${o.title} (${o.state})`).join(' | ')}`)
}

// ---------------------------------------------------------------- tools
export const TOOLS = [
  // ---- reads
  {
    name: 'get_context',
    description: "David's distilled operating context (who he is, how his architecture runs, how to work with him) plus the live state of today's game: miles, grade, badges, signal, must-dos. Call this at the start of any conversation that touches David's work, day, decisions, or wellbeing.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_today',
    description: "Today's live snapshot from the Ledger: the latest composed summary, deterministic scorecard, noteworthy threads, must-do list, follow-ups coming due, new items, and the rest of today's WORK calendar (Outlook/Microsoft 365). Use this for any question about David's day or schedule; never a device-local calendar.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_objectives',
    description: "David's personal task board (Objectives), grouped by state: active (being worked), parked (queue), waiting (blocked on others), follow_up (parked against a future follow_up_date; the system nudges him from two days out), foreman (delegated), inbox (awaiting his triage), plus anything released today. His dispositions are law.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_projects',
    description: 'The projects layer: long-standing projects with their open tasks. Tasks with status "blocked" are decisions waiting on David. Project tasks are separate from personal Objectives.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'search_meetings',
    description: 'Search Granola meeting notes (title and summary text). Returns matching meetings with dates, attendees, and summaries. Use for "what did we decide with X," "when did I last talk to Y."',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'text to search for' }, limit: { type: 'integer', description: 'max results, default 5' } }, required: ['query'] },
  },
  {
    name: 'search_emails',
    description: "Search David's piped email (subject, sender, preview) over recent days. Previews only; full bodies stay in the mailbox.",
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, days: { type: 'integer', description: 'lookback window in days, default 14' } }, required: ['query'] },
  },
  {
    name: 'get_day',
    description: 'A finished day from the Day Library: the definitive Daily Report record plus its collection scorecard (miles, grade, badges, signal). Date format YYYY-MM-DD.',
    inputSchema: { type: 'object', properties: { date: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['date'] },
  },
  {
    name: 'get_volume',
    description: "Full Sovereign Architect texts. volume='operating-manual' (Volume II, the functional frameworks) may be pulled whenever mechanics depth helps. volume='psyche-map' (Volume I) and volume='somatic' (Volume III) are deeply personal: retrieve ONLY when David explicitly asks for them by name in this conversation, never proactively.",
    inputSchema: { type: 'object', properties: { volume: { type: 'string', enum: ['operating-manual', 'psyche-map', 'somatic'] } }, required: ['volume'] },
  },
  // ---- writes (the hands)
  {
    name: 'add_objective',
    description: "Capture a new objective on David's board. Default state is 'inbox' (awaiting his triage); use 'active' only when he says to start it now, 'parked' for the queue, 'follow_up' with a follow_up_date when he wants to be nudged later, 'waiting' when the ball is in someone else's court. Never create duplicates of things already on the board: check get_objectives first when unsure.",
    inputSchema: { type: 'object', properties: {
      title: { type: 'string' },
      state: { type: 'string', enum: ['inbox', 'parked', 'active', 'follow_up', 'waiting'] },
      due_date: { type: 'string', description: 'YYYY-MM-DD' },
      follow_up_date: { type: 'string', description: 'YYYY-MM-DD; required when state is follow_up' },
      description: { type: 'string' },
      tags: { type: 'array', items: { type: 'string' }, description: "e.g. ['third-horizon','client'] or ['personal']" },
    }, required: ['title'] },
  },
  {
    name: 'move_objective',
    description: "Change an objective's state by title: 'released' marks it done (this is the completion action), 'active' plays it onto the board and starts its clock, 'parked' queues it, 'waiting' parks it on someone else, 'follow_up' parks it against a follow_up_date (default one week out), 'inbox' sends it back to triage. Title matching is exact-then-contains and refuses ambiguity.",
    inputSchema: { type: 'object', properties: {
      title: { type: 'string' },
      state: { type: 'string', enum: OBJ_STATES },
      follow_up_date: { type: 'string', description: 'YYYY-MM-DD, for follow_up' },
      due_date: { type: 'string', description: 'YYYY-MM-DD, to (re)set a due date' },
    }, required: ['title', 'state'] },
  },
  {
    name: 'add_project_task',
    description: 'Add an open task to a project (by project key or name). Project tasks are the firm-level layer, distinct from personal Objectives.',
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'project key or name' }, text: { type: 'string' }, due_date: { type: 'string' } }, required: ['project', 'text'] },
  },
  {
    name: 'complete_project_task',
    description: 'Mark a project task done by matching its text (exact-then-contains, refuses ambiguity).',
    inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'set_standing_order',
    description: "Record something David wants Lumen to watch for or do on a schedule (e.g. 'every Friday ask me about the pipeline', 'remind me the morning of Oct 5 about the TKF call'). cadence is free text; next_at is the first time it should fire (ISO timestamp, Chicago time if unspecified).",
    inputSchema: { type: 'object', properties: { text: { type: 'string' }, cadence: { type: 'string' }, next_at: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'create_project',
    description: "Create a project on the Projects layer (long-standing work with its own task list). Give it a key like 'Platform.Lumen' so the session board and Lumen can address it. category: client | third-horizon | personal | commercial-infra | q2-must | biz-dev | learning.",
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, key: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' } }, required: ['name'] },
  },
  {
    name: 'list_standing_orders',
    description: 'The active standing orders Lumen is holding for David.',
    inputSchema: { type: 'object', properties: {} },
  },
]

export async function callTool(name, args = {}) {
  const TODAY = chiToday()
  switch (name) {
    case 'get_context': {
      const [doc, rows, reports] = await Promise.all([
        identityDoc('operating-context.md'),
        sb(`daily_performance?select=scorecard,summary,must_do&day=eq.${TODAY}&order=generated_at.desc&limit=1`),
        sb(`daily_performance?select=day,scorecard&model=eq.Daily%20Report&order=generated_at.desc&limit=30`),
      ])
      const sc = rows[0]?.scorecard || null
      const seen = new Set()
      let totalMiles = 0
      for (const r of reports) {
        if (r.scorecard?.miles != null && !seen.has(r.day)) { totalMiles += r.scorecard.miles; seen.add(r.day) }
      }
      const live = {
        today: TODAY,
        miles_today: sc?.miles ?? null,
        signal_today: sc?.signal?.score ?? null,
        badges_today: sc?.badges ?? [],
        follow_ups: sc?.follow_ups ?? [],
        must_do: rows[0]?.must_do ?? [],
        total_miles_downriver: Math.round(totalMiles * 10) / 10,
        days_collected: seen.size,
      }
      return `${doc}\n\n## Live game state (as of the last update)\n${JSON.stringify(live, null, 2)}`
    }
    case 'get_today': {
      const [rows, cal] = await Promise.all([
        sb(`daily_performance?select=generated_at,summary,scorecard,noteworthy,must_do,new_items,notes,source_counts&day=eq.${TODAY}&order=generated_at.desc&limit=1`),
        sb(`calendar_events?select=subject,start_at,end_at,organizer,attendees&day=eq.${TODAY}&is_cancelled=eq.false&order=start_at.asc`),
      ])
      const r = rows[0]
      if (!r) return JSON.stringify({ today: TODAY, note: 'No update composed yet today. Calendar below.', calendar: cal }, null, 2)
      const remaining = cal.filter(e => new Date(e.end_at).getTime() > Date.now())
      return JSON.stringify({ today: TODAY, as_of: r.generated_at, summary: r.summary, scorecard: r.scorecard, noteworthy: r.noteworthy, must_do: r.must_do, new_items: r.new_items, composer_notes: r.notes, calendar_remaining: remaining }, null, 2)
    }
    case 'get_objectives': {
      const os = await sb(`objectives?select=title,state,due_date,follow_up_date,is_anchor,is_emergency,released_at,released_kind,who,tags&deleted_at=is.null&order=captured_at.desc`)
      const grouped = { active: [], parked: [], waiting: [], follow_up: [], foreman: [], inbox: [], released_today: [] }
      for (const o of os) {
        if (o.state === 'released') {
          if (o.released_at && TODAY === chiDayOf(o.released_at)) grouped.released_today.push(o)
          continue
        }
        if (grouped[o.state]) grouped[o.state].push(o)
      }
      grouped.follow_up.sort((a, b) => String(a.follow_up_date || '9999').localeCompare(String(b.follow_up_date || '9999')))
      return JSON.stringify(grouped, null, 2)
    }
    case 'get_projects': {
      const [projects, tasks] = await Promise.all([
        sb(`projects?select=id,name,key,category,status,description&order=name.asc`),
        sb(`project_tasks?select=project_id,text,status,source,due_date&status=neq.done`),
      ])
      const byId = new Map(projects.filter(p => p.status !== 'archived').map(p => [p.id, { ...p, open_tasks: [] }]))
      for (const t of tasks) byId.get(t.project_id)?.open_tasks.push({ text: t.text, status: t.status, source: t.source, due: t.due_date })
      return JSON.stringify([...byId.values()].filter(p => p.open_tasks.length || p.key), null, 2)
    }
    case 'search_meetings': {
      const q = esc(args.query || '')
      const limit = Math.min(args.limit || 5, 20)
      const ms = await sb(`granola_meetings?select=title,meeting_date,attendees,summary&or=(title.ilike.*${encodeURIComponent(q)}*,summary.ilike.*${encodeURIComponent(q)}*)&order=meeting_date.desc&limit=${limit}`)
      return JSON.stringify(ms.map(m => ({ ...m, summary: (m.summary || '').slice(0, 3000) })), null, 2)
    }
    case 'search_emails': {
      const q = esc(args.query || '')
      const days = Math.min(args.days || 14, 60)
      const since = new Date(Date.now() - days * 86400e3).toISOString()
      const es = await sb(`emails?select=folder,subject,from_name,to_names,received_at,preview,is_read&received_at=gte.${since}&or=(subject.ilike.*${encodeURIComponent(q)}*,from_name.ilike.*${encodeURIComponent(q)}*,preview.ilike.*${encodeURIComponent(q)}*)&order=received_at.desc&limit=25`)
      return JSON.stringify(es, null, 2)
    }
    case 'get_day': {
      const date = String(args.date || '').slice(0, 10)
      const rows = await sb(`daily_performance?select=day,summary,scorecard,accomplishments,learned,interactions,team_allocation,must_do,new_items,notes,model,generated_at&day=eq.${date}&order=generated_at.desc&limit=5`)
      if (!rows.length) return JSON.stringify({ date, note: 'No record for this day.' })
      const report = rows.find(r => r.model === 'Daily Report') || rows[0]
      const scored = rows.find(r => r.scorecard)
      return JSON.stringify({ ...report, scorecard: scored?.scorecard || report.scorecard }, null, 2)
    }
    case 'get_volume': {
      const map = { 'operating-manual': 'operating-manual.txt', 'psyche-map': 'psyche-map-and-manual.txt', 'somatic': 'somatic-manual.txt' }
      const file = map[args.volume]
      if (!file) throw new Error('unknown volume')
      return identityDoc(file)
    }

    // ---- writes
    case 'add_objective': {
      const title = String(args.title || '').trim()
      if (!title) throw new Error('title required')
      const state = OBJ_STATES.includes(args.state) && args.state !== 'released' && args.state !== 'foreman' ? args.state : 'inbox'
      const dupes = await sb(`objectives?select=title,state&deleted_at=is.null&title=ilike.${encodeURIComponent(esc(title))}&limit=3`)
      if (dupes.length) return JSON.stringify({ ok: false, note: 'already on the board', existing: dupes })
      const row = {
        user_id: DAVID, title, state, captured_at: new Date().toISOString(),
        due_date: args.due_date || null,
        follow_up_date: state === 'follow_up' ? (args.follow_up_date || plusDays(7)) : (args.follow_up_date || null),
        description: args.description || null,
        tags: Array.isArray(args.tags) ? args.tags : [],
        activated_at: state === 'active' ? new Date().toISOString() : null,
      }
      const out = await sbWrite('POST', 'objectives', row)
      return JSON.stringify({ ok: true, objective: { title, state, due_date: row.due_date, follow_up_date: row.follow_up_date, id: out?.[0]?.id } })
    }
    case 'move_objective': {
      const o = await findObjective(args.title)
      const state = args.state
      if (!OBJ_STATES.includes(state)) throw new Error('bad state')
      if (o.state === state) return JSON.stringify({ ok: true, note: `already ${state}`, title: o.title })
      const patch = { state }
      if (state === 'released' || state === 'foreman') { patch.released_kind = state === 'foreman' ? 'foreman' : 'done'; patch.released_at = new Date().toISOString() }
      else { patch.released_kind = null; patch.released_at = null }
      patch.activated_at = state === 'active' ? new Date().toISOString() : null
      if (state === 'follow_up') patch.follow_up_date = args.follow_up_date || o.follow_up_date || plusDays(7)
      if (args.due_date) patch.due_date = args.due_date
      await sbWrite('PATCH', `objectives?id=eq.${o.id}`, patch, 'return=minimal')
      if (state === 'released') {
        await sbWrite('PATCH', `project_tasks?objective_id=eq.${o.id}&status=neq.done`, { status: 'done', done: true, released_at: new Date().toISOString() }, 'return=minimal').catch(() => {})
      }
      return JSON.stringify({ ok: true, title: o.title, from: o.state, to: state, follow_up_date: patch.follow_up_date || null })
    }
    case 'add_project_task': {
      const q = esc(args.project || '')
      const ps = await sb(`projects?select=id,key,name&or=(key.ilike.${encodeURIComponent(q)},name.ilike.*${encodeURIComponent(q)}*)&limit=5`)
      if (ps.length !== 1) throw new Error(ps.length ? `project ambiguous: ${ps.map(p => p.name).join(' | ')}` : `no project matches "${args.project}"`)
      const out = await sbWrite('POST', 'project_tasks', { project_id: ps[0].id, text: String(args.text || '').trim(), status: 'open', source: 'lumen', due_date: args.due_date || null })
      return JSON.stringify({ ok: true, project: ps[0].name, task: out?.[0]?.text || args.text })
    }
    case 'complete_project_task': {
      const q = esc(args.text || '')
      const ts = await sb(`project_tasks?select=id,text,status&status=neq.done&text=ilike.*${encodeURIComponent(q)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `task ambiguous: ${ts.map(t => t.text).join(' | ')}` : `no open task matches "${args.text}"`)
      await sbWrite('PATCH', `project_tasks?id=eq.${ts[0].id}`, { status: 'done', done: true, released_at: new Date().toISOString() }, 'return=minimal')
      return JSON.stringify({ ok: true, completed: ts[0].text })
    }
    case 'set_standing_order': {
      const out = await sbWrite('POST', 'standing_orders', { text: String(args.text || '').trim(), cadence: args.cadence || null, next_at: args.next_at || null })
      return JSON.stringify({ ok: true, order: out?.[0] })
    }
    case 'create_project': {
      const name = String(args.name || '').trim()
      if (!name) throw new Error('name required')
      const dupes = await sb(`projects?select=id,name,key,user_id&or=(name.ilike.${encodeURIComponent(esc(name))},key.eq.${encodeURIComponent(args.key || '__none__')})&limit=3`)
      if (dupes.length) {
        // The HUD lists only David's rows; claim any ownerless project (and its tasks) rather than duplicating.
        let claimed = 0
        for (const d of dupes.filter(d => !d.user_id)) {
          await sbWrite('PATCH', `projects?id=eq.${d.id}`, { user_id: DAVID }, 'return=minimal')
          claimed += 1  // tasks carry no owner; they are visible through their project
        }
        return JSON.stringify({ ok: false, note: claimed ? `project exists; claimed ${claimed} ownerless rows for David` : 'project exists', existing: dupes.map(({ user_id, ...d }) => d) })
      }
      const out = await sbWrite('POST', 'projects', { user_id: DAVID, name, key: args.key || null, category: args.category || 'third-horizon', status: 'active', description: args.description || null, last_activity_at: new Date().toISOString() })
      return JSON.stringify({ ok: true, project: out?.[0] })
    }
    case 'list_standing_orders': {
      return JSON.stringify(await sb('standing_orders?select=id,text,cadence,next_at,last_fired_at&active=eq.true&order=next_at.asc.nullslast'), null, 2)
    }
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}
