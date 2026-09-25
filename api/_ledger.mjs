// The Ledger toolbox: every read and write the Friend can perform, shared by
// the MCP server (api/mcp.mjs) and Lumen's brain (api/_lumen-brain.mjs).
// Reads are the v1 set; writes are the "hands" (David's 9/14 top-of-list ask).
// Writes touch only David's own tables and always go through PostgREST with
// the service key; nothing here can reach the pipes or the identity bucket.

import { graphToken, MAILBOX } from './_sync-core.mjs'
import { waSendDocument, davidNumber } from './_wa.mjs'
import { extractText, clip } from './_docs.mjs'
import { logHours } from './time.mjs'
import { sendMail } from './_mail.mjs'

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

// ---- live mailbox helpers (Microsoft Graph, app-only, David's mailbox)
let FOLDER_CACHE = null
async function graphFolders(token) {
  if (FOLDER_CACHE) return FOLDER_CACHE
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/mailFolders?$select=id,displayName&$top=100`, { headers: { Authorization: `Bearer ${token}` } })
  const map = {}
  if (res.ok) for (const f of (await res.json()).value || []) map[f.id] = f.displayName
  FOLDER_CACHE = map
  return map
}
async function mailAttachments(token, encodedId) {
  const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${encodedId}/attachments?$select=id,name,contentType,size,isInline`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error(`attachments -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return ((await res.json()).value || []).filter(a => (a['@odata.type'] || '').includes('fileAttachment') && !a.isInline)
}


// ---- file store (private bucket 'files'), walked recursively
async function listFiles(prefix) {
  const out = []
  const walk = async (pre) => {
    const res = await fetch(`${URL_BASE}/storage/v1/object/list/files`, { method: 'POST', headers: { ...sbHeaders(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: pre, limit: 1000, sortBy: { column: 'name', order: 'asc' } }) })
    if (!res.ok) throw new Error(`files list -> ${res.status}`)
    for (const e of await res.json()) {
      if (e.name === '.emptyFolderPlaceholder') continue
      const p = pre ? `${pre}/${e.name}` : e.name
      if (e.id) out.push({ path: p, size: e.metadata?.size || null, type: e.metadata?.mimetype || null, updated: e.updated_at || null })
      else await walk(p)
    }
  }
  await walk(prefix || '')
  return out
}

// ---- meetings: find a calendar event by words, and write its session row
const STOPW = new Set(['the', 'and', 'with', 'for', 'call', 'meeting', 'sync', 'weekly', 'monthly', 'david', 'smith', 'third', 'horizon'])
const wordsOf = (x) => new Set(String(x || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOPW.has(w)))
function titleMatch(a, b) {
  const A = String(a || '').trim().toLowerCase(), B = String(b || '').trim().toLowerCase()
  if (A && A === B) return true
  const wa = wordsOf(a), wb = wordsOf(b)
  if (!wa.size) return false
  const shared = [...wa].filter(w => wb.has(w)).length
  return shared >= Math.min(2, wa.size)
}
async function findEvent(day, subject) {
  const evs = await sb(`calendar_events?select=id,subject,start_at,end_at,is_all_day&day=eq.${day}&is_cancelled=eq.false&order=start_at.asc`)
  const q = String(subject || '').toLowerCase().trim()
  return evs.find(e => String(e.subject || '').toLowerCase() === q)
    || evs.find(e => String(e.subject || '').toLowerCase().includes(q))
    || evs.find(e => titleMatch(subject, e.subject))
    || null
}
async function putSession(cur, patch) {
  const row = { ...patch, updated_at: new Date().toISOString() }
  if (cur) return sbWrite('PATCH', `meeting_sessions?event_id=eq.${encodeURIComponent(cur.event_id)}`, row, 'return=minimal')
  return sbWrite('POST', 'meeting_sessions', row)
}

export const TOOLS = [
  // ---- reads
  {
    name: 'get_context',
    description: "David's distilled operating context (who he is, how his architecture runs, how to work with him) plus the live state of today's game: miles, grade, badges, signal, must-dos. Call this at the start of any conversation that touches David's work, day, decisions, or wellbeing.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_today',
    description: "Today's live snapshot from the Ledger: the latest composed summary, deterministic scorecard, noteworthy threads, must-do list, follow-ups coming due, new items, and the rest of today's WORK calendar (Outlook/Microsoft 365). For any day after today use get_calendar. Never a device-local calendar.",
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_calendar',
    description: "David's WORK calendar (Outlook/Microsoft 365) for a date range, up to four weeks ahead. Use this for anything beyond today: 'what does Monday look like', 'am I free Thursday afternoon', 'what's next week'. Dates YYYY-MM-DD; defaults to today through 14 days out. Never a device-local calendar.",
    inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD, default today' }, to: { type: 'string', description: 'YYYY-MM-DD inclusive, default from+14' } } },
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
    name: 'search_mailbox',
    description: "Search David's whole live mailbox (Inbox, Sent, every folder, any age) by words in subject, sender, or body. Use this when the piped email (search_emails) does not reach far enough, when he asks whether he replied to someone (Sent folder), or to find a message that carries an attachment. Returns message ids for read_email and send_attachment.",
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'words to search, e.g. a subject, a name, a topic' }, limit: { type: 'integer', description: 'max results, default 10' } }, required: ['query'] },
  },
  {
    name: 'read_email',
    description: 'Read one message in full from the live mailbox: body text and the list of attachments (id, name, type, size). message_id comes from search_mailbox.',
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' } }, required: ['message_id'] },
  },
  {
    name: 'send_attachment',
    description: "Pull an attachment off an email and post it into David's WhatsApp chat as a document he can open. message_id from search_mailbox or read_email; filename picks one attachment by (partial) name, otherwise the only or first file attachment is sent. Say what you sent in one line after.",
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' }, filename: { type: 'string' }, caption: { type: 'string', description: 'short caption shown under the file' } }, required: ['message_id'] },
  },
  {
    name: 'search_files',
    description: "Find documents in David's file store (Supabase bucket 'files': panel packets, decks, contracts, anything he has dropped in) by words in the path or file name. Returns paths for send_file. Empty query lists everything.",
    inputSchema: { type: 'object', properties: { query: { type: 'string' }, limit: { type: 'integer', description: 'default 25' } }, required: [] },
  },
  {
    name: 'send_file',
    description: "Post a document from David's file store into his WhatsApp chat so he can open it. path from search_files (exact). Say what you sent in one line after.",
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, caption: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'read_file',
    description: "Read the contents of a document in David's file store as text (PDF, Word, Excel, PowerPoint, text). Use it to answer questions about what a document says: interview questions, scorecards, packets, decks. path from search_files.",
    inputSchema: { type: 'object', properties: { path: { type: 'string' }, max_chars: { type: 'integer', description: 'default 24000' } }, required: ['path'] },
  },
  {
    name: 'read_attachment',
    description: 'Read an email attachment as text (PDF, Word, Excel, PowerPoint). message_id from search_mailbox; filename picks one attachment by (partial) name, otherwise the only or first file attachment.',
    inputSchema: { type: 'object', properties: { message_id: { type: 'string' }, filename: { type: 'string' }, max_chars: { type: 'integer' } }, required: ['message_id'] },
  },
  {
    name: 'log_day',
    description: "Log something David did or is about to do today, for the River's badges. kind: 'discomfort' (he tells you he is about to do something consciously uncomfortable; three a day strike Discomforter), 'hygiene' (what: 'brush', 'shower', or 'whiten'; teeth three times plus shower plus whitening strike Hygiene), 'exercise' (value: minutes; 60 in a day strikes Exercise), 'sleep' (value: hours; 6 strikes Sleep), 'note' (a thought he wants kept in the day's record), 'activity' (something he did that no pipe sees: a call, a document, a decision), 'medication' (what: the medication taken), 'diet' (what he ate or a diet note). Log silently and confirm in a few words; never lecture.",
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['discomfort', 'hygiene', 'exercise', 'sleep', 'note', 'activity', 'medication', 'diet'] }, what: { type: 'string', description: 'short label of the thing' }, value: { type: 'number', description: 'minutes for exercise, hours for sleep' }, note: { type: 'string' }, day: { type: 'string', description: 'YYYY-MM-DD, default today (Chicago)' } }, required: ['kind'] },
  },
  {
    name: 'get_river',
    description: "The River: miles banked toward Calm Water (10,535), today's badges and miles, and what is still open to earn today (discomforts logged so far, hygiene items, exercise minutes, sleep).",
    inputSchema: { type: 'object', properties: { day: { type: 'string' } }, required: [] },
  },
  {
    name: 'add_maintenance',
    description: "Add a maintenance item (the small recurring upkeep of a life: content, hygiene, exercise, other). Five done in a day strike a Maintenance Bundle.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, category: { type: 'string', enum: ['content', 'hygiene', 'exercise', 'other'] }, cadence: { type: 'string' } }, required: ['title', 'category'] },
  },
  {
    name: 'complete_maintenance',
    description: 'Mark an open maintenance item done today by matching its title (exact-then-contains).',
    inputSchema: { type: 'object', properties: { title: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'run_update',
    description: "Run the HUD's Update on David's word: reads every pipe, composes the day's narrative, strikes the River. Takes one to two minutes; call it and wait. Returns miles today, badges struck, and what was released. Use when he says 'run the update', 'update the board', 'refresh the day'.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'close_day',
    description: "Close the day on David's word: the final sweep, the Daily Report, the River struck with Clean Close eligible. Only when he clearly asks to close the day. Takes a minute or two. Returns miles, badges, and the day's total.",
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'meeting_attended',
    description: "Stamp a calendar meeting as attended (the green check on the Agenda). subject matches the calendar item by words; day defaults to today. Use when he says he was in a meeting, joined a call, or asks to mark one attended.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, day: { type: 'string' } }, required: ['subject'] },
  },
  {
    name: 'meeting_timer',
    description: "Start or stop the timer on a calendar meeting. Stop logs the span to Harvest as a completed entry. Use when he says 'start the clock on X', 'I'm in the NN2 call now', 'stop the timer', 'call's over'.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, action: { type: 'string', enum: ['start', 'stop'] }, day: { type: 'string' } }, required: ['subject', 'action'] },
  },
  {
    name: 'close_meeting',
    description: "Close out a calendar meeting: stops a running timer, attaches the Granola notes, records follow-ups (each becomes a Side Mission in Follow Up, due a week out) and special notes. Use when he gives you follow-ups or notes from a meeting, or asks to close one out.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, follow_ups: { type: 'array', items: { type: 'string' } }, special_notes: { type: 'string' }, day: { type: 'string' } }, required: ['subject'] },
  },
  {
    name: 'set_due',
    description: "Change when a Side Mission is due or should be followed up: due_date and/or follow_up_date (YYYY-MM-DD). Matches the objective by title (exact-then-contains). Use when notes or David move a deadline.",
    inputSchema: { type: 'object', properties: { title: { type: 'string' }, due_date: { type: 'string' }, follow_up_date: { type: 'string' } }, required: ['title'] },
  },
  {
    name: 'send_email',
    description: "Send an email from Lumen's own address (lumen@thirdhorizon.com). Recipients are limited to David's addresses for now. Use when he asks you to email him something: a draft, a summary, a document's text, a list too long for WhatsApp.",
    inputSchema: { type: 'object', properties: { to: { type: 'string', description: 'default david.smith@thirdhorizon.com' }, subject: { type: 'string' }, body: { type: 'string' } }, required: ['subject', 'body'] },
  },
  {
    name: 'update_meeting',
    description: "Change a calendar meeting on David's word: shorten or move it (new start and/or end, Chicago local time like '10:00' or '10:30'), or cancel it (David must be the organizer; otherwise decline). Use after he decides: 'keep it but cut to 30 minutes', 'push it to 2', 'cancel CSOG'. Confirm in one line with the new time.",
    inputSchema: { type: 'object', properties: { subject: { type: 'string' }, day: { type: 'string' }, start_time: { type: 'string', description: 'HH:MM Chicago' }, end_time: { type: 'string', description: 'HH:MM Chicago' }, cancel: { type: 'boolean' }, comment: { type: 'string' } }, required: ['subject'] },
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
    name: 'activate_project_task',
    description: "Play a project task onto David's Objectives board: creates the linked objective (the same bridge the Projects page uses, so releasing the objective closes the task) and, by default, makes it active with the board clock running. state 'parked' queues it instead. To de-activate, use move_objective on the objective (parked keeps the link; released closes the task).",
    inputSchema: { type: 'object', properties: { project: { type: 'string', description: 'project key or name' }, text: { type: 'string', description: 'task text, exact-then-contains' }, state: { type: 'string', enum: ['active', 'parked'] } }, required: ['project', 'text'] },
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
    case 'get_calendar': {
      const from = String(args.from || TODAY).slice(0, 10)
      const d = new Date(from + 'T12:00:00'); d.setDate(d.getDate() + 14)
      const to = String(args.to || d.toISOString().slice(0, 10)).slice(0, 10)
      const rows = await sb(`calendar_events?select=day,subject,start_at,end_at,organizer,attendees,is_all_day&day=gte.${from}&day=lte.${to}&is_cancelled=eq.false&order=start_at.asc&limit=300`)
      const byDay = {}
      for (const e of rows) (byDay[e.day] ||= []).push({ subject: e.subject, start: e.start_at, end: e.end_at, all_day: e.is_all_day, organizer: e.organizer, attendees: (e.attendees || []).slice(0, 8) })
      return JSON.stringify({ from, to, timezone_note: 'times are UTC; Chicago is UTC-5 in September', days: byDay }, null, 2)
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
    case 'search_mailbox': {
      const token = await graphToken()
      const q = String(args.query || '').replace(/"/g, '').trim()
      const limit = Math.min(Number(args.limit) || 10, 25)
      const qs = `$search="${encodeURIComponent(q)}"&$select=id,subject,from,toRecipients,receivedDateTime,sentDateTime,hasAttachments,bodyPreview,parentFolderId&$top=${limit}`
      const res = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error(`mailbox search -> ${res.status}: ${(await res.text()).slice(0, 200)}`)
      const folders = await graphFolders(token)
      const out = ((await res.json()).value || []).map(m => ({
        message_id: m.id, folder: folders[m.parentFolderId] || 'other', subject: m.subject || '(no subject)',
        from: (m.from || {}).emailAddress ? `${m.from.emailAddress.name || ''} <${m.from.emailAddress.address}>` : null,
        to: (m.toRecipients || []).map(r => (r.emailAddress || {}).name || (r.emailAddress || {}).address).filter(Boolean),
        at: m.receivedDateTime || m.sentDateTime, has_attachments: !!m.hasAttachments, preview: (m.bodyPreview || '').slice(0, 300),
      }))
      return JSON.stringify(out, null, 2)
    }
    case 'read_email': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const h = { Authorization: `Bearer ${token}`, Prefer: 'outlook.body-content-type="text"' }
      const m = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,hasAttachments`, { headers: h })
      if (!m.ok) throw new Error(`read_email -> ${m.status}: ${(await m.text()).slice(0, 200)}`)
      const msg = await m.json()
      const atts = await mailAttachments(token, id)
      return JSON.stringify({
        message_id: msg.id, subject: msg.subject, from: (msg.from || {}).emailAddress || null,
        to: (msg.toRecipients || []).map(r => r.emailAddress), cc: (msg.ccRecipients || []).map(r => r.emailAddress),
        at: msg.receivedDateTime || msg.sentDateTime, body: String((msg.body || {}).content || '').slice(0, 12000),
        attachments: atts.map(a => ({ id: a.id, name: a.name, type: a.contentType, size: a.size })),
      }, null, 2)
    }
    case 'send_attachment': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const atts = await mailAttachments(token, id)
      if (!atts.length) return JSON.stringify({ ok: false, error: 'that message has no file attachments' })
      const want = String(args.filename || '').toLowerCase()
      const pick = want ? atts.find(a => a.name.toLowerCase() === want) || atts.find(a => a.name.toLowerCase().includes(want)) : (atts.length === 1 ? atts[0] : null)
      if (!pick) return JSON.stringify({ ok: false, error: 'which one?', attachments: atts.map(a => a.name) })
      if (pick.size > 95 * 1024 * 1024) return JSON.stringify({ ok: false, error: `${pick.name} is too large for WhatsApp (${Math.round(pick.size / 1048576)} MB)` })
      const bin = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}/attachments/${encodeURIComponent(pick.id)}/$value`, { headers: { Authorization: `Bearer ${token}` } })
      if (!bin.ok) throw new Error(`attachment download -> ${bin.status}: ${(await bin.text()).slice(0, 200)}`)
      const bytes = new Uint8Array(await bin.arrayBuffer())
      const sent = await waSendDocument(davidNumber(), bytes, { filename: pick.name, mime: pick.contentType || 'application/octet-stream', caption: args.caption || '' })
      return JSON.stringify({ ok: true, sent: pick.name, size: pick.size, wa_message_id: sent || null })
    }
    case 'search_files': {
      const q = String(args.query || '').toLowerCase().split(/\s+/).filter(Boolean)
      const all = await listFiles('')
      const hits = all.filter(f => q.every(w => f.path.toLowerCase().includes(w))).slice(0, Math.min(Number(args.limit) || 25, 100))
      return JSON.stringify(hits, null, 2)
    }
    case 'send_file': {
      const path = String(args.path || '').replace(/^\/+/, '')
      const res = await fetch(`${URL_BASE}/storage/v1/object/files/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: sbHeaders() })
      if (!res.ok) return JSON.stringify({ ok: false, error: `no such file: ${path}` })
      const mime = res.headers.get('content-type') || 'application/octet-stream'
      const bytes = new Uint8Array(await res.arrayBuffer())
      if (bytes.length > 95 * 1024 * 1024) return JSON.stringify({ ok: false, error: 'too large for WhatsApp' })
      const filename = path.split('/').pop()
      const id = await waSendDocument(davidNumber(), bytes, { filename, mime, caption: args.caption || '' })
      return JSON.stringify({ ok: true, sent: filename, size: bytes.length, wa_message_id: id || null })
    }
    case 'read_file': {
      const path = String(args.path || '').replace(/^\/+/, '')
      const res = await fetch(`${URL_BASE}/storage/v1/object/files/${path.split('/').map(encodeURIComponent).join('/')}`, { headers: sbHeaders() })
      if (!res.ok) return JSON.stringify({ ok: false, error: `no such file: ${path}` })
      const mime = res.headers.get('content-type') || ''
      const doc = await extractText(new Uint8Array(await res.arrayBuffer()), path.split('/').pop(), mime)
      return JSON.stringify({ ok: true, path, kind: doc.kind, pages: doc.pages, sheets: doc.sheets, slides: doc.slides, note: doc.note, text: clip(doc.text, Number(args.max_chars) || 24000) })
    }
    case 'read_attachment': {
      const token = await graphToken()
      const id = encodeURIComponent(String(args.message_id || ''))
      const atts = await mailAttachments(token, id)
      if (!atts.length) return JSON.stringify({ ok: false, error: 'that message has no file attachments' })
      const want = String(args.filename || '').toLowerCase()
      const pick = want ? atts.find(a => a.name.toLowerCase() === want) || atts.find(a => a.name.toLowerCase().includes(want)) : (atts.length === 1 ? atts[0] : null)
      if (!pick) return JSON.stringify({ ok: false, error: 'which one?', attachments: atts.map(a => a.name) })
      const bin = await fetch(`https://graph.microsoft.com/v1.0/users/${MAILBOX}/messages/${id}/attachments/${encodeURIComponent(pick.id)}/$value`, { headers: { Authorization: `Bearer ${token}` } })
      if (!bin.ok) throw new Error(`attachment download -> ${bin.status}`)
      const doc = await extractText(new Uint8Array(await bin.arrayBuffer()), pick.name, pick.contentType || '')
      return JSON.stringify({ ok: true, name: pick.name, kind: doc.kind, pages: doc.pages, note: doc.note, text: clip(doc.text, Number(args.max_chars) || 24000) })
    }
    case 'log_day': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const row = { day, kind: args.kind, what: args.what ? String(args.what).slice(0, 200) : null, value: args.value != null ? Number(args.value) : null, note: args.note ? String(args.note).slice(0, 2000) : null, source: 'lumen' }
      const out = await sbWrite('POST', 'daily_logs', row)
      const counts = await sb(`daily_logs?select=kind&day=eq.${day}`)
      const n = counts.filter(c => c.kind === args.kind).length
      return JSON.stringify({ ok: true, logged: out?.[0] || row, count_today_for_kind: n })
    }
    case 'get_river': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const [all, today, logs] = await Promise.all([
        sb(`miles_ledger?select=miles`), sb(`miles_ledger?select=badge,miles,evidence&day=eq.${day}&order=id.asc`), sb(`daily_logs?select=kind,what,value,at&day=eq.${day}&order=at.asc`),
      ])
      const total = Math.round(all.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100
      const byKind = (k) => logs.filter(l => l.kind === k)
      return JSON.stringify({
        day, miles_total: total, miles_remaining: Math.round((10535 - total) * 100) / 100, miles_today: Math.round(today.reduce((s, r) => s + Number(r.miles || 0), 0) * 100) / 100,
        badges_today: today, open_today: {
          discomforts_logged: byKind('discomfort').length, discomforts_needed: 3,
          hygiene_logged: byKind('hygiene').map(l => l.what), hygiene_needed: ['brush x3', 'shower', 'whiten'],
          exercise_minutes: byKind('exercise').reduce((s, l) => s + (Number(l.value) || 0), 0), exercise_needed: 60,
          sleep_hours: Math.max(0, ...byKind('sleep').map(l => Number(l.value) || 0)), sleep_needed: 6,
        },
      }, null, 2)
    }
    case 'add_maintenance': {
      const out = await sbWrite('POST', 'maintenance_items', { title: String(args.title || '').trim(), category: args.category || 'other', cadence: args.cadence || null, status: 'open' })
      return JSON.stringify({ ok: true, item: out?.[0] })
    }
    case 'complete_maintenance': {
      const q = esc(args.title || '')
      let ts = await sb(`maintenance_items?select=id,title&status=eq.open&title=ilike.${encodeURIComponent(q)}&limit=5`)
      if (ts.length !== 1) ts = await sb(`maintenance_items?select=id,title&status=eq.open&title=ilike.*${encodeURIComponent(q)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `ambiguous: ${ts.map(t => t.title).join(' | ')}` : `no open maintenance item matches "${args.title}"`)
      await sbWrite('PATCH', `maintenance_items?id=eq.${ts[0].id}`, { status: 'done', day: chiToday(), done_at: new Date().toISOString() }, 'return=minimal')
      return JSON.stringify({ ok: true, completed: ts[0].title })
    }
    case 'run_update':
    case 'close_day': {
      const base = process.env.HUD_BASE || 'https://sa-hud.vercel.app'
      const path = name === 'close_day' ? '/api/close' : '/api/refresh'
      const r = await fetch(`${base}${path}`, { method: 'POST', headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` } })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) return JSON.stringify({ ok: false, error: j.error || `HTTP ${r.status}` })
      return JSON.stringify({ ok: true, day: j.day, miles_today: j.miles, badges: j.badges || [], badge_evidence: j.badge_evidence || {}, river_total: j.river_total ?? j.total, released_today: j.released_today || [], closed: name === 'close_day' }, null, 2)
    }
    case 'meeting_attended':
    case 'meeting_timer':
    case 'close_meeting': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const ev = await findEvent(day, args.subject)
      if (!ev) return JSON.stringify({ ok: false, error: `no calendar meeting on ${day} matches "${args.subject}"` })
      const cur = (await sb(`meeting_sessions?select=*&event_id=eq.${encodeURIComponent(ev.id)}&limit=1`))[0] || null
      const now = new Date().toISOString()
      const base = { event_id: ev.id, day, subject: ev.subject, attended_at: cur?.attended_at || now }
      if (name === 'meeting_attended') {
        await putSession(cur, base)
        return JSON.stringify({ ok: true, attended: ev.subject, day })
      }
      if (name === 'meeting_timer') {
        if (args.action === 'start') {
          if (cur?.started_at && !cur?.stopped_at) return JSON.stringify({ ok: true, already_running: true, since: cur.started_at, subject: ev.subject })
          await putSession(cur, { ...base, started_at: now, stopped_at: null, hours: null, harvest_logged: false })
          return JSON.stringify({ ok: true, started: ev.subject, at: now })
        }
        if (!cur?.started_at || cur?.stopped_at) return JSON.stringify({ ok: false, error: `no timer running on "${ev.subject}"` })
        const hours = Math.round(((Date.now() - new Date(cur.started_at).getTime()) / 3600e3) * 100) / 100
        let harvest = null, logged = false
        try { harvest = await logHours(ev.subject, hours); logged = !!harvest?.ok && !harvest?.note } catch (e) { harvest = { error: String(e.message || e) } }
        await putSession(cur, { ...base, stopped_at: now, hours, harvest_logged: logged })
        return JSON.stringify({ ok: true, stopped: ev.subject, hours, harvest })
      }
      // close_meeting
      let hours = cur?.hours ?? null, harvest = null
      if (cur?.started_at && !cur?.stopped_at) {
        hours = Math.round(((Date.now() - new Date(cur.started_at).getTime()) / 3600e3) * 100) / 100
        try { harvest = await logHours(ev.subject, hours) } catch (e) { harvest = { error: String(e.message || e) } }
      }
      const notes = (await sb(`granola_meetings?select=id,title,summary&meeting_date=eq.${day}`)).find(m => titleMatch(ev.subject, m.title)) || null
      const lines = (args.follow_ups || []).map(x => String(x || '').trim()).filter(Boolean)
      const patch = { ...base, closed_at: now, follow_ups: [...((cur?.follow_ups) || []), ...lines], special_notes: [cur?.special_notes, args.special_notes].filter(Boolean).join('\n\n') || null, notes_meeting_id: notes?.id || cur?.notes_meeting_id || null, notes_summary: notes?.summary || cur?.notes_summary || null }
      if (hours != null) { patch.hours = hours; if (cur?.started_at && !cur?.stopped_at) { patch.stopped_at = now; patch.harvest_logged = !!harvest?.ok && !harvest?.note } }
      await putSession(cur, patch)
      const due = new Date(new Date(`${day}T12:00:00`).getTime() + 7 * 86400e3).toISOString().slice(0, 10)
      const created = []
      for (const text of lines) {
        const o = await sbWrite('POST', 'objectives', { user_id: DAVID, title: text.slice(0, 160), state: 'follow_up', kind: 'execution', effort: 1, importance: 2, needs_sizing: false, follow_up_date: due, description: `Follow-up from ${ev.subject} on ${day}`, captured_at: now })
        created.push(o?.[0]?.title || text)
      }
      return JSON.stringify({ ok: true, closed: ev.subject, day, hours, notes_attached: !!notes, follow_ups_on_board: created, follow_up_date: due })
    }
    case 'set_due': {
      const o = await findObjective(args.title)
      const patch = {}
      if (args.due_date) patch.due_date = String(args.due_date).slice(0, 10)
      if (args.follow_up_date) patch.follow_up_date = String(args.follow_up_date).slice(0, 10)
      if (!Object.keys(patch).length) return JSON.stringify({ ok: false, error: 'nothing to change' })
      await sbWrite('PATCH', `objectives?id=eq.${o.id}`, patch, 'return=minimal')
      return JSON.stringify({ ok: true, title: o.title, ...patch })
    }
    case 'send_email': {
      const out = await sendMail({ to: args.to || 'david.smith@thirdhorizon.com', subject: String(args.subject || '').slice(0, 200), text: String(args.body || '') })
      return JSON.stringify({ ok: true, ...out, to: args.to || 'david.smith@thirdhorizon.com' })
    }
    case 'update_meeting': {
      const day = String(args.day || chiToday()).slice(0, 10)
      const ev = await findEvent(day, args.subject)
      if (!ev) return JSON.stringify({ ok: false, error: `no calendar meeting on ${day} matches "${args.subject}"` })
      const token = await graphToken()
      const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      const base = `https://graph.microsoft.com/v1.0/users/${MAILBOX}/events/${encodeURIComponent(ev.id)}`
      if (args.cancel) {
        const me = await fetch(`${base}?$select=isOrganizer`, { headers: H }).then(r => r.json()).catch(() => ({}))
        const r = me.isOrganizer
          ? await fetch(`${base}/cancel`, { method: 'POST', headers: H, body: JSON.stringify({ comment: args.comment || 'Cancelled by David.' }) })
          : await fetch(`${base}/decline`, { method: 'POST', headers: H, body: JSON.stringify({ comment: args.comment || 'David cannot make this one.', sendResponse: true }) })
        if (!r.ok && r.status !== 202) throw new Error(`calendar ${me.isOrganizer ? 'cancel' : 'decline'} -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
        await sbWrite('PATCH', `calendar_events?id=eq.${encodeURIComponent(ev.id)}`, { is_cancelled: true }, 'return=minimal').catch(() => null)
        return JSON.stringify({ ok: true, subject: ev.subject, day, [me.isOrganizer ? 'cancelled' : 'declined']: true })
      }
      const patch = {}
      const local = (hhmm) => `${day}T${String(hhmm).trim().padStart(5, '0')}:00`
      if (args.start_time) patch.start = { dateTime: local(args.start_time), timeZone: 'America/Chicago' }
      if (args.end_time) patch.end = { dateTime: local(args.end_time), timeZone: 'America/Chicago' }
      if (!Object.keys(patch).length) return JSON.stringify({ ok: false, error: 'nothing to change: give start_time, end_time, or cancel' })
      const r = await fetch(base, { method: 'PATCH', headers: H, body: JSON.stringify(patch) })
      if (!r.ok) throw new Error(`calendar update -> ${r.status}: ${(await r.text()).slice(0, 200)}`)
      const j = await r.json()
      const toIso = (dt) => dt?.dateTime ? new Date(dt.dateTime + (dt.timeZone === 'UTC' ? 'Z' : '')).toISOString() : null
      await sbWrite('PATCH', `calendar_events?id=eq.${encodeURIComponent(ev.id)}`, { ...(j.start ? { start_at: toIso(j.start) } : {}), ...(j.end ? { end_at: toIso(j.end) } : {}) }, 'return=minimal').catch(() => null)
      return JSON.stringify({ ok: true, subject: ev.subject, day, start: j.start?.dateTime, end: j.end?.dateTime, timeZone: j.start?.timeZone })
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
    case 'activate_project_task': {
      const pq = esc(args.project || '')
      const ps = await sb(`projects?select=id,key,name&or=(key.ilike.${encodeURIComponent(pq)},name.ilike.*${encodeURIComponent(pq)}*)&limit=5`)
      if (ps.length !== 1) throw new Error(ps.length ? `project ambiguous: ${ps.map(p => p.name).join(' | ')}` : `no project matches "${args.project}"`)
      const tq = esc(args.text || '')
      let ts = await sb(`project_tasks?select=id,text,status,objective_id&project_id=eq.${ps[0].id}&status=neq.done&text=ilike.${encodeURIComponent(tq)}&limit=5`)
      if (ts.length !== 1) ts = await sb(`project_tasks?select=id,text,status,objective_id&project_id=eq.${ps[0].id}&status=neq.done&text=ilike.*${encodeURIComponent(tq)}*&limit=5`)
      if (ts.length !== 1) throw new Error(ts.length ? `task ambiguous: ${ts.map(t => t.text).join(' | ')}` : `no open task matches "${args.text}"`)
      const task = ts[0]
      const state = args.state === 'parked' ? 'parked' : 'active'
      const now = new Date().toISOString()
      if (task.objective_id) {
        await sbWrite('PATCH', `objectives?id=eq.${task.objective_id}`, { state, activated_at: state === 'active' ? now : null, released_at: null, released_kind: null }, 'return=minimal')
        return JSON.stringify({ ok: true, task: task.text, objective: 'existing', state })
      }
      const obj = await sbWrite('POST', 'objectives', {
        user_id: DAVID, title: task.text.slice(0, 120), state, kind: 'execution', effort: 2, importance: 2, needs_sizing: false,
        description: `Promoted from project: ${ps[0].name}`, captured_at: now, activated_at: state === 'active' ? now : null,
      })
      await sbWrite('PATCH', `project_tasks?id=eq.${task.id}`, { objective_id: obj[0].id, status: task.status === 'blocked' ? 'blocked' : 'promoted' }, 'return=minimal')
      return JSON.stringify({ ok: true, task: task.text, objective: obj[0].title, state })
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
