// Lumen in the HUD: a turn from the Command Center itself (the Morning
// Protocol's strip first). Same brain, same thread as WhatsApp and the voice
// doors (channel 'hud'), so Lumen remembers it everywhere and can act with
// his tools while David clicks through the HUD.
//   POST application/json {text, where?}   -> { reply }
//   POST audio/* (raw body) ?where=...      -> { transcript, reply }   (David talking to him)
// Auth: David's own Supabase session (Authorization: Bearer <access token>),
// or CRON_SECRET for probes. No audio out; the HUD shows the words.
//
// Hand To Claude Code (David 11/10, on Lumen naming a hand he lacks: "let's do some
// tooling ... powerful powerful way to work"). The button under a Lumen reply posts
//   { action: 'handoff', item, title, message_id, ask, gap } -> { ok, id }
// and the hand-off is kept at project-files/handoffs/<card id>/<id>.json for a Claude
// Code session to pick up (~/.claude/hud-board/handoff.py list | read | take | answer).
// The session's answer is written back into this card's thread as a message from
// Claude Code, so David sees it on the card and Lumen reads it on his next turn.
// Storage serves a cached copy of an object for a while, so every read of a hand-off asks past it (?cb=).
//   { action: 'handoffs', item } -> { ok, handoffs: [{ id, at, status, message_id, answered_at }] }
// Only David's press makes one: nothing here is created by Lumen or by a session.
export const config = { maxDuration: 300, api: { bodyParser: false } }

import { think, remember } from './_lumen-brain.mjs'
import { cardFrame } from './_ledger.mjs'
import { transcribe } from './_wa.mjs'

const URL_BASE = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'
const DAVID = '9d28e8cf-3e35-48d9-a029-1327bd37fdd4'
const svc = () => ({ apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` })
const HO = (itemId, id = '') => `${URL_BASE}/storage/v1/object/project-files/handoffs/${itemId}${id ? `/${id}.json` : ''}`

async function listHandoffs(itemId) {
  const r = await fetch(`${URL_BASE}/storage/v1/object/list/project-files`, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json' }, body: JSON.stringify({ prefix: `handoffs/${itemId}`, limit: 200, sortBy: { column: 'name', order: 'asc' } }) })
  const names = ((r.ok ? await r.json() : []) || []).filter(f => f.id && f.name.endsWith('.json')).map(f => f.name.replace(/\.json$/, ''))
  const docs = await Promise.all(names.map(async (id) => { try { const g = await fetch(`${HO(itemId, id)}?cb=${Date.now()}`, { headers: svc(), cache: 'no-store' }); return g.ok ? await g.json() : null } catch { return null } }))
  return docs.filter(Boolean).map(d => ({ id: d.id, at: d.at, status: d.status, message_id: d.message_id ?? null, answered_at: d.answered_at || null }))
}
async function makeHandoff(body, item) {
  const gap = String(body.gap || '').trim()
  if (!gap) throw new Error('nothing to hand over')
  const id = `ho-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  const doc = { v: 1, id, at: new Date().toISOString(), status: 'open', item: { kind: item.kind, id: item.id, title: String(body.title || '').slice(0, 200) }, message_id: body.message_id ?? null, ask: String(body.ask || '').slice(0, 6000), gap: gap.slice(0, 20000), by: 'David, from the Lumen panel' }
  const w = await fetch(HO(item.id, id), { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(doc) })
  if (!w.ok) throw new Error(`could not keep the hand-off (${w.status})`)
  // One small index of what is waiting, so a session start reads one file (handoff.py keeps it too).
  try {
    const idx = `${URL_BASE}/storage/v1/object/project-files/handoffs/_open.json`
    const g = await fetch(`${idx}?cb=${Date.now()}`, { headers: svc(), cache: 'no-store' })
    const open = g.ok ? await g.json().catch(() => []) : []
    const next = [...(Array.isArray(open) ? open : []).filter(x => x.id !== id), { id, item_id: item.id, title: doc.item.title, at: doc.at }]
    await fetch(idx, { method: 'POST', headers: { ...svc(), 'Content-Type': 'application/json', 'x-upsert': 'true' }, body: JSON.stringify(next) })
  } catch (e) { console.warn('handoff index', e.message) }
  return doc
}

function readRaw(req) { return new Promise((resolve, reject) => { const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject) }) }
export async function authorized(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return false
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) return true
  const who = await fetch(`${URL_BASE}/auth/v1/user`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` } })
  if (!who.ok) return false
  return (await who.json()).id === DAVID
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST' })
  if (!(await authorized(req))) return res.status(401).json({ error: 'unauthorized' })
  const ctype = String(req.headers['content-type'] || '')
  const raw = await readRaw(req)
  let text = '', kind = 'text', where = String((req.query || {}).where || 'HUD').slice(0, 80), item = null
  if (ctype.includes('application/json')) {
    const body = JSON.parse(raw.toString('utf8') || '{}')
    text = String(body.text || '').trim(); where = String(body.where || where).slice(0, 80)
    // The Lumen panel (11/4): the card David is in rides with the turn, and the brain gets its frame.
    const it = body.item && typeof body.item === 'object' ? body.item : null
    if (it && ['objective', 'project'].includes(it.kind) && /^[0-9a-f-]{8,}$/i.test(String(it.id || ''))) item = { kind: it.kind, id: String(it.id) }
    if (body.action === 'handoff' || body.action === 'handoffs') {
      if (!item) return res.status(400).json({ error: 'a card is required' })
      try {
        if (body.action === 'handoffs') return res.status(200).json({ ok: true, handoffs: await listHandoffs(item.id) })
        const doc = await makeHandoff(body, item)
        return res.status(200).json({ ok: true, id: doc.id, at: doc.at })
      } catch (e) { return res.status(500).json({ error: String(e.message || e).slice(0, 200) }) }
    }
  } else {
    if (!raw.length) return res.status(400).json({ error: 'empty audio' })
    kind = 'audio'
    try { text = (await transcribe(new Uint8Array(raw), ctype.split(';')[0] || 'audio/webm')).trim() } catch (e) { return res.status(200).json({ error: `transcription failed: ${String(e.message || e).slice(0, 160)}` }) }
    if (!text) return res.status(200).json({ error: 'nothing heard' })
  }
  if (!text) return res.status(400).json({ error: 'text required' })
  const meta = item ? { where, item: item.id, item_kind: item.kind } : { where }
  await remember({ channel: 'hud', direction: 'in', kind, body: text, meta })
  let frame = null
  if (item) { try { frame = await cardFrame(item) } catch (e) { frame = `(the card could not be read: ${String(e.message || e).slice(0, 120)})` } }
  let reply
  try { reply = await think({ channel: 'hud', spoken: false, text: `[${where}] ${text}`, frame }) }
  catch (e) { reply = `I hit a wall on that one: ${String(e.message || e).slice(0, 160)}` }
  await remember({ channel: 'hud', direction: 'out', kind: 'text', body: reply, meta })
  return res.status(200).json({ reply, transcript: kind === 'audio' ? text : undefined })
}
