// The Ledger MCP server — "one friend." Speaks MCP (JSON-RPC 2.0 over
// Streamable HTTP) with zero dependencies. Any Claude surface connected to
// this endpoint can read David's day, board, projects, meetings, mail, the
// Day Library, and the tiered identity context.
// Auth: MCP_TOKEN via ?key= (connector URLs) or Authorization: Bearer.
// v1 is READ-ONLY by design; write tools come after the read side is trusted.

export const config = { maxDuration: 60 }

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'

function sbHeaders() {
  const key = process.env.SUPABASE_SERVICE_KEY
  return { apikey: key, Authorization: `Bearer ${key}` }
}
async function sb(path) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`${path.split('?')[0]} -> ${res.status}`)
  return res.json()
}
async function identityDoc(name) {
  const res = await fetch(`${URL_BASE}/storage/v1/object/identity/${name}`, { headers: sbHeaders() })
  if (!res.ok) throw new Error(`identity/${name} -> ${res.status}`)
  return res.text()
}
const chiToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const esc = (s) => String(s).replace(/[%_]/g, '')

// ---------------------------------------------------------------- tools
const TOOLS = [
  {
    name: 'get_context',
    description: "David's distilled operating context (who he is, how his architecture runs, how to work with him) plus the live state of today's game: miles, grade, badges, signal, must-dos. Call this at the start of any conversation that touches David's work, day, decisions, or wellbeing.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_today',
    description: "Today's live snapshot from the Ledger: the latest composed summary, deterministic scorecard, noteworthy threads, must-do list, new items, and the rest of today's calendar.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_objectives',
    description: "David's personal task board (Objectives), grouped by state: active (being worked), parked (queue), waiting (blocked on others), foreman (delegated), inbox (awaiting his triage), plus anything released today. His dispositions are law.",
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
]

async function callTool(name, args) {
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
      const os = await sb(`objectives?select=title,state,due_date,is_anchor,is_emergency,released_at,released_kind,who,tags&deleted_at=is.null&order=captured_at.desc`)
      const grouped = { active: [], parked: [], waiting: [], foreman: [], inbox: [], released_today: [] }
      for (const o of os) {
        if (o.state === 'released') {
          if (o.released_at && chiToday() === new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(o.released_at))) grouped.released_today.push(o)
          continue
        }
        if (grouped[o.state]) grouped[o.state].push(o)
      }
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
    default:
      throw new Error(`unknown tool: ${name}`)
  }
}

// ------------------------------------------------- JSON-RPC / MCP plumbing
function rpcResult(id, result) { return { jsonrpc: '2.0', id, result } }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } } }

async function handleRpc(msg) {
  const { id, method, params } = msg || {}
  if (id === undefined || id === null) return null // notification: acknowledge silently
  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: params?.protocolVersion || '2025-03-26',
        capabilities: { tools: {} },
        serverInfo: { name: 'sa-ledger', version: '1.0.0' },
      })
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS })
    case 'tools/call': {
      try {
        const text = await callTool(params?.name, params?.arguments || {})
        return rpcResult(id, { content: [{ type: 'text', text }], isError: false })
      } catch (e) {
        return rpcResult(id, { content: [{ type: 'text', text: `Tool error: ${String(e.message || e)}` }], isError: true })
      }
    }
    case 'resources/list':
      return rpcResult(id, { resources: [] })
    case 'prompts/list':
      return rpcResult(id, { prompts: [] })
    default:
      return rpcError(id, -32601, `method not found: ${method}`)
  }
}

export default async function handler(req, res) {
  const token = process.env.MCP_TOKEN
  const supplied = (req.query && req.query.key) || (req.headers.authorization || '').replace(/^Bearer /, '')
  if (!token || supplied !== token) return res.status(401).json({ error: 'unauthorized' })

  if (req.method === 'GET') return res.status(405).json({ error: 'SSE stream not offered; POST JSON-RPC' })
  if (req.method === 'DELETE') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { return res.status(400).json(rpcError(null, -32700, 'parse error')) } }

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handleRpc))).filter(Boolean)
    if (!out.length) return res.status(202).end()
    return res.status(200).json(out)
  }
  const out = await handleRpc(body)
  if (!out) return res.status(202).end()
  return res.status(200).json(out)
}
