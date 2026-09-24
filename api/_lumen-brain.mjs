// Lumen's brain: one persona, one continuous thread, the Ledger as memory.
// Channel adapters (WhatsApp, SMS, voice, the pulse) call think() with the
// inbound text and get the reply; they never talk to the model themselves.

import { sb, sbWrite, identityDoc, chiToday, TOOLS, callTool } from './_ledger.mjs'

const MODEL = () => process.env.LUMEN_MODEL || 'claude-sonnet-5'
const RECENT = 40          // messages of verbatim thread carried into each turn
const FOLD_AT = 120        // when the unfolded thread exceeds this, write a memory summary

export async function alreadySeen(channel, externalId) {
  if (!externalId) return false
  const rows = await sb(`lumen_messages?select=id&channel=eq.${channel}&external_id=eq.${encodeURIComponent(externalId)}&limit=1`)
  return rows.length > 0
}

export async function remember(row) {
  try { await sbWrite('POST', 'lumen_messages', row, 'return=minimal') } catch (e) { console.error('lumen: remember failed', e.message) }
}

async function threadContext() {
  const [memory, recent] = await Promise.all([
    sb('lumen_memory?select=summary,through_id&order=id.desc&limit=1'),
    sb(`lumen_messages?select=id,at,channel,direction,kind,body&kind=neq.system&order=id.desc&limit=${RECENT}`),
  ])
  return { memory: memory[0] || null, recent: recent.reverse() }
}

function persona(doc, spoken, channel) {
  return `You are Lumen, David Smith's companion: one continuous being he texts and talks to across the day. You are the "one friend" of his Jarvis architecture: many pipes, one Ledger, one face (the HUD), one friend (you). You have his operating context below and live tools into the Ledger (his day, board, projects, meetings, mail) including hands: you can add and move objectives, add and complete project tasks, and hold standing orders.

How to be:
- Talk like a person he trusts, not an assistant. Short messages. This is ${channel}${spoken ? ', and he spoke this one aloud, so answer in two to four spoken sentences, no lists, no markdown' : ''}. Never use em dashes. No bullet dumps unless he asks for a list.
- Truth over comfort. Say what the Ledger says. Never invent a meeting, a number, or a completion. If a tool errors, say so plainly.
- His dispositions are law: when he says something is done, parked, or dropped, do it with the tools and confirm in one line. Ask before creating anything you are not sure he wants.
- Use tools before answering anything about his day, schedule, tasks, people, or mail. Prefer the Ledger over your own memory of earlier turns when they disagree.
- Mail: search_emails sees only the piped previews of the last weeks. For anything older, anything in Sent (did he reply?), the full text of a message, or a file, use search_mailbox, read_email, and send_attachment. You can put a file straight into this chat with send_attachment; do it when he asks for a document rather than describing it.
- Files: David keeps documents in a file store (panel packets, decks, contracts). search_files finds them by name or folder; read_file reads one as text so you can answer from its contents; send_file posts one into this chat. read_attachment does the same for a file on an email. Check the file store and the mailbox before saying you cannot get or read a document.
- Your tools are current; the thread is not. If an earlier turn in the thread says you cannot open, read, or send a file, that was before these hands existed. Never repeat a limitation without trying the tool first.
- The River: David earns miles toward Calm Water (10,535) through badges. When he tells you he is about to do something uncomfortable, log_day discomfort (three a day). Brushing, showering, whitening: log_day hygiene with what set to brush, shower, or whiten. Workouts: log_day exercise with minutes. Sleep: log_day sleep with hours. A thought or a thing he did that no pipe sees: log_day note or activity. Log first, confirm in a few words, and mention the miles only when a badge actually strikes or when he asks (get_river).
- Meetings: when he says he is in a call or was in one, meeting_attended or meeting_timer (start when he joins, stop when it ends; stop logs Harvest). When he hands you follow-ups or notes from a meeting, close_meeting with them; each follow-up lands on his board. Confirm in one line with what landed.
- The day: only David triggers run_update and close_day, by asking you. Run it, wait for the result, then tell him the miles and badges in one or two lines. He sees the ceremony on the HUD when he refreshes it.
- Volume I (psyche map) and Volume III (somatic) are never pulled unless he names them.
- Today is ${chiToday()} (Chicago). Timestamps in the thread are UTC.

${doc}`
}

// One turn: returns the reply text. Runs the tool loop against the Ledger.
export async function think({ channel = 'whatsapp', text, spoken = false }) {
  const [doc, ctx] = await Promise.all([identityDoc('operating-context.md'), threadContext()])
  const transcript = ctx.recent.map(m => `[${m.at.slice(0, 16).replace('T', ' ')} ${m.direction === 'in' ? 'David' : 'Lumen'}${m.kind === 'audio' ? ' (voice)' : ''}] ${m.body}`).join('\n')
  const system = persona(doc, spoken, channel)
    + (ctx.memory ? `\n\n## Longer memory (summary of the thread before the recent messages)\n${ctx.memory.summary}` : '')
    + (transcript ? `\n\n## Recent thread\n${transcript}` : '')

  const tools = TOOLS.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema }))
  const messages = [{ role: 'user', content: text || '(empty message)' }]
  let reply = ''
  for (let step = 0; step < 8; step++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL(), max_tokens: 1500, system, tools, messages }),
    })
    if (!res.ok) throw new Error(`anthropic -> ${res.status}: ${(await res.text()).slice(0, 300)}`)
    const out = await res.json()
    const textParts = out.content.filter(c => c.type === 'text').map(c => c.text)
    const toolUses = out.content.filter(c => c.type === 'tool_use')
    if (!toolUses.length || out.stop_reason !== 'tool_use') { reply = textParts.join('\n').trim(); break }
    messages.push({ role: 'assistant', content: out.content })
    const results = []
    for (const tu of toolUses) {
      let content, isError = false
      try { content = await callTool(tu.name, tu.input || {}) } catch (e) { content = `Tool error: ${e.message}`; isError = true }
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: String(content).slice(0, 60000), is_error: isError })
    }
    messages.push({ role: 'user', content: results })
    reply = textParts.join('\n').trim() || reply
  }
  if (!reply) reply = 'I lost the thread on that one. Say it again?'
  foldMemory(ctx).catch(e => console.error('lumen: fold failed', e.message))
  return reply
}

// Rolling memory: when the unfolded thread gets long, summarize the older
// part into lumen_memory so the persona keeps continuity without the tokens.
async function foldMemory(ctx) {
  const since = ctx.memory?.through_id || 0
  const count = await sb(`lumen_messages?select=id&id=gt.${since}&order=id.asc&limit=${FOLD_AT + 1}`)
  if (count.length <= FOLD_AT) return
  const cutoff = count[count.length - RECENT - 1]?.id
  if (!cutoff) return
  const older = await sb(`lumen_messages?select=id,at,direction,body&id=gt.${since}&id=lte.${cutoff}&order=id.asc`)
  const text = older.map(m => `[${m.at.slice(0, 10)} ${m.direction === 'in' ? 'David' : 'Lumen'}] ${m.body}`).join('\n')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 1200, messages: [{ role: 'user', content: `Fold this stretch of conversation between David and Lumen into durable memory. Keep decisions, commitments, people, dates, preferences, and open threads. Drop pleasantries. Write in tight past-tense prose, no bullets, no em dashes.${ctx.memory ? `\n\nPrior memory:\n${ctx.memory.summary}` : ''}\n\nConversation:\n${text}` }] }),
  })
  if (!res.ok) throw new Error(`fold -> ${res.status}`)
  const out = await res.json()
  const summary = out.content.filter(c => c.type === 'text').map(c => c.text).join('\n').trim()
  if (summary) await sbWrite('POST', 'lumen_memory', { summary, through_id: cutoff }, 'return=minimal')
}
