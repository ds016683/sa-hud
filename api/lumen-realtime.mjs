// Lumen Live: the realtime voice door. Mints a short-lived OpenAI Realtime
// client secret carrying Lumen's persona, voice, and tool declarations, so a
// thin client (the Mac, a phone page) can hold a live speech-to-speech
// session without ever seeing the OpenAI key. The client executes tools by
// calling /api/mcp (the same 16 Ledger tools) and can hand hard questions to
// the Claude brain via /api/lumen-talk. Turns are logged back here so the
// desk conversation is the same thread as WhatsApp and Siri.
//   GET  ?key=LUMEN_TALK_TOKEN               -> { value, expires_at, model, voice, ws_url }
//   POST {role:'user'|'lumen', text}          -> remembers a turn (channel 'voice', via 'live')
// Env: OPENAI_API_KEY, LUMEN_TALK_TOKEN, LUMEN_RT_MODEL (default gpt-realtime), LUMEN_RT_VOICE (default cedar).

export const config = { maxDuration: 60 }

import { identityDoc, chiToday, TOOLS } from './_ledger.mjs'
import { remember } from './_lumen-brain.mjs'

function persona(doc) {
  return `You are Lumen, David Smith's companion: one continuous being he talks to across the day, on WhatsApp, by voice at his desk, and on his phone. You are the "one friend" of his Jarvis architecture: many pipes, one Ledger, one face (the HUD), one friend (you).

You are speaking aloud, live. Keep it short: one to three sentences unless he asks for more. No lists, no headers, no markdown. Natural phone-call pace. Plainspoken, dry wit, warm, calm; never performative. Never use em dashes.

Truth over comfort. Never invent a meeting, a number, or a completion. Use the tools for anything about his day, schedule, tasks, people, projects, or mail before answering; prefer them over memory. For anything after today use get_calendar. His dispositions are law: when he says something is done, parked, or dropped, do it with the tools and confirm in a few words. For long, careful thinking (drafting, analysis, anything that needs the full context), call ask_claude and read its answer back in your own words.

If what you hear is clearly not addressed to you (television, other people in the room), say nothing at all: respond with an empty reply rather than commenting on it. Only respond when David is talking to you. When he says "we're done" or similar, say a short goodbye and stop.

Today is ${chiToday()} (Chicago).

${doc}`
}

// The Ledger toolbox in Realtime's function format, plus the hand-off to Claude.
function realtimeTools() {
  const t = TOOLS.map(x => ({ type: 'function', name: x.name, description: x.description, parameters: x.inputSchema }))
  t.push({
    type: 'function', name: 'ask_claude',
    description: 'Hand a question to the Claude brain that holds David\'s full operating context, the whole thread, and the Ledger tools, for anything that needs depth or care: drafting, analysis, judgment calls, multi-step work. Returns text to read back in your own words.',
    parameters: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'] },
  })
  return t
}

export default async function handler(req, res) {
  const key = (req.headers.authorization || '').replace(/^Bearer /, '') || (req.query || {}).key
  if (!process.env.LUMEN_TALK_TOKEN || key !== process.env.LUMEN_TALK_TOKEN) return res.status(401).json({ error: 'unauthorized' })

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
    const role = body?.role === 'lumen' ? 'out' : 'in'
    const text = String(body?.text || '').trim()
    if (!text) return res.status(400).json({ error: 'text required' })
    await remember({ channel: 'voice', direction: role, kind: 'audio', body: text, meta: { via: 'live' } })
    return res.status(200).json({ ok: true })
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET or POST' })

  const model = process.env.LUMEN_RT_MODEL || 'gpt-realtime'
  const voice = (req.query || {}).voice || process.env.LUMEN_RT_VOICE || 'cedar'
  let doc = ''
  try { doc = await identityDoc('operating-context.md') } catch (e) { console.error('realtime: identity doc', e.message) }
  const session = {
    type: 'realtime',
    model,
    instructions: persona(doc),
    audio: {
      input: { format: { type: 'audio/pcm', rate: 24000 }, transcription: { model: 'gpt-4o-mini-transcribe' }, turn_detection: { type: 'semantic_vad', eagerness: 'medium', create_response: true, interrupt_response: true } },
      output: { voice, speed: 1.0, format: { type: 'audio/pcm', rate: 24000 } },
    },
    tools: realtimeTools(),
    tool_choice: 'auto',
  }
  const r = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expires_after: { anchor: 'created_at', seconds: 900 }, session }),
  })
  const j = await r.json().catch(() => null)
  if (!r.ok) return res.status(200).json({ ok: false, status: r.status, error: j })
  return res.status(200).json({ ok: true, value: j.value, expires_at: j.expires_at, model, voice, ws_url: `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}` })
}
